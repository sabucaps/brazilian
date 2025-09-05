const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Multiple Choice', 'Fill in the Blank', 'Translation', 'Word Order']
  },
  questionCount: {
    type: Number,
    default: function() {
      return this.questions.length;
    }
  },
  estimatedTime: {
    type: Number,
    required: true,
    min: 1
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [String],
    correctAnswer: {
      type: Number,
      required: true
    },
    explanation: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

testSchema.pre('save', function(next) {
  // Automatically set questionCount based on questions array length
  this.questionCount = this.questions.length;
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Test', testSchema);