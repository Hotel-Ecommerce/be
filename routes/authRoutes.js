const express = require('express');
const { signupCustomer, login, signout } = require('../controllers/authController');
const router = express.Router();

router.post('/signup', signupCustomer);
router.post('/login', login);
router.post('/signout', signout);

module.exports = router;