import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Discussion from '../models/Discussion.js';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Quiz from '../models/Quiz.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req, res, next) => {
  try {
    const courses = await Course.find().populate('createdBy', 'name email').sort('-createdAt');
    res.status(200).json({ success: true, courses });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course details
// @route   GET /api/courses/:id
// @access  Public (Optional Protect)
export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('finalAssessment', 'title category timer');

    if (!course) {
      res.status(404);
      throw new Error('Course not found');
    }

    let enrollment = null;
    if (req.user) {
      enrollment = await Enrollment.findOne({ user: req.user.id, course: course._id })
        .populate('notes.videoId', 'title')
        .populate('bookmarks.videoId', 'title');
    }

    res.status(200).json({
      success: true,
      course,
      enrollment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a course
// @route   POST /api/courses
// @access  Private (Teacher/Admin)
export const createCourse = async (req, res, next) => {
  try {
    const { title, description, category, thumbnailUrl, modules, finalAssessment } = req.body;

    if (!title || !category) {
      res.status(400);
      throw new Error('Please provide title and category');
    }

    const course = await Course.create({
      title,
      description,
      category,
      thumbnailUrl,
      modules: modules || [],
      finalAssessment: finalAssessment || undefined,
      createdBy: req.user.id
    });

    await logActivity(req.user.id, `Created course: "${title}"`, req.ip);
    res.status(201).json({ success: true, course });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Teacher/Admin)
export const updateCourse = async (req, res, next) => {
  try {
    const { title, description, category, thumbnailUrl, modules, finalAssessment } = req.body;
    let course = await Course.findById(req.params.id);

    if (!course) {
      res.status(404);
      throw new Error('Course not found');
    }

    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    course.thumbnailUrl = thumbnailUrl || course.thumbnailUrl;
    if (modules) course.modules = modules;
    if (finalAssessment !== undefined) course.finalAssessment = finalAssessment || undefined;

    const updatedCourse = await course.save();
    await logActivity(req.user.id, `Updated course: "${course.title}"`, req.ip);

    res.status(200).json({ success: true, course: updatedCourse });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (Teacher/Admin)
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404);
      throw new Error('Course not found');
    }

    await course.deleteOne();
    await Enrollment.deleteMany({ course: req.params.id });
    await Discussion.deleteMany({ course: req.params.id });
    await Announcement.deleteMany({ course: req.params.id });

    await logActivity(req.user.id, `Deleted course: "${course.title}"`, req.ip);
    res.status(200).json({ success: true, message: 'Course removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private
export const enrollCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404);
      throw new Error('Course not found');
    }

    let enrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
    if (enrollment) {
      return res.status(200).json({ success: true, enrollment, message: 'Already enrolled' });
    }

    enrollment = await Enrollment.create({
      user: req.user.id,
      course: courseId,
      completedItems: [],
      progress: 0
    });

    // Award initial enrollment XP (10 XP)
    const user = await User.findById(req.user.id);
    user.xp = (user.xp || 0) + 10;
    
    // Check streak
    const today = new Date().toDateString();
    const lastActive = user.lastActiveDate ? user.lastActiveDate.toDateString() : null;
    if (lastActive !== today) {
      if (user.lastActiveDate && (new Date() - user.lastActiveDate) <= 24 * 60 * 60 * 1000 * 2) {
        user.streak = (user.streak || 0) + 1;
      } else {
        user.streak = 1;
      }
      user.lastActiveDate = new Date();
    }
    
    await user.save();
    await logActivity(req.user.id, `Enrolled in course: "${course.title}"`, req.ip);

    // Auto-generate calendar events
    try {
      const dueDateCourse = new Date();
      dueDateCourse.setDate(dueDateCourse.getDate() + 30);
      await CalendarEvent.create({
        user: req.user.id,
        title: `Complete Course: ${course.title}`,
        type: 'course',
        referenceId: course._id.toString(),
        dueDate: dueDateCourse,
        status: 'Not Started'
      });

      let dayOffset = 5;
      for (const mod of course.modules) {
        for (const item of mod.items) {
          const itemDueDate = new Date();
          itemDueDate.setDate(itemDueDate.getDate() + dayOffset);
          
          await CalendarEvent.create({
            user: req.user.id,
            title: `${item.type === 'video' ? 'Watch Video' : item.type === 'quiz' ? 'Take Quiz' : 'Read Reflection'}: ${item.title}`,
            type: item.type === 'video' ? 'course' : item.type === 'quiz' ? 'quiz' : 'feedback',
            referenceId: item.itemId.toString(),
            dueDate: itemDueDate,
            status: 'Not Started'
          });
          
          dayOffset += 4;
        }
      }
    } catch (calErr) {
      console.error("Failed to generate calendar events for enrollment:", calErr);
    }

    res.status(201).json({ success: true, enrollment });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a course item completed and update progress %
// @route   POST /api/courses/:id/progress
// @access  Private
export const updateProgress = async (req, res, next) => {
  try {
    const { moduleId, itemId, type } = req.body; // type: video, quiz, reflection, activity
    const courseId = req.params.id;

    if (!moduleId || !itemId) {
      res.status(400);
      throw new Error('moduleId and itemId are required');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404);
      throw new Error('Course not found');
    }

    let enrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
    if (!enrollment) {
      res.status(400);
      throw new Error('User not enrolled in this course');
    }

    const itemKey = `${moduleId}_${itemId}`;
    if (!enrollment.completedItems.includes(itemKey)) {
      enrollment.completedItems.push(itemKey);
      
      // Calculate new progress percentage
      let totalItems = 0;
      course.modules.forEach(m => {
        totalItems += m.items.length;
      });

      const rawProgress = totalItems > 0 ? (enrollment.completedItems.length / totalItems) * 100 : 0;
      enrollment.progress = Math.min(100, Math.round(rawProgress));

      // Award XP for item completion (20 XP) and increment learning hours
      const user = await User.findById(req.user.id);
      user.xp = (user.xp || 0) + 20;
      user.learningHours = (user.learningHours || 0) + 0.5;

      // Update calendar events
      try {
        await CalendarEvent.updateMany(
          { user: req.user.id, referenceId: itemId },
          { status: 'Completed' }
        );
      } catch (calErr) {
        console.error("Failed to update calendar event on progress sync:", calErr);
      }

      // Handle course completion
      if (enrollment.progress === 100 && !enrollment.completed) {
        enrollment.completed = true;
        enrollment.completedAt = new Date();
        enrollment.certificateId = `CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Award Course Finisher XP & Badge
        user.xp += 100;
        if (!user.badges.includes('course_finisher')) {
          user.badges.push('course_finisher');
        }

        // Complete course calendar event
        try {
          await CalendarEvent.updateMany(
            { user: req.user.id, referenceId: courseId, type: 'course' },
            { status: 'Completed' }
          );
        } catch (calErr) {
          console.error("Failed to update course calendar event on graduation:", calErr);
        }
      }

      // Check for first quiz badge if item completed was a quiz
      if (type === 'quiz') {
        if (!user.badges.includes('first_quiz')) {
          user.badges.push('first_quiz');
        }
      }

      // Check XP limit badge
      if (user.xp >= 500 && !user.badges.includes('top_performer')) {
        user.badges.push('top_performer');
      }

      // Streak check
      const today = new Date().toDateString();
      const lastActive = user.lastActiveDate ? user.lastActiveDate.toDateString() : null;
      if (lastActive !== today) {
        if (user.lastActiveDate && (new Date() - user.lastActiveDate) <= 24 * 60 * 60 * 1000 * 2) {
          user.streak = (user.streak || 0) + 1;
        } else {
          user.streak = 1;
        }
        
        if (user.streak >= 7 && !user.badges.includes('seven_day_streak')) {
          user.badges.push('seven_day_streak');
        }
        user.lastActiveDate = new Date();
      }

      await user.save();
      await enrollment.save();
    }

    res.status(200).json({ success: true, enrollment });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a note inside course video
// @route   POST /api/courses/:id/notes
// @access  Private
export const addNote = async (req, res, next) => {
  try {
    const { videoId, timestamp, noteText } = req.body;
    const courseId = req.params.id;

    if (!videoId || timestamp === undefined || !noteText) {
      res.status(400);
      throw new Error('Please provide videoId, timestamp and noteText');
    }

    const enrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
    if (!enrollment) {
      res.status(400);
      throw new Error('User not enrolled in this course');
    }

    enrollment.notes.push({ videoId, timestamp, noteText });
    await enrollment.save();

    res.status(201).json({ success: true, notes: enrollment.notes });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a note
// @route   DELETE /api/courses/:id/notes/:noteId
// @access  Private
export const deleteNote = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({ user: req.user.id, course: req.params.id });
    if (!enrollment) {
      res.status(400);
      throw new Error('User not enrolled in this course');
    }

    enrollment.notes = enrollment.notes.filter(n => n._id.toString() !== req.params.noteId);
    await enrollment.save();

    res.status(200).json({ success: true, notes: enrollment.notes });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a bookmark inside course video
// @route   POST /api/courses/:id/bookmarks
// @access  Private
export const addBookmark = async (req, res, next) => {
  try {
    const { videoId, timestamp, label } = req.body;
    const courseId = req.params.id;

    if (!videoId || timestamp === undefined || !label) {
      res.status(400);
      throw new Error('Please provide videoId, timestamp and label');
    }

    const enrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
    if (!enrollment) {
      res.status(400);
      throw new Error('User not enrolled in this course');
    }

    enrollment.bookmarks.push({ videoId, timestamp, label });
    await enrollment.save();

    res.status(201).json({ success: true, bookmarks: enrollment.bookmarks });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a bookmark
// @route   DELETE /api/courses/:id/bookmarks/:bookmarkId
// @access  Private
export const deleteBookmark = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({ user: req.user.id, course: req.params.id });
    if (!enrollment) {
      res.status(400);
      throw new Error('User not enrolled in this course');
    }

    enrollment.bookmarks = enrollment.bookmarks.filter(b => b._id.toString() !== req.params.bookmarkId);
    await enrollment.save();

    res.status(200).json({ success: true, bookmarks: enrollment.bookmarks });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course discussions
// @route   GET /api/courses/:id/discussions
// @access  Private
export const getDiscussions = async (req, res, next) => {
  try {
    const discussions = await Discussion.find({ course: req.params.id })
      .populate('user', 'name email role')
      .sort('-createdAt');
    res.status(200).json({ success: true, discussions });
  } catch (error) {
    next(error);
  }
};

// @desc    Post to course discussions
// @route   POST /api/courses/:id/discussions
// @access  Private
export const postDiscussion = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400);
      throw new Error('Please add text');
    }

    const discussion = await Discussion.create({
      course: req.params.id,
      user: req.user.id,
      text
    });

    const populated = await Discussion.findById(discussion._id).populate('user', 'name email role');
    res.status(201).json({ success: true, discussion: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course announcements
// @route   GET /api/courses/:id/announcements
// @access  Private
export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ course: req.params.id })
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.status(200).json({ success: true, announcements });
  } catch (error) {
    next(error);
  }
};

// @desc    Post a course announcement
// @route   POST /api/courses/:id/announcements
// @access  Private (Teacher/Admin Only)
export const postAnnouncement = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      res.status(400);
      throw new Error('Please add title and content');
    }

    const announcement = await Announcement.create({
      course: req.params.id,
      title,
      content,
      createdBy: req.user.id
    });

    const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name email');
    res.status(201).json({ success: true, announcement: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a course
// @route   POST /api/courses/:id/rate
// @access  Private
export const rateCourse = async (req, res, next) => {
  try {
    const { rating } = req.body;
    const courseId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400);
      throw new Error('Rating must be between 1 and 5');
    }

    const enrollment = await Enrollment.findOne({ user: req.user.id, course: courseId });
    if (!enrollment) {
      res.status(400);
      throw new Error('User not enrolled in this course');
    }

    // Check if user already rated
    const oldRating = enrollment.rating;
    enrollment.rating = rating;
    await enrollment.save();

    // Update course aggregates
    const course = await Course.findById(courseId);
    if (course) {
      if (oldRating) {
        course.ratingSum = (course.ratingSum || 0) - oldRating + rating;
      } else {
        course.ratingSum = (course.ratingSum || 0) + rating;
        course.ratingCount = (course.ratingCount || 0) + 1;
      }
      await course.save();
    }

    res.status(200).json({ success: true, enrollment });
  } catch (error) {
    next(error);
  }
};
