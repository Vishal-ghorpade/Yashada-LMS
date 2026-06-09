import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    required: true // in seconds
  },
  questionType: {
    type: String,
    enum: ['MCQ', 'TrueFalse', 'FillBlank', 'Reflection', 'Poll'],
    required: true
  },
  questionText: {
    type: String,
    required: [true, 'Please add question text']
  },
  options: {
    type: [String],
    validate: {
      validator: function(v) {
        if (this.questionType === 'Reflection') return true;
        return v && v.length >= 2;
      },
      message: 'A choice-based question must have at least 2 options'
    }
  },
  correctAnswerIndex: {
    type: Number,
    min: 0
  },
  explanation: {
    type: String
  },
  pauseVideo: {
    type: Boolean,
    default: true
  },
  preventSkip: {
    type: Boolean,
    default: true
  }
});

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a video title'],
    trim: true
  },
  description: {
    type: String
  },
  rawVideoUrl: {
    type: String,
    required: true
  },
  hlsStreamUrl: {
    type: String
  },
  thumbnailUrl: {
    type: String,
    default: '/default-thumbnail.jpg'
  },
  duration: {
    type: Number,
    default: 0 // in seconds
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interactions: [interactionSchema]
}, {
  timestamps: true
});

export default mongoose.model('Video', videoSchema);
