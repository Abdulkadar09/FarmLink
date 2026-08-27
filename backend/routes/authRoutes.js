// routes/authRoutes.js
// Maps URL endpoints to their controller functions.

const express = require('express');
const router = express.Router();
const { register, verifyOtp, resendOtp, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);

module.exports = router;
