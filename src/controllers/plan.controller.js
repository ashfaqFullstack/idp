const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const planService = require('../services/plan.service');

const getPlans = catchAsync(async (req, res) => {
    const plans = await planService.getActivePlans();
    res.status(httpStatus.OK).send({ plans });
});

module.exports = { getPlans };