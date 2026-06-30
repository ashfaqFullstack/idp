const Joi = require('joi');

const createCheckoutSession = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
    }),
};

module.exports = { createCheckoutSession };