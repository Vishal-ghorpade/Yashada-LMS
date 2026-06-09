import express from 'express';
import { 
  getCalendarEvents, 
  updateCalendarEventStatus, 
  createCustomEvent 
} from '../controllers/calendarController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCalendarEvents)
  .post(createCustomEvent);

router.route('/:id')
  .put(updateCalendarEventStatus);

export default router;
