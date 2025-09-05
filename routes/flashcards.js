const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Word = require('../models/Word');
const User = require('../models/User');

// Use authenticateToken exported from routes/auth.js
const { authenticateToken } = require('./auth');

// Helper to validate ObjectId
const isValidObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
  } catch (e) {
    return false;
  }
};

// Helper to ensure user has proper progress structure
function ensureProgressStructure(user) {
  if (!user.progress) {
    user.progress = {
      words: {},
      wordsHistory: [],
      mastered: [],
      needsReview: []
    };
  }
  
  if (!user.progress.words) user.progress.words = {};
  if (!user.progress.wordsHistory) user.progress.wordsHistory = [];
  if (!Array.isArray(user.progress.mastered)) user.progress.mastered = [];
  if (!Array.isArray(user.progress.needsReview)) user.progress.needsReview = [];
  
  return user;
}

function getProgressEntry(user, wordId) {
  // Ensure user has progress structure
  user = ensureProgressStructure(user);
  
  // For lean queries, we can't modify the object, so we need to handle it differently
  // Check if the progress structure exists, but don't try to modify it
  const hasWordsMap = user.progress.words && typeof user.progress.words === 'object';
  const hasWordsHistory = Array.isArray(user.progress.wordsHistory);
  
  // Prefer map entry if present
  if (hasWordsMap && user.progress.words[wordId]) {
    return user.progress.words[wordId];
  }

  // Fallback to history entry
  if (hasWordsHistory) {
    const historyEntry = user.progress.wordsHistory.find(e => String(e.wordId) === String(wordId));
    if (historyEntry) {
      // Normalize keys
      return {
        ease: typeof historyEntry.ease === 'number' ? historyEntry.ease : 2.5,
        interval: typeof historyEntry.interval === 'number' ? historyEntry.interval : 0,
        reviewCount: historyEntry.reviewCount || 0,
        lastReviewed: historyEntry.lastReviewed,
        nextReview: historyEntry.nextReview
      };
    }
  }

  // If neither exists, return default
  return {
    ease: 2.5,
    interval: 0,
    reviewCount: 0,
    lastReviewed: null,
    nextReview: null
  };
}

function setProgressEntry(user, wordId, entry) {
  // Ensure user has progress structure
  user = ensureProgressStructure(user);
  
  // Write preferred map entry
  user.progress.words[wordId] = {
    ease: entry.ease,
    interval: entry.interval,
    reviewCount: entry.reviewCount,
    lastReviewed: entry.lastReviewed,
    nextReview: entry.nextReview
  };

  // Maintain a history array entry (upsert)
  const idx = user.progress.wordsHistory.findIndex(e => String(e.wordId) === String(wordId));
  const historyObj = {
    wordId,
    ease: entry.ease,
    interval: entry.interval,
    reviewCount: entry.reviewCount,
    lastReviewed: entry.lastReviewed,
    nextReview: entry.nextReview
  };
  if (idx === -1) user.progress.wordsHistory.push(historyObj);
  else user.progress.wordsHistory[idx] = historyObj;

  // Update mastered / needsReview arrays
  const masteredIdx = user.progress.mastered.findIndex(id => String(id) === String(wordId));
  const needsIdx = user.progress.needsReview.findIndex(id => String(id) === String(wordId));
  const isMastered = entry.interval >= 21; // Mastered if interval is 21 days or more
  const isNeeds = entry.interval < 7; // Needs review if interval is less than 7 days

  // Add/remove from arrays based on above
  if (isMastered) {
    if (masteredIdx === -1) user.progress.mastered.push(wordId);
    if (needsIdx !== -1) user.progress.needsReview.splice(needsIdx, 1);
  } else if (isNeeds) {
    if (needsIdx === -1) user.progress.needsReview.push(wordId);
    if (masteredIdx !== -1) user.progress.mastered.splice(masteredIdx, 1);
  } else {
    // neither; remove from both if present
    if (masteredIdx !== -1) user.progress.mastered.splice(masteredIdx, 1);
    if (needsIdx !== -1) user.progress.needsReview.splice(needsIdx, 1);
  }
}

