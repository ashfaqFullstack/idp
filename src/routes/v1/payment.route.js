const express = require('express');
const { paymentController } = require('../../controllers');

const router = express.Router();

// IMPORTANT: raw body parser ONLY for this route — must come before express.json() in app.js,
// or this route must be registered before the global json() middleware applies.
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);

module.exports = router;