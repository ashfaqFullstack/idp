const Joi = require('joi');

const documentTypeValues = ['PASSPORT_PHOTO', 'LICENSE_FRONT', 'LICENSE_BACK', 'SIGNATURE'];

const uploadDocument = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
        type: Joi.string()
            .valid(...documentTypeValues.filter((t) => t !== 'SIGNATURE')) // photos only — file upload route
            .required(),
    }),
};

const uploadSignature = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
    }),
    body: Joi.object().keys({
        signatureData: Joi.string()
            .pattern(/^data:image\/(png|jpeg|jpg);base64,/)
            .required()
            .messages({ 'string.pattern.base': 'signatureData must be a valid base64 image data URL' }),
    }),
};

const getDocuments = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
    }),
};

module.exports = {
    uploadDocument,
    uploadSignature,
    getDocuments,
    documentTypeValues,
};