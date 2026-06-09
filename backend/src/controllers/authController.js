import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import Enrollment from '../models/Enrollment.js';
import QuizResponse from '../models/QuizResponse.js';
import FeedbackResponse from '../models/FeedbackResponse.js';
import { logActivity } from '../utils/activityLogger.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'yashada_premium_secure_jwt_secret_token_2026', {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, branch, rollNumber } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email and password');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    // Restrict role assignment from public register if needed (default to student)
    const assignedRole = (role === 'admin' || role === 'teacher' || role === 'student') ? role : 'student';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      branch: branch || '',
      rollNumber: rollNumber || ''
    });

    const token = generateToken(user._id);

    // Log the successful registration
    await logActivity(user._id, `Registered account as role: ${assignedRole}`, req.ip);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges
      },
      // Backward compatibility for existing front-end
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password').populate('department');

    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const token = generateToken(user._id);

    // Log the successful login
    await logActivity(user._id, 'Logged in successfully', req.ip);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges,
        profileCollected: user.profileCollected,
        designation: user.designation,
        yearsOfExperience: user.yearsOfExperience,
        learningPreference: user.learningPreference,
        monthlyLearningAvailability: user.monthlyLearningAvailability,
        competencyAreas: user.competencyAreas,
        learningHours: user.learningHours,
        department: user.department
      },
      // Backward compatibility for existing front-end
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges,
        profileCollected: user.profileCollected,
        designation: user.designation,
        yearsOfExperience: user.yearsOfExperience,
        learningPreference: user.learningPreference,
        monthlyLearningAvailability: user.monthlyLearningAvailability,
        competencyAreas: user.competencyAreas,
        learningHours: user.learningHours,
        department: user.department
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('department');
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges,
        profileCollected: user.profileCollected,
        designation: user.designation,
        yearsOfExperience: user.yearsOfExperience,
        learningPreference: user.learningPreference,
        monthlyLearningAvailability: user.monthlyLearningAvailability,
        competencyAreas: user.competencyAreas,
        learningHours: user.learningHours,
        department: user.department
      },
      // Backward compatibility for existing front-end
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges,
        profileCollected: user.profileCollected,
        designation: user.designation,
        yearsOfExperience: user.yearsOfExperience,
        learningPreference: user.learningPreference,
        monthlyLearningAvailability: user.monthlyLearningAvailability,
        competencyAreas: user.competencyAreas,
        learningHours: user.learningHours,
        department: user.department
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user activity logs
// @route   GET /api/auth/logs
// @access  Private
export const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ user: req.user.id })
      .sort('-timestamp')
      .limit(100);
    
    res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile aggregated dashboard
// @route   GET /api/auth/profile
// @access  Private
export const getProfileDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('department');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // 1. Fetch enrollments with course details
    const enrollments = await Enrollment.find({ user: user._id })
      .populate({
        path: 'course',
        select: 'title description category thumbnailUrl modules finalAssessment'
      })
      .sort('-updatedAt');

    // 2. Fetch recent quiz responses
    const quizResponses = await QuizResponse.find({ user: user._id })
      .populate('quizId', 'title category')
      .sort('-createdAt')
      .limit(10);

    // 3. Fetch feedback responses
    const feedbackResponses = await FeedbackResponse.find({ user: user._id })
      .populate('rubricId', 'title description')
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        rollNumber: user.rollNumber,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges,
        profileCollected: user.profileCollected,
        designation: user.designation,
        yearsOfExperience: user.yearsOfExperience,
        learningPreference: user.learningPreference,
        monthlyLearningAvailability: user.monthlyLearningAvailability,
        competencyAreas: user.competencyAreas,
        learningHours: user.learningHours,
        department: user.department
      },
      enrollments,
      quizResponses,
      feedbackResponses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user capacity building profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { 
      department, 
      designation, 
      yearsOfExperience, 
      learningPreference, 
      monthlyLearningAvailability, 
      competencyAreas 
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (department) user.department = department;
    if (designation) user.designation = designation;
    if (yearsOfExperience !== undefined) user.yearsOfExperience = yearsOfExperience;
    if (learningPreference) user.learningPreference = learningPreference;
    if (monthlyLearningAvailability) user.monthlyLearningAvailability = monthlyLearningAvailability;
    if (competencyAreas) user.competencyAreas = competencyAreas;
    
    user.profileCollected = true;

    await user.save();
    
    const populatedUser = await User.findById(user._id).populate('department');

    res.status(200).json({
      success: true,
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        branch: populatedUser.branch,
        rollNumber: populatedUser.rollNumber,
        xp: populatedUser.xp,
        streak: populatedUser.streak,
        badges: populatedUser.badges,
        profileCollected: populatedUser.profileCollected,
        designation: populatedUser.designation,
        yearsOfExperience: populatedUser.yearsOfExperience,
        learningPreference: populatedUser.learningPreference,
        monthlyLearningAvailability: populatedUser.monthlyLearningAvailability,
        competencyAreas: populatedUser.competencyAreas,
        learningHours: populatedUser.learningHours,
        department: populatedUser.department
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().populate('department').sort('name');
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

