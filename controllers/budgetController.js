const pool = require('../config/db');
const logActivity = require('../utils/activityLogger');

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const monthKey = req.query.month || getCurrentMonthKey();

    // Fetch overall budget from users table
    const [users] = await pool.query('SELECT overall_budget FROM users WHERE id = ?', [userId]);
    const overallBudget = users.length > 0 ? parseFloat(users[0].overall_budget || 0) : 0;

    // Fetch category budgets for the specified month
    const [categoryRows] = await pool.query(
      'SELECT category, amount FROM category_budgets WHERE user_id = ? AND month_key = ?',
      [userId, monthKey]
    );

    const budgets = {};
    categoryRows.forEach((r) => {
      budgets[r.category] = parseFloat(r.amount);
    });

    res.json({
      overall_budget: overallBudget,
      budgets,
      month_key: monthKey,
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budget information.' });
  }
};

exports.updateOverallBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { budget } = req.body;

    const numericBudget = Math.max(0, parseFloat(budget) || 0);

    await pool.query('UPDATE users SET overall_budget = ? WHERE id = ?', [numericBudget, userId]);

    // Log Activity in MySQL
    await logActivity(userId, 'UPDATE_OVERALL_BUDGET', `Set monthly budget to ₹${numericBudget}`, req);

    res.json({
      message: 'Overall budget updated successfully.',
      overall_budget: numericBudget,
    });
  } catch (error) {
    console.error('Error updating overall budget:', error);
    res.status(500).json({ error: 'Failed to update overall budget.' });
  }
};

exports.updateCategoryBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, amount, month } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const monthKey = month || getCurrentMonthKey();
    const numericAmount = Math.max(0, parseFloat(amount) || 0);

    await pool.query(
      `INSERT INTO category_budgets (user_id, category, amount, month_key) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [userId, category.trim(), numericAmount, monthKey]
    );

    // Log Activity in MySQL
    await logActivity(userId, 'UPDATE_CATEGORY_BUDGET', `Set category budget for ${category.trim()} to ₹${numericAmount}`, req);

    res.json({
      message: 'Category budget updated.',
      category: category.trim(),
      amount: numericAmount,
      month_key: monthKey,
    });
  } catch (error) {
    console.error('Error updating category budget:', error);
    res.status(500).json({ error: 'Failed to update category budget.' });
  }
};

exports.resetBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const monthKey = getCurrentMonthKey();

    await pool.query('UPDATE users SET overall_budget = 0 WHERE id = ?', [userId]);
    await pool.query('DELETE FROM category_budgets WHERE user_id = ? AND month_key = ?', [userId, monthKey]);

    // Log Activity in MySQL
    await logActivity(userId, 'RESET_BUDGETS', 'Reset all monthly budgets to zero', req);

    res.json({ message: 'Budgets reset successfully.' });
  } catch (error) {
    console.error('Error resetting budgets:', error);
    res.status(500).json({ error: 'Failed to reset budgets.' });
  }
};

