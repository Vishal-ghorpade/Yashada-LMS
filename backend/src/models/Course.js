import mongoose from 'mongoose';

const courseItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['video', 'quiz', 'reflection', 'activity'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  title: {
    type: String,
    required: true
  }
});

const courseModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  items: [courseItemSchema]
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a course title'],
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    trim: true
  },
  thumbnailUrl: {
    type: String,
    default: '/default-thumbnail.jpg'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modules: [courseModuleSchema],
  finalAssessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  ratingSum: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Course', courseSchema);
