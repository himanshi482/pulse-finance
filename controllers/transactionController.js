const pool = require('../config/db');
const logActivity = require('../utils/activityLogger');

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT id, description, amount, type, category, DATE_FORMAT(date, "%Y-%m-%d") as date, is_paid, created_at FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC',
      [userId]
    );

    const transactions = rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
      is_paid: Boolean(r.is_paid),
    }));

    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
};


exports.addTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, description, amount, type, category, date } = req.body;

    if (!description || amount === undefined || !type) {
      return res.status(400).json({ error: 'Description, amount, and type are required.' });
    }

    const transactionId = id || Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const finalCategory = (category && category.trim()) ? category.trim() : 'Other';
    const finalDate = date || new Date().toISOString().split('T')[0];

    await pool.query(
      'INSERT INTO transactions (id, user_id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transactionId, userId, description.trim(), numericAmount, type, finalCategory, finalDate]
    );

    // Log Activity in MySQL
    await logActivity(
      userId,
      'ADD_TRANSACTION',
      `Added ${type}: "${description.trim()}" (₹${numericAmount}) under ${finalCategory}`,
      req
    );

    res.status(201).json({
      message: 'Transaction added successfully.',
      transaction: {
        id: transactionId,
        user_id: userId,
        description: description.trim(),
        amount: numericAmount,
        type,
        category: finalCategory,
        date: finalDate,
      },
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Failed to add transaction.' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized.' });
    }

    // Log Activity in MySQL
    await logActivity(userId, 'DELETE_TRANSACTION', `Deleted transaction record (ID: ${id})`, req);

    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
};

exports.clearAllTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query('DELETE FROM transactions WHERE user_id = ?', [userId]);

    // Log Activity in MySQL
    await logActivity(userId, 'CLEAR_ALL_TRANSACTIONS', 'Cleared all transaction history', req);

    res.json({ message: 'All transactions cleared successfully.' });
  } catch (error) {
    console.error('Error clearing transactions:', error);
    res.status(500).json({ error: 'Failed to clear transactions.' });
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [txs] = await pool.query('SELECT description FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (txs.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized.' });
    }

    await pool.query('UPDATE transactions SET is_paid = 1 WHERE id = ? AND user_id = ?', [id, userId]);

    // Log Activity in MySQL
    await logActivity(userId, 'MARK_AS_PAID', `Marked bill as paid: "${txs[0].description}"`, req);

    res.json({ message: 'Transaction marked as paid successfully.', id, is_paid: true });
  } catch (error) {
    console.error('Error marking transaction as paid:', error);
    res.status(500).json({ error: 'Failed to mark transaction as paid.' });
  }
};


