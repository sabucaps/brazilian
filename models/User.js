// models/User.js
const mongoose = require('mongoose');

const WordProgressSchema = new mongoose.Schema({
  ease: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  lastReviewed: { type: Date, default: null },
  nextReview: { type: Date, default: null }
}, { _id: false });

const WordHistorySchema = new mongoose.Schema({
  wordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Word' },
  ease: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  lastReviewed: { type: Date, default: null },
  nextReview: { type: Date, default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    learningPath: {
      currentStage: { type: String, default: 'stage-1' },
      completedStages: { type: [String], default: [] }
    },

    // Backwards-compatible structure for words:
    // - mastered / needsReview arrays (existing)
    // - map: a Map keyed by wordId -> WordProgressSchema (preferred new shape)
    // - history: an array of history entries (optional)
    words: {
      mastered: { type: [String], default: [] },
      needsReview: { type: [String], default: [] },

      // New map for per-word progress: access via user.progress.words.map.get(wordId) (or with plain object on toObject())
      map: {
        type: Map,
        of: WordProgressSchema,
        default: {}
      },

      // History array for compatibility / audit
      history: { type: [WordHistorySchema], default: [] }
    },

    savedStories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    }],

    tests: [{
      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
      },
      score: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }]
  },

  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  }
});

// Streak update: only adjust streak when user is newly created or when `progress` was modified
userSchema.pre('save', function(next) {
  try {
    const today = new Date();

    // If new user: initialize streak
    if (this.isNew) {
      this.streak.current = this.streak.current || 1;
      this.streak.longest = Math.max(this.streak.longest || 1, this.streak.current);
      this.streak.lastActive = today;
      return next();
    }

    // Only update streak when progress was modified (so unrelated edits won't bump streak)
    if (!this.isModified('progress')) {
      return next();
    }

    // Otherwise compute difference between the stored lastActive and now
    const lastActive = this.streak.lastActive ? new Date(this.streak.lastActive) : null;
    if (!lastActive) {
      this.streak.current = 1;
      this.streak.longest = Math.max(this.streak.longest || 0, this.streak.current);
      this.streak.lastActive = today;
      return next();
    }

    const diffMs = today - lastActive;
    const oneDay = 1000 * 60 * 60 * 24;

    // If the last active was yesterday (+/- tolerance), increment streak
    if (diffMs > 0 && diffMs <= (oneDay * 2)) {
      // within 2 days -> continue streak (safe tolerance)
      this.streak.current = (this.streak.current || 0) + 1;
      if (this.streak.current > (this.streak.longest || 0)) {
        this.streak.longest = this.streak.current;
      }
    } else {
      // gap too big -> reset to 1
      this.streak.current = 1;
    }

    this.streak.lastActive = today;
    return next();
  } catch (err) {
    // don't block save on error, but log
    console.error('Streak pre-save error:', err);
    return next();
  }
});

module.exports = mongoose.model('User', userSchema);
