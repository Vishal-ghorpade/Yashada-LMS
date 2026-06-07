import mongoose from 'mongoose';

const parameterRatingSchema = new mongoose.Schema({
  parameterName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1
  },
  comment: {
    type: String
  }
});

const feedbackResponseSchema = new mongoose.Schema({
  rubricId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rubric',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  respondentName: {
    type: String,
    required: [true, 'Please provide respondent name']
  },
  respondentBranch: {
    type: String,
    required: [true, 'Please provide respondent department or branch']
  },
  rollNumber: {
    type: String,
    required: [true, 'Please provide roll number / employee ID']
  },
  respondentEmail: {
    type: String
  },
  parameterRatings: [parameterRatingSchema],
  feedbackText: {
    type: String
  },
  totalScore: {
    type: Number,
    required: true
  },
  averageScore: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  }
}, {
  timestamps: true,
  collection: 'feedbackResponses'
});

export default mongoose.model('FeedbackResponse', feedbackResponseSchema);
