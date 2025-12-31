const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  imageUrl: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  targetAudience: {
    ageRange: [Number],
    interests: [String],
    location: String,
    deviceType: {
      type: String,
      enum: ['all', 'mobile', 'desktop', 'tablet']
    }
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  maxBid: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'rejected'],
    default: 'active'
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  ctr: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  schedule: {
    days: [String],
    hours: [String]
  },
  aiOptimization: {
    enabled: Boolean,
    performanceScore: Number,
    suggestions: [String]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ad', adSchema);