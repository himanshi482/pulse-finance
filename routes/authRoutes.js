const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
