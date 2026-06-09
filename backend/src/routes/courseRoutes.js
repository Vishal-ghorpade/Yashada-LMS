import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  updateProgress,
  addNote,
  deleteNote,
  addBookmark,
  deleteBookmark,
  getDiscussions,
  postDiscussion,
  getAnnouncements,
  postAnnouncement,
  rateCourse
} from '../controllers/courseController.js';
import { protect, optionalProtect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getCourses)
  .post(protect, authorize('admin', 'teacher'), createCourse);

router.route('/:id')
  .get(optionalProtect, getCourse)
  .put(protect, authorize('admin', 'teacher'), updateCourse)
  .delete(protect, authorize('admin', 'teacher'), deleteCourse);

router.post('/:id/enroll', protect, enrollCourse);
router.post('/:id/progress', protect, updateProgress);
router.post('/:id/rate', protect, rateCourse);

router.route('/:id/notes')
  .post(protect, addNote);
router.delete('/:id/notes/:noteId', protect, deleteNote);

router.route('/:id/bookmarks')
  .post(protect, addBookmark);
router.delete('/:id/bookmarks/:bookmarkId', protect, deleteBookmark);

router.route('/:id/discussions')
  .get(protect, getDiscussions)
  .post(protect, postDiscussion);

router.route('/:id/announcements')
  .get(protect, getAnnouncements)
  .post(protect, authorize('admin', 'teacher'), postAnnouncement);

export default router;