/**
 * GET /api/flashcards
 * Returns all words merged with the logged-in user's progress.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const words = await Word.find().sort({ portuguese: 1 });

    // Merge per-word progress
    const wordsWithProgress = words.map((w) => {
      const wordId = String(w._id);
      const progress = getProgressEntry(user, wordId) || {};

      return {
        ...w.toObject(),
        ease: typeof progress.ease === 'number' ? progress.ease : 2.5,
        interval: typeof progress.interval === 'number' ? progress.interval : 0,
        reviewCount: progress.reviewCount || 0,
        lastReviewed: progress.lastReviewed || null,
        nextReview: progress.nextReview || null
      };
    });

    res.json(wordsWithProgress);
  } catch (err) {
    console.error('Error fetching user flashcards:', err);
    res.status(500).json({ error: 'Server error fetching user flashcards', details: err.message });
  }
});

/**
 * POST /api/flashcards/review
 * Body: { wordId: string, difficulty: 'easy'|'medium'|'hard' }
 * Saves user-specific review/progress for that word.
 */
router.post('/review', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wordId, difficulty } = req.body;

    if (!wordId || !difficulty) {
      return res.status(400).json({ error: 'wordId and difficulty are required' });
    }
    if (!isValidObjectId(userId) || !isValidObjectId(wordId)) {
      return res.status(400).json({ error: 'Invalid userId or wordId' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    // Ensure user has progress structure
    ensureProgressStructure(user);

    // Read previous progress (normalize)
    const prev = getProgressEntry(user, wordId);
    let ease = typeof prev.ease === 'number' ? prev.ease : 2.5;
    let interval = typeof prev.interval === 'number' ? prev.interval : 0;
    let reviewCount = prev.reviewCount || 0;

    // Standard SM-2 algorithm implementation
    if (difficulty === 'easy') {
      ease = Math.min(3.0, ease + 0.15);
      interval = interval === 0 ? 1 : Math.ceil(interval * ease);
    } else if (difficulty === 'medium') {
      // Slight decrease in ease for medium difficulty
      ease = Math.max(1.3, ease - 0.05);
      interval = interval === 0 ? 1 : Math.ceil(interval * 1.2);
    } else {
      // hard - reset interval and decrease ease more
      ease = Math.max(1.3, ease - 0.2);
      interval = 1;
    }

    const now = new Date();
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const updated = {
      ease,
      interval,
      reviewCount: reviewCount + 1,
      lastReviewed: now,
      nextReview: nextReview
    };

    // Persist using helper
    setProgressEntry(user, wordId, updated);

    await user.save();

    return res.json({
      message: 'Review saved',
      wordId,
      progress: updated
    });
  } catch (err) {
    console.error('Error saving review:', err);
    res.status(500).json({ error: 'Error saving flashcard review', details: err.message });
  }
});

/**
 * GET /api/flashcards/due
 * Returns words that are due for review (nextReview <= now)
 */
router.get('/due', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const words = await Word.find().sort({ portuguese: 1 });
    const now = new Date();

    // Filter words that are due for review
    const dueWords = words.filter((w) => {
      const wordId = String(w._id);
      const progress = getProgressEntry(user, wordId) || {};
      
      // If never reviewed or nextReview is null, it's due
      if (!progress.nextReview) return true;
      
      // Convert to Date object if it's stored as string
      const nextReviewDate = typeof progress.nextReview === 'string' 
        ? new Date(progress.nextReview) 
        : progress.nextReview;
      
      return nextReviewDate <= now;
    }).map((w) => {
      const wordId = String(w._id);
      const progress = getProgressEntry(user, wordId) || {};

      return {
        ...w.toObject(),
        ease: typeof progress.ease === 'number' ? progress.ease : 2.5,
        interval: typeof progress.interval === 'number' ? progress.interval : 0,
        reviewCount: progress.reviewCount || 0,
        lastReviewed: progress.lastReviewed || null,
        nextReview: progress.nextReview || null
      };
    });

    res.json(dueWords);
  } catch (err) {
    console.error('Error fetching due flashcards:', err);
    res.status(500).json({ error: 'Server error fetching due flashcards', details: err.message });
  }
});

module.exports = router;