import express from 'express';
import { 
  getDepartments, 
  getDepartment, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment, 
  assignUsers,
  getUserProgressForAdmin
} from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getDepartments)
  .post(protect, authorize('admin'), createDepartment);

router.get('/users/:userId/progress', protect, authorize('admin', 'teacher'), getUserProgressForAdmin);

router.route('/:id')
  .get(protect, getDepartment)
  .put(protect, authorize('admin'), updateDepartment)
  .delete(protect, authorize('admin'), deleteDepartment);

router.post('/:id/assign', protect, authorize('admin'), assignUsers);

export default router;
