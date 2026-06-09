import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Please add discussion text']
  }
}, {
  timestamps: true
});

export default mongoose.model('Discussion', discussionSchema);
