import mongoose from 'mongoose';

const responseAnswerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  selectedOption: {
    type: Number, // null if skipped
    default: null
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  score: {
    type: Number,
    required: true
  }
});

const quizResponseSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  participantName: {
    type: String,
    required: [true, 'Please provide participant name']
  },
  participantBranch: {
    type: String,
    required: [true, 'Please provide participant department/branch']
  },
  rollNumber: {
    type: String,
    required: [true, 'Please provide roll number / employee ID']
  },
  answers: [responseAnswerSchema],
  totalScore: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number,
    required: true // in seconds
  }
}, {
  timestamps: true,
  collection: 'quizResponses'
});

export default mongoose.model('QuizResponse', quizResponseSchema);
