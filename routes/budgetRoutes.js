const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', budgetController.getBudgets);
router.put('/overall', budgetController.updateOverallBudget);
router.put('/category', budgetController.updateCategoryBudget);
router.post('/reset', budgetController.resetBudgets);

module.exports = router;
