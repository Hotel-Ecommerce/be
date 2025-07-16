import express from 'express';
import { signupCustomer, login, signout, changePassword } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
const router = express.Router();


router.post('/signup', signupCustomer);
router.post('/login', login);
router.post('/signout', signout);
router.post('/changePassword', protect, changePassword);


export default router;