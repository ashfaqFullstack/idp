const Joi = require('joi');

const genderValues = ['MALE', 'FEMALE', 'OTHER'];
const licenseClassValues = ['A', 'B', 'C', 'D', 'E'];
const packageTypeValues = ['DIGITAL_ONLY', 'PRINT_DIGITAL'];
const validityYearsValues = ['ONE', 'TWO', 'THREE'];

const startApplication = {
    // No any data — userId gets from req.user
};

const saveStepOne = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
    }),
    body: Joi.object().keys({
        firstName: Joi.string().trim().min(1).max(100).required(),
        lastName: Joi.string().trim().min(1).max(100).required(),
        phone: Joi.string()
            .trim()
            .pattern(/^\+?[0-9]{7,15}$/)
            .required()
            .messages({ 'string.pattern.base': 'Phone must be a valid phone number' }),
        countryOfBirth: Joi.string().trim().min(2).max(100).required(),
        residenceCountry: Joi.string().trim().min(2).max(100).required(),
        dob: Joi.date().iso().max('now').required().messages({
            'date.max': 'Date of birth cannot be in the future',
        }),
        gender: Joi.string()
            .valid(...genderValues)
            .required(),
        licenseClasses: Joi.array()
            .items(Joi.string().valid(...licenseClassValues))
            .min(1)
            .required()
            .messages({ 'array.min': 'Select at least one license class' }),
    }),
};

const getApplication = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
    }),
};


const saveStepThree = {
    params: Joi.object().keys({
        applicationId: Joi.string().uuid().required(),
    }),
    body: Joi.object().keys({
        packageType: Joi.string()
            .valid(...packageTypeValues)
            .required(),
        validityYears: Joi.string()
            .valid(...validityYearsValues)
            .required(),
        // Shipping fields — required only when packageType is PRINT_DIGITAL
        shippingLine1: Joi.string().trim().max(200).when('packageType', {
            is: 'PRINT_DIGITAL',
            then: Joi.required(),
            otherwise: Joi.forbidden(),
        }),
        shippingLine2: Joi.string().trim().max(200).allow('').when('packageType', {
            is: 'PRINT_DIGITAL',
            then: Joi.optional(),
            otherwise: Joi.forbidden(),
        }),
        shippingCity: Joi.string().trim().max(100).when('packageType', {
            is: 'PRINT_DIGITAL',
            then: Joi.required(),
            otherwise: Joi.forbidden(),
        }),
        shippingState: Joi.string().trim().max(100).when('packageType', {
            is: 'PRINT_DIGITAL',
            then: Joi.required(),
            otherwise: Joi.forbidden(),
        }),
        shippingPostalCode: Joi.string().trim().max(20).when('packageType', {
            is: 'PRINT_DIGITAL',
            then: Joi.required(),
            otherwise: Joi.forbidden(),
        }),
        shippingCountry: Joi.string().trim().max(100).when('packageType', {
            is: 'PRINT_DIGITAL',
            then: Joi.required(),
            otherwise: Joi.forbidden(),
        }),
    }),
};

module.exports = {
    startApplication,
    saveStepOne,
    saveStepThree, // ← add this
    getApplication,
};