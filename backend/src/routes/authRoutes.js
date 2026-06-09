import express from 'express';
import { 
  loginAdmin, 
  registerUser, 
  getMe, 
  getActivityLogs, 
  getProfileDashboard, 
  updateProfile,
  getUsers
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.get('/logs', protect, getActivityLogs);
router.get('/profile', protect, getProfileDashboard);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getUsers);

export default router;

