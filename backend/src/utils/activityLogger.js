import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async (userId, action, ip = '127.0.0.1') => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      ip
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
