import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add an event title']
  },
  type: {
    type: String,
    enum: ['course', 'quiz', 'feedback', 'event'],
    required: true
  },
  referenceId: {
    type: String // Related Course ID, Quiz ID, or Rubric ID
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'Missed'],
    default: 'Not Started'
  }
}, {
  timestamps: true
});

export default mongoose.model('CalendarEvent', calendarEventSchema);
