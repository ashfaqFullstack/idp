const { userService, authService, emailService, tokenService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status').default;

const register = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailandPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);

    res.send({ user, tokens })
})
const logoutUser = catchAsync(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(httpStatus.NO_CONTENT).send();
});

const forgotPassword = catchAsync(async (req, res) => {
    const otp = await tokenService.generateResetPasswordOtp(req.body.email);
    await emailService.sendResetPasswordEmail(req.body.email, otp);
    res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
    const { email, otp, password } = req.body;
    await authService.resetPassword(email, otp, password);
    res.status(httpStatus.NO_CONTENT).send();
});

const refreshToken = catchAsync(async (req, res) => {
    const tokens = await authService.refreshAuth(req.body.refreshToken);
    res.send({ ...tokens });
});

module.exports = {
    register,
    login,
    logoutUser,
    forgotPassword,
    resetPassword,
    refreshToken,
};