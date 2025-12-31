import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email',
    },
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
    default: 'user',
  },

  // Contact Information
  phone: String,
  company: String,
  position: String,
  location: String,
  timezone: {
    type: String,
    default: 'UTC',
  },

  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
    language: {
      type: String,
      default: 'en',
    },
    aiAssistant: {
      voice: { type: String, default: 'default' },
      speed: { type: Number, default: 1.0 },
      personality: { type: String, default: 'professional' },
    },
    privacy: {
      shareAnalytics: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
    },
  },

  // Skills & Expertise
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate',
    },
    years: Number,
  }],

  // Availability
  availability: {
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
    },
    timeOff: [{
      start: Date,
      end: Date,
      reason: String,
    }],
    busySlots: [{
      start: Date,
      end: Date,
      description: String,
    }],
  },

  // Subscription & Billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'expired', 'trial'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'paypal', 'crypto', null],
      default: null,
    },
  },

  // Statistics
  stats: {
    projectsCreated: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    meetingsAttended: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    totalTimeSaved: { type: Number, default: 0 }, // in minutes
  },

  // AI Learning Data
  aiPreferences: {
    preferredCommunicationStyle: {
      type: String,
      enum: ['concise', 'detailed', 'encouraging', 'formal'],
      default: 'detailed',
    },
    learningPatterns: {
      optimalWorkHours: [String],
      preferredTaskTypes: [String],
      commonFocusAreas: [String],
    },
    behaviorHistory: [{
      action: String,
      timestamp: Date,
      context: Object,
    }],
  },

  // Security & Verification
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: String,
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: Date,
    location: Object,
    successful: Boolean,
  }],

  // Timestamps
  lastActive: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtuals
userSchema.virtual('fullProfile').get(function() {
  return {
    name: this.name,
    email: this.email,
    role: this.role,
    company: this.company,
    position: this.position,
    stats: this.stats,
  };
});

// Middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

userSchema.methods.updateStats = function(action, data) {
  switch (action) {
    case 'project_created':
      this.stats.projectsCreated += 1;
      break;
    case 'task_completed':
      this.stats.tasksCompleted += 1;
      this.stats.productivityScore += 10;
      break;
    case 'time_saved':
      this.stats.totalTimeSaved += data.minutes;
      break;
    case 'streak_updated':
      this.stats.streakDays = data.days;
      break;
  }
};

userSchema.methods.getAvailability = function(date = new Date()) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const time = date.toTimeString().slice(0, 5);
  
  // Check if it's a weekend
  if (day === 0 || day === 6) {
    return { available: false, reason: 'Weekend' };
  }
  
  // Check working hours
  if (time < this.availability.workingHours.start || 
      time > this.availability.workingHours.end) {
    return { available: false, reason: 'Outside working hours' };
  }
  
  // Check time off
  const hasTimeOff = this.availability.timeOff.some(period => 
    date >= new Date(period.start) && date <= new Date(period.end)
  );
  
  if (hasTimeOff) {
    return { available: false, reason: 'Time off' };
  }
  
  // Check busy slots
  const isBusy = this.availability.busySlots.some(slot => 
    date >= new Date(slot.start) && date <= new Date(slot.end)
  );
  
  if (isBusy) {
    return { available: false, reason: 'Busy slot' };
  }
  
  return { available: true };
};

// Static Methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.find({ lastActive: { $gte: twentyFourHoursAgo } });
};

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ 'stats.productivityScore': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActive: -1 });

const User = mongoose.model('User', userSchema);

export default User;