const pool = require('../config/db');

/**
 * Logs a user activity into the activity_logs MySQL table.
 * @param {number} userId - The ID of the user performing the action
 * @param {string} action - Action code (e.g. USER_REGISTER, ADD_TRANSACTION)
 * @param {string|object} details - Human-readable details or JSON metadata
 * @param {object} [req] - Express request object for IP extraction
 */
async function logActivity(userId, action, details = '', req = null) {
  try {
    if (!userId) return;

    let ipAddress = '';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
      if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }
    }

    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);

    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, detailsStr, ipAddress]
    );
  } catch (error) {
    console.error('Activity Logging Error:', error.message);
  }
}

module.exports = logActivity;
