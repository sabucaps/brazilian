const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const User = require('../models/User');
const { searchImages } = require('../services/imageSearch');
const { authenticateToken } = require('../middleware/auth'); // Adjust path as needed

// Add authentication to all routes
router.use(authenticateToken);

// GET ALL WORDS with advanced filtering, sorting, pagination, and user progress
router.get('/', async (req, res) => {
  try {
    const {
      search,
      group,
      sort = 'portuguese',
      order = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    let filter = {};

    // Full-text search across Portuguese and English (case-insensitive)
    if (search && search.trim() !== '') {
      filter.$or = [
        { portuguese: { $regex: search.trim(), $options: 'i' } },
        { english: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Filter by group (supports 'Ungrouped' as null)
    if (group && group !== 'All') {
      if (group === 'Ungrouped') {
        filter.group = { $in: [null, '', undefined] };
      } else {
        filter.group = group;
      }
    }

    // Define allowed sort fields to prevent injection
    const allowedSortFields = ['portuguese', 'english', 'group', 'difficulty', 'createdAt'];
    const sortBy = allowedSortFields.includes(sort) ? sort : 'portuguese';

    // Sort order
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Fetch filtered, sorted, paginated words
    const words = await Word
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Get user progress
    const user = await User.findById(req.user.id).select('progress.words.map');
    
    // Merge user progress with each word
    const wordsWithProgress = words.map(word => {
      const progress = user?.progress?.words?.map?.get(word._id.toString()) || {};
      return {
        ...word.toObject(),
        ease: progress.ease || 2.5,
        interval: progress.interval || 0,
        reviewCount: progress.reviewCount || 0,
        lastReviewed: progress.lastReviewed || null,
        nextReview: progress.nextReview || null
      };
    });

    // Get total count for pagination
    const total = await Word.countDocuments(filter);

    // Respond with structured data
    res.json({
      words: wordsWithProgress,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum)
      },
      filters: {
        search: search || null,
        group: group || null
      }
    });
  } catch (err) {
    console.error('Error fetching words:', err.message);
    res.status(500).json({ error: 'Server error while fetching words' });
  }
});

// ADD A NEW WORD (with image search)
router.post('/', async (req, res) => {
  const { portuguese, english, partOfSpeech, gender, examples, difficulty, group } = req.body;

  // Validate required fields
  if (!portuguese || !english) {
    return res.status(400).json({ msg: 'Portuguese and English translations are required' });
  }

  try {
    // Check if word already exists (case-insensitive)
    const normalizedPortuguese = portuguese.trim();
    const existingWord = await Word.findOne({
      portuguese: { $regex: new RegExp(`^${normalizedPortuguese}$`, 'i') }
    });

    if (existingWord) {
      return res.status(400).json({ msg: 'Word already exists' });
    }

    // Search for a relevant image
    const imageUrl = await searchImages(normalizedPortuguese);

    // Create new word
    const word = new Word({
      portuguese: normalizedPortuguese,
      english: english.trim(),
      partOfSpeech,
      gender,
      examples: examples?.length ? examples : [],
      difficulty: difficulty || 'beginner',
      group: group || null,
      imageUrl
    });

    await word.save();
    res.status(201).json(word);
  } catch (err) {
    console.error('Error creating word:', err.message);
    res.status(500).json({ error: 'Server error while saving word' });
  }
});

// GET SINGLE WORD BY ID
router.get('/:id', async (req, res) => {
  try {
    const word = await Word.findById(req.params.id);
    if (!word) {
      return res.status(404).json({ msg: 'Word not found' });
    }
    
    // Get user progress for this word
    const user = await User.findById(req.user.id).select('progress.words.map');
    const progress = user?.progress?.words?.map?.get(req.params.id) || {};
    
    // Merge word with user progress
    const wordWithProgress = {
      ...word.toObject(),
      ease: progress.ease || 2.5,
      interval: progress.interval || 0,
      reviewCount: progress.reviewCount || 0,
      lastReviewed: progress.lastReviewed || null,
      nextReview: progress.nextReview || null
    };
    
    res.json(wordWithProgress);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Word not found' });
    }
    res.status(500).send('Server error');
  }
});

// UPDATE A WORD
router.put('/:id', async (req, res) => {
  const { portuguese, english, partOfSpeech, gender, examples, difficulty, group } = req.body;

  try {
    let word = await Word.findById(req.params.id);
    if (!word) {
      return res.status(404).json({ msg: 'Word not found' });
    }

    // Check for duplicates on update (except self)
    if (portuguese) {
      const normalizedPortuguese = portuguese.trim();
      const duplicate = await Word.findOne({
        portuguese: { $regex: new RegExp(`^${normalizedPortuguese}$`, 'i') },
        _id: { $ne: word._id }
      });
      if (duplicate) {
        return res.status(400).json({ msg: 'Word already exists' });
      }
    }

    // Update word fields
    if (portuguese) word.portuguese = portuguese.trim();
    if (english) word.english = english.trim();
    if (partOfSpeech) word.partOfSpeech = partOfSpeech;
    if (gender) word.gender = gender;
    if (examples) word.examples = examples;
    if (difficulty) word.difficulty = difficulty;
    if (group) word.group = group;

    await word.save();
    
    // Get user progress for this word
    const user = await User.findById(req.user.id).select('progress.words.map');
    const progress = user?.progress?.words?.map?.get(req.params.id) || {};
    
    // Merge word with user progress
    const wordWithProgress = {
      ...word.toObject(),
      ease: progress.ease || 2.5,
      interval: progress.interval || 0,
      reviewCount: progress.reviewCount || 0,
      lastReviewed: progress.lastReviewed || null,
      nextReview: progress.nextReview || null
    };
    
    res.json(wordWithProgress);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Word not found' });
    }
    res.status(500).send('Server error');
  }
});

// DELETE A WORD
router.delete('/:id', async (req, res) => {
  try {
    const word = await Word.findByIdAndDelete(req.params.id);
    if (!word) {
      return res.status(404).json({ msg: 'Word not found' });
    }
    
    // Remove this word from all users' progress
    await User.updateMany(
      { 'progress.words.map': { $exists: true } },
      { $unset: { [`progress.words.map.${req.params.id}`]: 1 } }
    );
    
    res.json({ msg: 'Word removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Word not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;