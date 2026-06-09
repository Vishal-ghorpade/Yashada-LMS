import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  noteText: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const bookmarkSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  },
  completedItems: {
    type: [String], // Format: "moduleId_itemId"
    default: []
  },
  notes: [noteSchema],
  bookmarks: [bookmarkSchema],
  certificateId: {
    type: String,
    unique: true,
    sparse: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure unique enrollment per user per course
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
