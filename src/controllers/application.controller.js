const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const applicationService = require('../services/application.service');

const startApplication = catchAsync(async (req, res) => {
    const application = await applicationService.startOrResumeApplication(req.user.id);
    res.status(httpStatus.OK).send({ application });
});

const getApplication = catchAsync(async (req, res) => {
    const application = await applicationService.getApplicationByIdForUser(req.params.applicationId, req.user.id);
    res.status(httpStatus.OK).send({ application });
});

const saveStepOne = catchAsync(async (req, res) => {
    const application = await applicationService.saveStepOne(req.params.applicationId, req.user.id, req.body);
    res.status(httpStatus.OK).send({ application });
});

const saveStepThree = catchAsync(async (req, res) => {
    const application = await applicationService.saveStepThree(req.params.applicationId, req.user.id, req.body);
    res.status(httpStatus.OK).send({ application });
});


module.exports = {
    startApplication,
    getApplication,
    saveStepOne,
    saveStepThree
};