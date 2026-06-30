const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { uploadBufferToCloudinary, deleteFromCloudinary, uploadBase64ToCloudinary } = require('../utils/uploadToCloudinary');
const httpStatus = require('http-status').default;
const applicationService = require('./application.service');

const CLOUDINARY_FOLDER = 'idp-applications/documents';

/**
 * Upload or replace a document (photo) for an application
 * @param {string} applicationId
 * @param {string} userId
 * @param {string} type - PASSPORT_PHOTO | LICENSE_FRONT | LICENSE_BACK
 * @param {Buffer} fileBuffer
 * @returns {Promise<Document>}
 */
const uploadDocument = async (applicationId, userId, type, fileBuffer) => {
    const application = await applicationService.getApplicationByIdForUser(applicationId, userId);
    applicationService.assertEditable(application);

    // If a document of this type already exists, delete the old cloud asset first
    const existing = await prisma.document.findUnique({
        where: { applicationId_type: { applicationId, type } },
    });

    const { url, publicId } = await uploadBufferToCloudinary(fileBuffer, CLOUDINARY_FOLDER, `${applicationId}-${type}`);

    const document = await prisma.document.upsert({
        where: { applicationId_type: { applicationId, type } },
        update: { url, publicId },
        create: { applicationId, type, url, publicId },
    });

    if (existing && existing.publicId !== publicId) {
        await deleteFromCloudinary(existing.publicId);
    }

    await maybeAdvanceToStepThree(applicationId);

    return document;
};

/**
 * Upload or replace the signature (base64) for an application
 * @param {string} applicationId
 * @param {string} userId
 * @param {string} base64DataUrl
 * @returns {Promise<Document>}
 */
const uploadSignature = async (applicationId, userId, base64DataUrl) => {
    const application = await applicationService.getApplicationByIdForUser(applicationId, userId);
    applicationService.assertEditable(application);

    const existing = await prisma.document.findUnique({
        where: { applicationId_type: { applicationId, type: 'SIGNATURE' } },
    });

    const { url, publicId } = await uploadBase64ToCloudinary(base64DataUrl, CLOUDINARY_FOLDER, `${applicationId}-SIGNATURE`);

    const document = await prisma.document.upsert({
        where: { applicationId_type: { applicationId, type: 'SIGNATURE' } },
        update: { url, publicId },
        create: { applicationId, type: 'SIGNATURE', url, publicId },
    });

    if (existing && existing.publicId !== publicId) {
        await deleteFromCloudinary(existing.publicId);
    }

    await maybeAdvanceToStepThree(applicationId);

    return document;
};

/**
 * Get all documents for an application
 * @param {string} applicationId
 * @param {string} userId
 * @returns {Promise<Document[]>}
 */
const getDocuments = async (applicationId, userId) => {
    await applicationService.getApplicationByIdForUser(applicationId, userId); // ownership check
    return prisma.document.findMany({ where: { applicationId } });
};

/**
 * Once all 4 required documents are uploaded, advance currentStep to 3
 * @param {string} applicationId
 */
const maybeAdvanceToStepThree = async (applicationId) => {
    const requiredTypes = ['PASSPORT_PHOTO', 'LICENSE_FRONT', 'LICENSE_BACK', 'SIGNATURE'];
    const docs = await prisma.document.findMany({
        where: { applicationId, type: { in: requiredTypes } },
        select: { type: true },
    });

    const uploadedTypes = new Set(docs.map((d) => d.type));
    const allUploaded = requiredTypes.every((t) => uploadedTypes.has(t));

    if (allUploaded) {
        const application = await prisma.application.findUnique({ where: { id: applicationId } });
        if (application.currentStep < 3) {
            await prisma.application.update({
                where: { id: applicationId },
                data: { currentStep: 3 },
            });
        }
    }
};

module.exports = {
    uploadDocument,
    uploadSignature,
    getDocuments,
};