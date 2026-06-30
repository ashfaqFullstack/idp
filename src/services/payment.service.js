const prisma = require('../config/prisma');
const stripe = require('../config/stripe');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status').default;
const applicationService = require('./application.service');

/**
 * Ensure application is ready for payment — all steps complete
 * @param {Application} application
 */
const assertReadyForPayment = (application) => {
    if (application.status !== 'DRAFT') {
        throw new ApiError(httpStatus.BAD_REQUEST, `Application is not awaiting payment (status: ${application.status})`);
    }
    if (application.currentStep < 4) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Please complete all previous steps before payment');
    }
    if (!application.packageType || !application.validityYears || !application.price) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Package selection is incomplete');
    }
};

/**
 * Create a Stripe Checkout Session for an application
 * @param {string} applicationId
 * @param {string} userId
 * @returns {Promise<{ checkoutUrl: string }>}
 */
const createCheckoutSession = async (applicationId, userId) => {
    const application = await applicationService.getApplicationByIdForUser(applicationId, userId);
    assertReadyForPayment(application);

    // If a payment already exists for this application, check its status first
    const existingPayment = await prisma.payment.findUnique({ where: { applicationId } });
    if (existingPayment && existingPayment.status === 'SUCCEEDED') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'This application has already been paid for');
    }

    const productLabel = `IDP Application - ${application.packageType.replace('_', ' ')} (${application.validityYears} Year)`;
    const amountInCents = Math.round(Number(application.price) * 100);

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: { name: productLabel },
                    unit_amount: amountInCents,
                },
                quantity: 1,
            },
        ],
        metadata: {
            applicationId: application.id,
            userId: application.userId,
        },
        success_url: `${config.stripe.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: config.stripe.cancelUrl,
    });

    // Upsert a PENDING payment record tied to this checkout session
    await prisma.payment.upsert({
        where: { applicationId },
        update: {
            stripePaymentIntentId: session.id, // checkout session id used until we get the real PaymentIntent via webhook
            amount: application.price,
            status: 'PENDING',
        },
        create: {
            applicationId,
            stripePaymentIntentId: session.id,
            amount: application.price,
            status: 'PENDING',
        },
    });

    await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'PENDING_PAYMENT' },
    });

    return { checkoutUrl: session.url };
};

/**
 * Handle a successful checkout session — called from the webhook
 * @param {Object} session - Stripe Checkout Session object
 */
const handleCheckoutSessionCompleted = async (session) => {
    const applicationId = session.metadata?.applicationId;

    if (!applicationId) {
        const logger = require('../config/logger');
        logger.error(`Stripe webhook: missing applicationId in metadata for session ${session.id}`);
        return;
    }

    const payment = await prisma.payment.findUnique({ where: { applicationId } });

    if (!payment) {
        const logger = require('../config/logger');
        logger.error(`Stripe webhook: no Payment record found for application ${applicationId}`);
        return;
    }

    // Avoid double-processing if Stripe retries the webhook
    if (payment.status === 'SUCCEEDED') {
        return;
    }

    await prisma.$transaction([
        prisma.payment.update({
            where: { applicationId },
            data: {
                stripePaymentIntentId: session.payment_intent || payment.stripePaymentIntentId,
                status: 'SUCCEEDED',
            },
        }),
        prisma.application.update({
            where: { id: applicationId },
            data: { status: 'PAID' },
        }),
    ]);

    // Email notification hook — wired up later when Resend is integrated
    // await emailService.sendOrderConfirmation(applicationId);
};

/**
 * Handle a failed/expired checkout session
 * @param {Object} session - Stripe Checkout Session object
 */
const handleCheckoutSessionExpired = async (session) => {
    const applicationId = session.metadata?.applicationId;
    if (!applicationId) return;

    const payment = await prisma.payment.findUnique({ where: { applicationId } });
    if (!payment || payment.status === 'SUCCEEDED') return;

    await prisma.$transaction([
        prisma.payment.update({
            where: { applicationId },
            data: { status: 'FAILED' },
        }),
        prisma.application.update({
            where: { id: applicationId },
            data: { status: 'DRAFT' }, // allow user to retry checkout
        }),
    ]);
};

module.exports = {
    createCheckoutSession,
    assertReadyForPayment,
    handleCheckoutSessionCompleted, // ← add
    handleCheckoutSessionExpired,   // ← add
};