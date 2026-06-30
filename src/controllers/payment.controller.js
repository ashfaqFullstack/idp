const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');
const stripe = require('../config/stripe');
const config = require('../config/config');
const logger = require('../config/logger');

const createCheckoutSession = catchAsync(async (req, res) => {
    const result = await paymentService.createCheckoutSession(req.params.applicationId, req.user.id);
    res.status(httpStatus.OK).send(result);
});


const handleStripeWebhook = catchAsync(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // req.body must be the RAW buffer here, not parsed JSON — see route setup below
        event = stripe.webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
    } catch (error) {
        logger.error(`Stripe webhook signature verification failed: ${error.message}`);
        return res.status(httpStatus.BAD_REQUEST).send(`Webhook Error: ${error.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            await paymentService.handleCheckoutSessionCompleted(event.data.object);
            break;
        case 'checkout.session.expired':
            await paymentService.handleCheckoutSessionExpired(event.data.object);
            break;
        default:
            logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(httpStatus.OK).send({ received: true });
});


module.exports = { createCheckoutSession, handleStripeWebhook };