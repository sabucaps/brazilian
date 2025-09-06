// models/Journal.js
const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  userId: { 
    type: String,   // matches your auth system
    required: true,
    index: true 
  },
  date: { 
    type: String,   // format: "2025-08-31"
    required: true,
    index: true 
  },
  title: { 
    type: String, 
    default: 'Untitled Entry',   // ✅ fallback so frontend never breaks
    trim: true
  },
  task1: { type: String, default: '' },  // paragraph from one sentence
  task2: { type: String, default: '' },  // merged paragraph
  task3: { type: String, default: '' }   // 3-paragraph story
}, {
  timestamps: true  // adds createdAt & updatedAt
});

// ✅ Normalize JSON output for frontend
journalEntrySchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;

    // defensive fallback
    ret.title = ret.title || 'Untitled Entry';
    ret.task1 = ret.task1 || '';
    ret.task2 = ret.task2 || '';
    ret.task3 = ret.task3 || '';
    return ret;
  }
});

module.exports = mongoose.model('Journal', journalEntrySchema);
