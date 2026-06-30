const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status').default;
const planService = require('./plan.service')

/**
 * Get the user's active draft, or create a new one if none exists
 * @param {string} userId
 * @returns {Promise<Application>}
 */
const startOrResumeApplication = async (userId) => {
    const existingDraft = await prisma.application.findFirst({
        where: { userId, status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
    });

    if (existingDraft) {
        return existingDraft;
    }

    return prisma.application.create({
        data: {
            userId,
            status: 'DRAFT',
            currentStep: 1,
        },
    });
};

/**
 * Get an application by id, scoped to the owning user
 * @param {string} applicationId
 * @param {string} userId
 * @returns {Promise<Application>}
 */
const getApplicationByIdForUser = async (applicationId, userId) => {
    const application = await prisma.application.findFirst({
        where: { id: applicationId, userId },
        include: { documents: true, payment: true },
    });

    if (!application) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Application not found');
    }

    return application;
};

/**
 * Get an application by id for admin (no user scoping)
 * @param {string} applicationId
 * @returns {Promise<Application>}
 */
const getApplicationById = async (applicationId) => {
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { documents: true, payment: true, user: { omit: { password: true } } },
    });

    if (!application) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Application not found');
    }

    return application;
};

/**
 * Ensure the application is still editable (still a draft, not paid/submitted)
 * @param {Application} application
 */
const assertEditable = (application) => {
    if (application.status !== 'DRAFT') {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Application can no longer be edited (current status: ${application.status})`
        );
    }
};

/**
 * Step 1 — Save personal info
 * @param {string} applicationId
 * @param {string} userId
 * @param {Object} data
 * @returns {Promise<Application>}
 */
const saveStepOne = async (applicationId, userId, data) => {
    const application = await getApplicationByIdForUser(applicationId, userId);
    assertEditable(application);

    const updated = await prisma.application.update({
        where: { id: applicationId },
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            countryOfBirth: data.countryOfBirth,
            residenceCountry: data.residenceCountry,
            dob: new Date(data.dob),
            gender: data.gender,
            licenseClasses: data.licenseClasses,
            currentStep: Math.max(application.currentStep, 2),
        },
    });

    return updated;
};

/**
 * Step 2 check — ensure all 4 required documents are uploaded before allowing step 3
 * @param {string} applicationId
 */
const assertDocumentsComplete = async (applicationId) => {
    const requiredTypes = ['PASSPORT_PHOTO', 'LICENSE_FRONT', 'LICENSE_BACK', 'SIGNATURE'];
    const docs = await prisma.document.findMany({
        where: { applicationId, type: { in: requiredTypes } },
        select: { type: true },
    });
    const uploadedTypes = new Set(docs.map((d) => d.type));
    const missing = requiredTypes.filter((t) => !uploadedTypes.has(t));

    if (missing.length > 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Missing required documents: ${missing.join(', ')}`);
    }
};

/**
 * Step 3 — Save package selection + conditional shipping, calculate price
 * @param {string} applicationId
 * @param {string} userId
 * @param {Object} data
 * @returns {Promise<Application>}
 */
const saveStepThree = async (applicationId, userId, data) => {
    const application = await getApplicationByIdForUser(applicationId, userId);
    assertEditable(application);
    await assertDocumentsComplete(applicationId);

    const price = await planService.getPlanPrice(data.packageType, data.validityYears);

    const updateData = {
        packageType: data.packageType,
        validityYears: data.validityYears,
        price,
        currentStep: Math.max(application.currentStep, 4),
    };

    if (data.packageType === 'PRINT_DIGITAL') {
        updateData.shippingLine1 = data.shippingLine1;
        updateData.shippingLine2 = data.shippingLine2 || null;
        updateData.shippingCity = data.shippingCity;
        updateData.shippingState = data.shippingState;
        updateData.shippingPostalCode = data.shippingPostalCode;
        updateData.shippingCountry = data.shippingCountry;
    } else {
        // Clear any stale shipping data if user switches from PRINT_DIGITAL back to DIGITAL_ONLY
        updateData.shippingLine1 = null;
        updateData.shippingLine2 = null;
        updateData.shippingCity = null;
        updateData.shippingState = null;
        updateData.shippingPostalCode = null;
        updateData.shippingCountry = null;
    }

    return prisma.application.update({
        where: { id: applicationId },
        data: updateData,
    });
};

module.exports = {
    startOrResumeApplication,
    getApplicationByIdForUser,
    getApplicationById,
    assertEditable,
    assertDocumentsComplete,
    saveStepOne,
    saveStepThree, // ← add this
};