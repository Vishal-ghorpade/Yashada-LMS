import CalendarEvent from '../models/CalendarEvent.js';

// @desc    Get all calendar events for logged in user
// @route   GET /api/calendar
// @access  Private
export const getCalendarEvents = async (req, res, next) => {
  try {
    // Check and tag missed deadlines before returning
    const now = new Date();
    await CalendarEvent.updateMany(
      { 
        user: req.user.id, 
        dueDate: { $lt: now }, 
        status: 'Not Started' 
      },
      { status: 'Missed' }
    );

    const events = await CalendarEvent.find({ user: req.user.id }).sort('dueDate');

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a calendar event status
// @route   PUT /api/calendar/:id
// @access  Private
export const updateCalendarEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Not Started', 'In Progress', 'Completed', 'Missed'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status option');
    }

    const event = await CalendarEvent.findOne({ _id: req.params.id, user: req.user.id });
    if (!event) {
      res.status(404);
      throw new Error('Calendar event not found');
    }

    event.status = status;
    await event.save();

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom learning calendar event
// @route   POST /api/calendar
// @access  Private
export const createCustomEvent = async (req, res, next) => {
  try {
    const { title, type, referenceId, dueDate } = req.body;

    if (!title || !type || !dueDate) {
      res.status(400);
      throw new Error('Please add title, type, and dueDate');
    }

    const event = await CalendarEvent.create({
      user: req.user.id,
      title,
      type,
      referenceId,
      dueDate,
      status: 'Not Started'
    });

    res.status(201).json({
      success: true,
      event
    });
  } catch (error) {
    next(error);
  }
};
