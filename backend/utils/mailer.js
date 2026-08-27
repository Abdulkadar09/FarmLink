// utils/mailer.js
// Handles sending emails (used for OTP verification).
// Uses Gmail's SMTP - you'll need a Gmail "App Password" (not your normal password).

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // your gmail address
    pass: process.env.EMAIL_PASS    // gmail App Password (16-char code, not your login password)
  }
});

async function sendOtpEmail(toEmail, otpCode) {
  const mailOptions = {
    from: `"FarmLink" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'FarmLink - Your OTP Code',
    html: `
      <h2>FarmLink Email Verification</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 4px;">${otpCode}</h1>
      <p>This code will expire in 5 minutes.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };