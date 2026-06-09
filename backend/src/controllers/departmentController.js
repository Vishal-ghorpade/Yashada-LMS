import Department from '../models/Department.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import QuizResponse from '../models/QuizResponse.js';
import FeedbackResponse from '../models/FeedbackResponse.js';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().sort('name');

    // Compile count of users in each department
    const departmentsWithStats = await Promise.all(
      departments.map(async (dept) => {
        const userCount = await User.countDocuments({ department: dept._id });
        
        // Find users in this department
        const users = await User.find({ department: dept._id }, '_id');
        const userIds = users.map(u => u._id);

        // Calculate average course progress of department members
        let avgProgress = 0;
        if (userIds.length > 0) {
          const enrolls = await Enrollment.find({ user: { $in: userIds } }, 'progress');
          if (enrolls.length > 0) {
            const sum = enrolls.reduce((acc, curr) => acc + (curr.progress || 0), 0);
            avgProgress = Math.round(sum / enrolls.length);
          }
        }

        return {
          _id: dept._id,
          name: dept.name,
          description: dept.description,
          userCount,
          avgProgress
        };
      })
    );

    res.status(200).json({
      success: true,
      departments: departmentsWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single department with stats and members list
// @route   GET /api/departments/:id
// @access  Private
export const getDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    const members = await User.find({ department: department._id }, 'name email designation rollNumber xp streak learningHours profileCollected');
    const memberIds = members.map(m => m._id);

    // Dynamic stats compilation
    let completionRate = 0;
    let totalLearningHours = 0;
    let courseParticipation = 0;
    let activeLearners = 0;
    let inactiveLearners = 0;
    let avgQuizScore = 0;

    if (memberIds.length > 0) {
      // 1. Completion Rate (Enrollments completed / total)
      const enrolls = await Enrollment.find({ user: { $in: memberIds } });
      const completedEnrolls = enrolls.filter(e => e.completed).length;
      completionRate = enrolls.length > 0 ? Math.round((completedEnrolls / enrolls.length) * 100) : 0;
      courseParticipation = enrolls.length;

      // 2. Learning Hours
      totalLearningHours = members.reduce((acc, curr) => acc + (curr.learningHours || 0), 0);

      // 3. Active / Inactive Learners
      members.forEach(m => {
        if (m.xp > 0) activeLearners++;
        else inactiveLearners++;
      });

      // 4. Average Quiz Scores
      const quizResps = await QuizResponse.find({ user: { $in: memberIds } });
      if (quizResps.length > 0) {
        const sumScore = quizResps.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
        avgQuizScore = Math.round(sumScore / quizResps.length);
      }
    }

    res.status(200).json({
      success: true,
      department,
      stats: {
        userCount: members.length,
        completionRate,
        totalLearningHours,
        courseParticipation,
        activeLearners,
        inactiveLearners,
        avgQuizScore
      },
      members
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Admin
export const createDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Please add a department name');
    }

    const exists = await Department.findOne({ name });
    if (exists) {
      res.status(400);
      throw new Error('Department already exists');
    }

    const department = await Department.create({ name, description });

    res.status(201).json({
      success: true,
      department
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private/Admin
export const updateDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    if (name) department.name = name;
    if (description !== undefined) department.description = description;

    await department.save();

    res.status(200).json({
      success: true,
      department
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
export const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    // Reset user references in this department
    await User.updateMany({ department: department._id }, { $unset: { department: 1 } });
    await department.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Department removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign users to department
// @route   POST /api/departments/:id/assign
// @access  Private/Admin
export const assignUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body; // Array of user IDs

    if (!Array.isArray(userIds)) {
      res.status(400);
      throw new Error('userIds must be an array');
    }

    const department = await Department.findById(req.params.id);
    if (!department) {
      res.status(404);
      throw new Error('Department not found');
    }

    // Update users' department reference
    await User.updateMany(
      { _id: { $in: userIds } },
      { department: department._id }
    );

    res.status(200).json({
      success: true,
      message: 'Users assigned to department successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user course progress for administrative inspect
// @route   GET /api/departments/users/:userId/progress
// @access  Private/Admin
export const getUserProgressForAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('department');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const enrollments = await Enrollment.find({ user: user._id })
      .populate('course', 'title description modules')
      .sort('-updatedAt');

    res.status(200).json({
      success: true,
      user,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};
