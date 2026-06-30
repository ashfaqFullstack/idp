const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status').default;

/**
 * Get all active plans
 * @returns {Promise<Plan[]>}
 */
const getActivePlans = async () => {
    return prisma.plan.findMany({
        where: { isActive: true },
        orderBy: [{ packageType: 'asc' }, { validityYears: 'asc' }],
    });
};

/**
 * Look up the price for a given package + validity combo
 * @param {string} packageType
 * @param {string} validityYears
 * @returns {Promise<Decimal>}
 */
const getPlanPrice = async (packageType, validityYears) => {
    const plan = await prisma.plan.findUnique({
        where: {
            packageType_validityYears: { packageType, validityYears },
        },
    });

    if (!plan || !plan.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Selected plan is not available');
    }

    return plan.price;
};

module.exports = {
    getActivePlans,
    getPlanPrice,
};