import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true // e.g. "Beginning", "Developing", "Proficient", "Exemplary"
  },
  description: {
    type: String,
    required: true // e.g. "The asset has little or no connection..."
  }
});

const parameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a parameter name'] // e.g. "Relevance & Purpose Fit"
  },
  description: {
    type: String
  },
  levels: [levelSchema]
});

const rubricSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a rubric title'],
    trim: true
  },
  description: {
    type: String
  },
  parameters: [parameterSchema],
  scaleMin: {
    type: Number,
    default: 1
  },
  scaleMax: {
    type: Number,
    default: 4
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Rubric', rubricSchema);
