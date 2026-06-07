import express from 'express';
import {
  requestUploadUrl,
  uploadLocalFile,
  createVideo,
  getVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  startVideoAttempt,
  trackVideoProgress,
  getVideoProgress,
  submitVideoAttempt,
  shareVideoModule,
  getVideoAnalytics
} from '../controllers/videoController.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('admin', 'teacher'), createVideo)
  .get(getVideos);

router.post('/upload-url', protect, authorize('admin', 'teacher'), requestUploadUrl);
router.put('/upload-local', uploadLocalFile); // Public local fallback upload path

// Attempt & Progress Tracking Paths
router.post('/:id/attempts', optionalProtect, startVideoAttempt);
router.post('/:id/progress', optionalProtect, trackVideoProgress);
router.get('/:id/progress', protect, getVideoProgress);
router.post('/attempts/:attemptId/submit', submitVideoAttempt);

// Share & Analytics Paths
router.post('/:id/share', protect, authorize('admin', 'teacher'), shareVideoModule);
router.get('/:id/analytics', protect, authorize('admin', 'teacher'), getVideoAnalytics);

router.route('/:id')
  .get(getVideo)
  .put(protect, authorize('admin', 'teacher'), updateVideo)
  .delete(protect, authorize('admin', 'teacher'), deleteVideo);

export default router;
