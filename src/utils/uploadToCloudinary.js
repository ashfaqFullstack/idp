const cloudinary = require('../config/cloudinary');
const ApiError = require('./ApiError');
const httpStatus = require('http-status').default;

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - file buffer (from multer memoryStorage)
 * @param {string} folder - cloudinary folder, e.g. 'idp-applications/documents'
 * @param {string} [publicIdPrefix] - optional prefix for the generated public_id
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadBufferToCloudinary = (buffer, folder, publicIdPrefix = '') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicIdPrefix ? `${publicIdPrefix}-${Date.now()}` : undefined,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) {
                    return reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload file to cloud storage'));
                }
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Upload a base64 data URL (e.g. canvas signature) to Cloudinary
 * @param {string} base64DataUrl - e.g. "data:image/png;base64,iVBORw0KG..."
 * @param {string} folder
 * @param {string} [publicIdPrefix]
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadBase64ToCloudinary = async (base64DataUrl, folder, publicIdPrefix = '') => {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image/')) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid signature image data');
    }
    try {
        const result = await cloudinary.uploader.upload(base64DataUrl, {
            folder,
            public_id: publicIdPrefix ? `${publicIdPrefix}-${Date.now()}` : undefined,
            resource_type: 'image',
        });
        return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
        const logger = require('../config/logger');
        logger.error(`Cloudinary signature upload failed: ${error.message}`);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to upload signature: ${error.message}`);
    }
};

/**
 * Delete a file from Cloudinary by its public_id
 * @param {string} publicId
 * @returns {Promise<void>}
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        // Non-fatal — log and move on, don't block the main operation
        const logger = require('../config/logger');
        logger.error(`Failed to delete Cloudinary asset ${publicId}: ${error.message}`);
    }
};

module.exports = {
    uploadBufferToCloudinary,
    uploadBase64ToCloudinary,
    deleteFromCloudinary,
};