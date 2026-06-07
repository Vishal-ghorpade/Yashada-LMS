import mongoose from 'mongoose';

const videoProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  lastWatchedTimestamp: {
    type: Number,
    default: 0
  },
  maxWatchedTimestamp: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to speed up lookup per user/video
videoProgressSchema.index({ user: 1, videoId: 1 }, { unique: true });

export default mongoose.model('VideoProgress', videoProgressSchema);
