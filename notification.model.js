import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Notification Content
  type: {
    type: String,
    enum: [
      'task', 
      'project', 
      'system', 
      'alert', 
      'promotion', 
      'meeting', 
      'reminder',
      'collaboration',
      'billing',
      'security'
    ],
    required: true,
  },
  category: {
    type: String,
    enum: ['info', 'warning', 'error', 'success', 'promo'],
    default: 'info',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters'],
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Action & Navigation
  actionUrl: String,
  actionLabel: String,
  actionData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  deepLink: String,
  webUrl: String,
  mobileUrl: String,

  // Related Entities
  relatedTo: {
    type: {
      type: String,
      enum: ['project', 'task', 'user', 'meeting', 'document', null],
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  source: {
    type: {
      type: String,
      enum: ['system', 'user', 'ai', 'integration', 'admin'],
      default: 'system',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: String,
  },

  // Delivery Settings
  channels: [{
    type: String,
    enum: ['in-app', 'email', 'push', 'sms', 'webhook'],
    default: ['in-app'],
  }],
  scheduledFor: Date,
  expiresAt: Date,
  ttl: {
    type: Number, // in seconds
    default: 30 * 24 * 60 * 60, // 30 days
  },

  // Delivery Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'clicked', 'failed'],
    default: 'pending',
  },
  deliveryLog: [{
    channel: String,
    status: String,
    timestamp: Date,
    messageId: String,
    error: String,
  }],
  readAt: Date,
  clickedAt: Date,
  acknowledgedAt: Date,

  // Dismissal Settings
  dismissible: {
    type: Boolean,
    default: true,
  },
  autoDismiss: {
    type: Boolean,
    default: false,
  },
  autoDismissAfter: Number, // in seconds

  // Analytics
  metadata: {
    campaignId: String,
    templateId: String,
    experimentId: String,
    abTestGroup: String,
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },

  // User Preferences Override
  userPreferences: {
    override: {
      type: Boolean,
      default: false,
    },
    settings: {
      sound: Boolean,
      vibration: Boolean,
      badge: Boolean,
    },
  },

  // Localization
  locale: {
    type: String,
    default: 'en',
  },
  translations: {
    type: Map,
    of: {
      title: String,
      message: String,
      actionLabel: String,
    },
  },

  // Timestamps
  sentAt: Date,
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
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
notificationSchema.virtual('isUnread').get(function() {
  return !this.readAt;
});

notificationSchema.virtual('isActive').get(function() {
  if (!this.expiresAt) return true;
  return new Date() < new Date(this.expiresAt);
});

notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

notificationSchema.virtual('deliveryStatus').get(function() {
  if (this.status === 'failed') return 'failed';
  if (this.clickedAt) return 'clicked';
  if (this.readAt) return 'read';
  if (this.deliveredAt) return 'delivered';
  if (this.sentAt) return 'sent';
  return 'pending';
});

// Indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, status: 1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ user: 1, priority: 1 });
notificationSchema.index({ 'relatedTo.id': 1, 'relatedTo.type': 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });

// Middleware
notificationSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set default expiration if not set
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + (this.ttl * 1000));
    }
    
    // Set scheduled time if not set
    if (!this.scheduledFor) {
      this.scheduledFor = new Date();
    }
  }
  
  // Update status based on timestamps
  if (this.readAt && this.status !== 'read') {
    this.status = 'read';
  } else if (this.deliveredAt && this.status === 'sent') {
    this.status = 'delivered';
  }
  
  next();
});

// Methods
notificationSchema.methods.markAsRead = function() {
  this.readAt = new Date();
  this.status = 'read';
  return this.save();
};

notificationSchema.methods.markAsDelivered = function(channel, messageId) {
  this.deliveredAt = new Date();
  this.status = 'delivered';
  this.deliveryLog.push({
    channel,
    status: 'delivered',
    timestamp: new Date(),
    messageId,
  });
  return this.save();
};

notificationSchema.methods.markAsSent = function(channel, messageId) {
  this.sentAt = new Date();
  this.status = 'sent';
  this.deliveryLog.push({
    channel,
    status: 'sent',
    timestamp: new Date(),
    messageId,
  });
  return this.save();
};

notificationSchema.methods.markAsClicked = function() {
  this.clickedAt = new Date();
  this.status = 'clicked';
  this.metadata.clicks += 1;
  return this.save();
};

notificationSchema.methods.markAsFailed = function(channel, error) {
  this.status = 'failed';
  this.deliveryLog.push({
    channel,
    status: 'failed',
    timestamp: new Date(),
    error: error.message || error,
  });
  return this.save();
};

notificationSchema.methods.shouldDeliver = function() {
  // Check if notification is expired
  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }
  
  // Check if already delivered or read
  if (['delivered', 'read', 'clicked'].includes(this.status)) {
    return false;
  }
  
  // Check scheduled time
  if (this.scheduledFor && new Date() < this.scheduledFor) {
    return false;
  }
  
  return true;
};

notificationSchema.methods.getDeliveryChannels = function(userPreferences = {}) {
  const defaultChannels = ['in-app'];
  const availableChannels = this.channels || defaultChannels;
  
  // Filter based on user preferences
  return availableChannels.filter(channel => {
    if (!userPreferences[channel]) return true;
    return userPreferences[channel] !== false;
  });
};

// Static Methods
notificationSchema.statics.findUnread = function(userId) {
  return this.find({
    user: userId,
    readAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findRecent = function(userId, limit = 50) {
  return this.find({
    user: userId,
    expiresAt: { $gt: new Date() },
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

notificationSchema.statics.findByType = function(userId, type) {
  return this.find({
    user: userId,
    type,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      user: userId,
      readAt: { $exists: false },
    },
    {
      $set: {
        readAt: new Date(),
        status: 'read',
      },
    }
  );
};

notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

notificationSchema.statics.createSystemNotification = function(userId, data) {
  return this.create({
    user: userId,
    type: 'system',
    source: { type: 'system' },
    ...data,
  });
};

notificationSchema.statics.createTaskNotification = function(userId, task, action) {
  return this.create({
    user: userId,
    type: 'task',
    title: `Task ${action}`,
    message: `Task "${task.title}" has been ${action}`,
    relatedTo: {
      type: 'task',
      id: task._id,
    },
    actionUrl: `/tasks/${task._id}`,
    priority: task.priority === 'urgent' ? 'high' : 'medium',
  });
};

notificationSchema.statics.createProjectNotification = function(userId, project, action) {
  return this.create({
    user: userId,
    type: 'project',
    title: `Project ${action}`,
    message: `Project "${project.title}" has been ${action}`,
    relatedTo: {
      type: 'project',
      id: project._id,
    },
    actionUrl: `/projects/${project._id}`,
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;