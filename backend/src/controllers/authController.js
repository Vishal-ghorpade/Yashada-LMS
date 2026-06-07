import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
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
    const { name, email, password, role } = req.body;

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
      role: assignedRole
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
        role: user.role
      },
      // Backward compatibility for existing front-end
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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
    const user = await User.findOne({ email }).select('+password');

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
        role: user.role
      },
      // Backward compatibility for existing front-end
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      // Backward compatibility for existing front-end
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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
