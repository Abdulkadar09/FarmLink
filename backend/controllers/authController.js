// controllers/authController.js
// Contains the actual logic for register, verify-otp, and login.
// Routes (in routes/authRoutes.js) just point to these functions.

const bcrypt = require('bcrypt');
const db = require('../db');
const { sendOtpEmail } = require('../utils/mailer');

// Generates a random 6-digit OTP as a string, e.g. "483920"
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------
// POST /api/auth/register
// ---------------------------------------------
async function register(req, res) {
  const connection = await db.getConnection(); // needed for transaction
  try {
    const { full_name, email, password, phone_no, role, profile } = req.body;

    // Basic validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!['Farmer', 'Buyer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be Farmer or Buyer' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT user_id FROM USERS WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash the password before storing (never store plain text passwords)
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.beginTransaction();

    // Insert into USERS
    const [userResult] = await connection.query(
      `INSERT INTO USERS (full_name, email, password, phone_no, role, is_verified)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [full_name, email, hashedPassword, phone_no, role]
    );
    const userId = userResult.insertId;

    // Insert role-specific profile
    if (role === 'Farmer') {
      await connection.query(
        `INSERT INTO FARMER_PROFILE (user_id, farm_location, latitude, longitude, city, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          profile?.farm_location || null,
          profile?.latitude || null,
          profile?.longitude || null,
          profile?.city || null,
          profile?.state || null,
          profile?.pincode || null
        ]
      );
    } else if (role === 'Buyer') {
      await connection.query(
        `INSERT INTO BUYER_PROFILE (user_id, business_type, business_address, latitude, longitude, city, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          profile?.business_type || 'Other',
          profile?.business_address || null,
          profile?.latitude || null,
          profile?.longitude || null,
          profile?.city || null,
          profile?.state || null,
          profile?.pincode || null
        ]
      );
    }

    // Generate OTP and store it (expires in 5 minutes)
    const otpCode = generateOtp();
    await connection.query(
      `INSERT INTO OTP_VERIFICATION (user_id, otp_code, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [userId, otpCode]
    );

    await connection.commit();

    // Send OTP email (outside transaction - email sending shouldn't block DB commit)
    await sendOtpEmail(email, otpCode);

    res.status(201).json({
      success: true,
      message: 'Registered successfully. OTP sent to email.',
      user_id: userId
    });

  } catch (err) {
    await connection.rollback();
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  } finally {
    connection.release();
  }
}

// ---------------------------------------------
// POST /api/auth/verify-otp
// ---------------------------------------------
async function verifyOtp(req, res) {
  try {
    const { user_id, otp_code } = req.body;

    if (!user_id || !otp_code) {
      return res.status(400).json({ success: false, message: 'user_id and otp_code are required' });
    }

    // Find the latest, unused, non-expired OTP for this user
    const [rows] = await db.query(
      `SELECT * FROM OTP_VERIFICATION
       WHERE user_id = ? AND otp_code = ? AND is_used = FALSE AND expires_at > NOW()
       ORDER BY generated_at DESC LIMIT 1`,
      [user_id, otp_code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await db.query('UPDATE OTP_VERIFICATION SET is_used = TRUE WHERE otp_id = ?', [rows[0].otp_id]);

    // Mark user as verified
    await db.query('UPDATE USERS SET is_verified = TRUE WHERE user_id = ?', [user_id]);

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
}

// ---------------------------------------------
// POST /api/auth/resend-otp
// ---------------------------------------------
async function resendOtp(req, res) {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const [users] = await db.query('SELECT email, is_verified FROM USERS WHERE user_id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (users[0].is_verified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    const otpCode = generateOtp();
    await db.query(
      `INSERT INTO OTP_VERIFICATION (user_id, otp_code, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [user_id, otpCode]
    );

    await sendOtpEmail(users[0].email, otpCode);

    res.json({ success: true, message: 'OTP resent successfully' });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error while resending OTP' });
  }
}

// ---------------------------------------------
// POST /api/auth/login
// ---------------------------------------------
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [users] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Contact support.' });
    }
    if (!user.is_verified) {
      return res.status(403).json({ success: false, message: 'Please verify your email first', user_id: user.user_id });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // NOTE: For a full implementation we'd issue a JWT token here.
    // For now, we return basic user info - we'll add JWT auth once
    // you're comfortable with this flow.
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
}

module.exports = { register, verifyOtp, resendOtp, login };