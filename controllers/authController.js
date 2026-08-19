const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logActivity = require('../utils/activityLogger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'pulse_finance_super_secret_jwt_key_2026';

exports.signup = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ error: 'All fields (fullname, email, password) are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into MySQL database
    const [result] = await pool.query(
      'INSERT INTO users (fullname, email, password_hash) VALUES (?, ?, ?)',
      [fullname.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const userId = result.insertId;

    // Log Activity in MySQL
    await logActivity(userId, 'USER_REGISTER', `User account created: ${fullname.trim()} (${email.toLowerCase().trim()})`, req);

    // Generate JWT token
    const token = jwt.sign({ id: userId, email: email.toLowerCase().trim(), fullname: fullname.trim() }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: userId, fullname: fullname.trim(), email: email.toLowerCase().trim(), overall_budget: 0 },
    });
  } catch (error) {
    console.error('Error in signup:', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ECONNREFUSED') {
      return res.status(500).json({ error: `Database Connection Error: ${error.sqlMessage || error.message}. Please check your DB_PASSWORD in .env` });
    }
    res.status(500).json({ error: error.message || 'Internal server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userEmail = (email || username || '').toLowerCase().trim();

    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required.' });
    }

    // Find user by email or fullname
    const [users] = await pool.query(
      'SELECT id, fullname, email, password_hash, overall_budget FROM users WHERE email = ? OR fullname = ?',
      [userEmail, userEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
    }

    // Log Activity in MySQL
    await logActivity(user.id, 'USER_LOGIN', `User logged in successfully: ${user.fullname}`, req);

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, fullname: user.fullname }, JWT_SECRET, {
      expiresIn: '7d',
    });


    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        overall_budget: parseFloat(user.overall_budget || 0),
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ECONNREFUSED') {
      return res.status(500).json({ error: `Database Connection Error: ${error.sqlMessage || error.message}. Please check your DB_PASSWORD in .env` });
    }
    res.status(500).json({ error: error.message || 'Internal server error during login.' });
  }
};


exports.me = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.query('SELECT id, fullname, email, overall_budget, created_at FROM users WHERE id = ?', [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];
    res.json({
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        overall_budget: parseFloat(user.overall_budget || 0),
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, username, newPassword, confirmPassword } = req.body;
    const userIdentifier = (email || username || '').toLowerCase().trim();

    if (!userIdentifier || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Email/Username, New Password, and Confirm Password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    // Find user by email or fullname
    const [users] = await pool.query(
      'SELECT id, fullname, email FROM users WHERE email = ? OR fullname = ?',
      [userIdentifier, userIdentifier]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email or username.' });
    }

    const user = users[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);

    // Log Activity in MySQL
    await logActivity(user.id, 'PASSWORD_RESET', `Password reset successfully for user: ${user.fullname}`, req);

    res.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ECONNREFUSED') {
      return res.status(500).json({ error: `Database Connection Error: ${error.sqlMessage || error.message}. Please check your DB_PASSWORD in .env` });
    }
    res.status(500).json({ error: error.message || 'Internal server error during password reset.' });
  }
};

