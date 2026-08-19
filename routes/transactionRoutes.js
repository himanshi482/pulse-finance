const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.addTransaction);
router.put('/:id/pay', transactionController.markAsPaid);
router.delete('/:id', transactionController.deleteTransaction);
router.delete('/', transactionController.clearAllTransactions);

module.exports = router;

