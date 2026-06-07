import express from 'express';
import { loginAdmin, registerUser, getMe, getActivityLogs } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.get('/logs', protect, getActivityLogs);

export default router;
