const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Story = require('../models/Story');
const { authenticateToken } = require('./auth');

// Get saved stories for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('progress.savedStories');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.progress.savedStories || []);
  } catch (error) {
    console.error('❌ Error fetching saved stories:', error);
    res.status(500).json({ error: 'Error fetching saved stories' });
  }
});

// Save a story
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.body;
    if (!storyId) return res.status(400).json({ error: 'storyId is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.progress.savedStories.includes(storyId)) {
      user.progress.savedStories.push(storyId);
      await user.save();
    }

    res.json({ success: true, savedStories: user.progress.savedStories });
  } catch (error) {
    console.error('❌ Error saving story:', error);
    res.status(500).json({ error: 'Error saving story' });
  }
});

// Unsave a story
router.delete('/:storyId', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.progress.savedStories = user.progress.savedStories.filter(id => id.toString() !== storyId);
    await user.save();

    res.json({ success: true, savedStories: user.progress.savedStories });
  } catch (error) {
    console.error('❌ Error unsaving story:', error);
    res.status(500).json({ error: 'Error unsaving story' });
  }
});

module.exports = router;
