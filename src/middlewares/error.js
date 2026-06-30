const { Prisma } = require('@prisma/client');
const httpStatus = require('http-status').default;
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

const errorConverter = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        let statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
        let message = error.message || httpStatus[statusCode];

        // Handle Prisma-specific errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            switch (error.code) {
                case 'P2002':
                    // Unique constraint violation
                    statusCode = httpStatus.BAD_REQUEST;
                    const field = error.meta?.target?.[0] || 'field';
                    message = `${field} already exists`;
                    break;
                case 'P2025':
                    // Record not found
                    statusCode = httpStatus.NOT_FOUND;
                    message = error.meta?.cause || 'Record not found';
                    break;
                case 'P2003':
                    // Foreign key constraint violation
                    statusCode = httpStatus.BAD_REQUEST;
                    message = 'Related record not found';
                    break;
                case 'P2014':
                    // Required relation violation
                    statusCode = httpStatus.BAD_REQUEST;
                    message = 'Invalid relation data provided';
                    break;
                default:
                    statusCode = httpStatus.BAD_REQUEST;
                    message = 'Database request error';
            }
        } else if (error instanceof Prisma.PrismaClientValidationError) {
            // Invalid data types / missing required fields sent to Prisma
            statusCode = httpStatus.BAD_REQUEST;
            message = 'Invalid data provided';
        } else if (error instanceof Prisma.PrismaClientInitializationError) {
            // Could not connect to the database
            statusCode = httpStatus.INTERNAL_SERVER_ERROR;
            message = 'Database connection failed';
        } else if (error instanceof Prisma.PrismaClientRustPanicError) {
            // Prisma engine crashed
            statusCode = httpStatus.INTERNAL_SERVER_ERROR;
            message = 'Database engine error';
        } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            statusCode = httpStatus.INTERNAL_SERVER_ERROR;
            message = 'Unknown database error';
        }

        error = new ApiError(statusCode, message, false, err.stack);
    }

    next(error);
};

const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;

    if (!statusCode) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }

    if (config.env === 'production' && !err.isOperational) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        message = httpStatus[statusCode];
    }

    res.locals.errorMessage = err.message;

    const response = {
        code: statusCode,
        message,
        ...(config.env === 'development' && { stack: err.stack }),
    };

    if (config.env === 'development') {
        logger.error(err.message, { stack: err.stack });
    }

    res.status(statusCode).send(response);
};

module.exports = {
    errorConverter,
    errorHandler,
};