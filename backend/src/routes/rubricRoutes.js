import express from 'express';
import {
  createRubric,
  getRubrics,
  getRubric,
  updateRubric,
  deleteRubric,
  submitRubricResponse,
  getRubricResponses,
  getRubricAnalytics,
  checkFeedbackAttempt
} from '../controllers/rubricController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, createRubric)
  .get(getRubrics);

router.route('/:id')
  .get(getRubric)
  .put(protect, updateRubric)
  .delete(protect, deleteRubric);

router.post('/:id/submit', optionalProtect, submitRubricResponse);
router.post('/:id/check-attempt', optionalProtect, checkFeedbackAttempt);
router.get('/:id/responses', protect, getRubricResponses);
router.get('/:id/analytics', protect, getRubricAnalytics);

export default router;
