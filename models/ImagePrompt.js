// models/ImagePrompt.js
const mongoose = require('mongoose');

const imagePromptSchema = new mongoose.Schema({
word: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  imageUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^(https?|data:image):/.test(v);
      },
      message: props => `${props.value} is not a valid URL or base64 image`
    }
  },
  category: {
    type: String,
    enum: ['Object', 'Nature', 'Animal', 'Place', 'Emotion', 'Action', 'Other'],
    default: 'Other'
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 3,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('ImagePrompt', imagePromptSchema);