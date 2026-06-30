const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { applicationValidation, documentValidation, paymentValidation } = require('../../validations');
const { applicationController, documentController, paymentController } = require('../../controllers');
const upload = require('../../middlewares/upload');

const router = express.Router();

router.post('/start', auth(), applicationController.startApplication);

router.get(
    '/:applicationId',
    auth(),
    validate(applicationValidation.getApplication),
    applicationController.getApplication
);

router.patch(
    '/:applicationId/step-1',
    auth(),
    validate(applicationValidation.saveStepOne),
    applicationController.saveStepOne
);
// Step -2 documents uploading
router.get(
    '/:applicationId/documents',
    auth(),
    validate(documentValidation.getDocuments),
    documentController.getDocuments
);

router.post(
    '/:applicationId/documents/:type',
    auth(),
    validate(documentValidation.uploadDocument),
    upload.single('file'),
    documentController.uploadDocument
);

router.post(
    '/:applicationId/documents/upload/signature',
    auth(),
    validate(documentValidation.uploadSignature),
    documentController.uploadSignature
);


// Step -3 save application 

router.patch(
    '/:applicationId/step-3',
    auth(),
    validate(applicationValidation.saveStepThree),
    applicationController.saveStepThree
);

// Payment Method

router.post(
    '/:applicationId/checkout',
    auth(),
    validate(paymentValidation.createCheckoutSession),
    paymentController.createCheckoutSession
);

module.exports = router;