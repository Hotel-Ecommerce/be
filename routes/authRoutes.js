const express = require('express');
const { signupCustomer, login, signout, changePassword } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware')
const router = express.Router();

router.post('/signup', signupCustomer);
router.post('/login', login);
router.post('/signout', signout);
router.post('/changePassword', protect, changePassword);

module.exports = router;