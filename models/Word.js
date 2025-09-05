// backend/models/Word.js
const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  portuguese: {
    type: String,
    required: true,
    unique: true,
    set: function (value) {
      return value;
    }
  },
  english: {
    type: String,
    required: true
  },
  group: {
    type: String,
    default: 'Other'
  },
  examples: [{
    type: String,
    set: function (value) {
      return value;
    }
  }],
  imageUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // ✅ Spaced Repetition Fields
  ease: {
    type: Number,
    default: 2.5  // Anki default
  },
  interval: {
    type: Number,
    default: 0   // Days until next review
  },
  nextReview: {
    type: Date  // When the word is due for review
  },
  lastReviewed: {
    type: Date  // When the user last reviewed this word
  },
  reviewCount: {
    type: Number,
    default: 0  // How many times the user has reviewed this word
  }

}, {
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// ✅ ADD TEXT INDEX FOR PORTUGUESE WORDS (For Scrabble validation)
wordSchema.index({ portuguese: 'text' });

// ✅ ADD REGULAR INDEX FOR SORTING AND QUERYING
wordSchema.index({ portuguese: 1 });

module.exports = mongoose.model('Word', wordSchema);