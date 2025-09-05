const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  difficulty: { type: Number, default: 1, min: 1, max: 5 },
  category: { type: String, required: true, trim: true },
  paragraphs: {
    type: [{
      portuguese: { type: String, required: true },
      english: { type: String, required: true }
    }],
    validate: [arr => arr.length > 0, 'A story must have at least one paragraph.']
  }
}, { timestamps: true });

storySchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('Story', storySchema);
