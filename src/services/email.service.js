const { Resend } = require('resend');
const config = require('../config/config');

const resend = new Resend(config.email.resend.apiKey);

const sendResetPasswordEmail = async (email, otp) => {
    const html = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #111;">
      <p>Hello,</p>
      <p>You requested a password reset. Use the one-time code below to reset your password:</p>
      <p style="font-size: 24px; font-weight: bold; margin: 24px 0;">${otp}</p>
      <p>This code expires in ${config.jwt.resetPasswordExpirationMinutes} minutes.</p>
      <p>If you did not request this reset, please ignore this email.</p>
    </div>
  `;

    await resend.emails.send({
        from: config.email.resend.from,
        to: email,
        subject: 'Your password reset code',
        html,
    });
};

module.exports = {
    sendResetPasswordEmail,
};
