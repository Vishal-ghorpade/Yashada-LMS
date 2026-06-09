import express from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuiz,
  getQuizAdmin,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getQuizAttempts,
  getQuizLeaderboard,
  checkQuizAttempt
} from '../controllers/quizController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, createQuiz)
  .get(getQuizzes);

router.route('/:id')
  .get(getQuiz)
  .put(protect, updateQuiz)
  .delete(protect, deleteQuiz);

router.get('/:id/admin', protect, getQuizAdmin);
router.post('/:id/submit', optionalProtect, submitQuizAttempt);
router.post('/:id/check-attempt', optionalProtect, checkQuizAttempt);
router.get('/:id/attempts', protect, getQuizAttempts);
router.get('/:id/leaderboard', getQuizLeaderboard);

export default router;
