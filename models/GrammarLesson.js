const mongoose = require('mongoose');

const grammarLessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  category: {
    type: String,
    required: true,
    enum: ['verbs', 'nouns', 'adjectives', 'pronouns', 'sentence-structure', 'tenses', 'prepositions', 'conjunctions', 'other']
  },
  order: {
    type: Number,
    required: true
  },
  examples: [{
    portuguese: String,
    english: String,
    explanation: String
  }],
  exercises: [{
    type: {
      type: String,
      enum: ['multiple-choice', 'fill-blank', 'sentence-order', 'translation']
    },
    question: String,
    options: [String],
    correctAnswer: String,
    explanation: String
  }],
  relatedWords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word'
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

module.exports = mongoose.model('GrammarLesson', grammarLessonSchema);