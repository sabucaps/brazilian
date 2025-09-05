// backend/models/Conjugation.js
const mongoose = require('mongoose');

const conjugationSchema = new mongoose.Schema({
  verb: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  english: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['regular', 'irregular'],
    default: 'regular'
  },
  group: {
    type: String,
    default: 'Verbs'
  },
  conjugations: {
    present: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    past: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    imperfect: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    future: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    conditional: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    presentSubjunctive: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    imperfectSubjunctive: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    },
    imperative: {
      eu: String,
      voceEleEla: String,
      nos: String,
      vocesEles: String
    }
  },
  example: {
    portuguese: String,
    english: String
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

conjugationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Conjugation', conjugationSchema);