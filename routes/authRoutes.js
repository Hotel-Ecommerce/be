import express from 'express';
import { signupCustomer, login, signout, changePassword, refreshAccessToken } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
const router = express.Router();


router.post('/signup', signupCustomer);
router.post('/login', login);
router.post('/signout', signout);
router.post('/changePassword', protect, changePassword);
router.post('/refreshToken', refreshAccessToken); // Route mới để làm mới token

export default router;