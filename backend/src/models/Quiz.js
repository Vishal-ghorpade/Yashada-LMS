import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please add question text']
  },
  options: {
    type: [String],
    required: [true, 'Please add choices/options'],
    validate: {
      validator: function(v) {
        return v.length >= 2;
      },
      message: 'A question must have at least 2 options'
    }
  },
  correctAnswerIndex: {
    type: Number,
    required: [true, 'Please specify correct answer index'],
    min: 0
  },
  explanation: {
    type: String
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a quiz title'],
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    required: [true, 'Please select or add a category'],
    trim: true
  },
  timer: {
    type: Number,
    default: 0 // 0 means no time limit
  },
  positiveMarks: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0 // positive number representing deduction (e.g. 0.25)
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Quiz', quizSchema);
