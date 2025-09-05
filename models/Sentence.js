const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  portuguese: {
    type: String,
    required: true,
    trim: true
  },
  english: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate'
  },
  category: {
    type: String,
    default: 'General'
  }
});

module.exports = mongoose.model('Sentence', sentenceSchema);