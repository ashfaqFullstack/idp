const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const documentService = require('../services/document.service');

const uploadDocument = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');
    }

    const document = await documentService.uploadDocument(
        req.params.applicationId,
        req.user.id,
        req.params.type,
        req.file.buffer
    );

    res.status(httpStatus.OK).send({ document });
});

const uploadSignature = catchAsync(async (req, res) => {
    const document = await documentService.uploadSignature(req.params.applicationId, req.user.id, req.body.signatureData);

    res.status(httpStatus.OK).send({ document });
});

const getDocuments = catchAsync(async (req, res) => {
    const documents = await documentService.getDocuments(req.params.applicationId, req.user.id);
    res.status(httpStatus.OK).send({ documents });
});

module.exports = {
    uploadDocument,
    uploadSignature,
    getDocuments,
};