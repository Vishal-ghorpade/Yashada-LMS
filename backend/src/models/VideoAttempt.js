import mongoose from 'mongoose';

const attemptAnswerSchema = new mongoose.Schema({
  interactionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOption: {
    type: Number,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  pointsEarned: {
    type: Number,
    default: 0
  }
});

const videoAttemptSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Nullable for guest users
  },
  guestInfo: {
    name: String,
    branch: String,
    rollNumber: String
  },
  answers: [attemptAnswerSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  timeTaken: {
    type: Number,
    default: 0 // in seconds
  }
}, {
  timestamps: true
});

export default mongoose.model('VideoAttempt', videoAttemptSchema);
