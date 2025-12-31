import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'function'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  attachments: [{
    type: String,
    url: String,
    name: String,
  }],
  emotion: {
    type: String,
    enum: ['neutral', 'happy', 'sad', 'angry', 'excited', 'calm', 'confused'],
    default: 'neutral',
  },
  context: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
});

const aiConversationSchema = new mongoose.Schema({
  // Conversation Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Conversation',
  },
  description: String,

  // Messages
  messages: [messageSchema],
  contextWindow: {
    type: Number,
    default: 10,
  },

  // AI Configuration
  aiModel: {
    type: String,
    default: 'gpt-4',
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2,
  },
  maxTokens: {
    type: Number,
    default: 2000,
  },
  aiPersonality: {
    type: String,
    enum: ['professional', 'friendly', 'concise', 'detailed', 'creative'],
    default: 'professional',
  },

  // Conversation State
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active',
  },
  currentContext: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  memory: [{
    key: String,
    value: mongoose.Schema.Types.Mixed,
    importance: {
      type: Number,
      min: 0,
      max: 10,
      default: 5,
    },
    timestamp: Date,
  }],

  // Topics & Intent
  topics: [String],
  primaryIntent: String,
  secondaryIntents: [String],
  domain: {
    type: String,
    enum: ['general', 'work', 'personal', 'technical', 'creative', 'analytical'],
    default: 'general',
  },

  // User Preferences
  userPreferences: {
    responseStyle: {
      type: String,
      enum: ['brief', 'detailed', 'examples', 'step-by-step'],
      default: 'detailed',
    },
    language: {
      type: String,
      default: 'en',
    },
    formality: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
  },

  // Performance Metrics
  metrics: {
    totalMessages: {
      type: Number,
      default: 0,
    },
    userMessages: {
      type: Number,
      default: 0,
    },
    aiMessages: {
      type: Number,
      default: 0,
    },
    averageResponseTime: Number, // in milliseconds
    sentimentScore: Number, // -1 to 1
    engagementScore: Number, // 0-100
    completionRate: Number, // percentage
  },

  // Actions & Commands
  executedCommands: [{
    command: String,
    parameters: Object,
    result: mongoose.Schema.Types.Mixed,
    timestamp: Date,
    success: Boolean,
  }],
  pendingActions: [{
    action: String,
    parameters: Object,
    scheduledFor: Date,
  }],

  // Integration Data
  integrations: {
    projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    }],
    tasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],
    documents: [{
      id: String,
      type: String,
      name: String,
    }],
  },

  // Learning & Adaptation
  learningData: {
    userPatterns: [{
      pattern: String,
      frequency: Number,
      lastUsed: Date,
    }],
    preferencesLearned: [{
      key: String,
      value: mongoose.Schema.Types.Mixed,
      confidence: Number,
    }],
    corrections: [{
      userInput: String,
      aiResponse: String,
      correctedResponse: String,
      timestamp: Date,
    }],
  },

  // Privacy & Security
  privacyLevel: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  encryptionKey: String,
  accessLog: [{
    timestamp: Date,
    action: String,
    ip: String,
    userAgent: String,
  }],

  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
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
aiConversationSchema.virtual('recentMessages').get(function() {
  return this.messages.slice(-this.contextWindow);
});

aiConversationSchema.virtual('duration').get(function() {
  if (!this.startedAt) return 0;
  const end = this.endedAt || new Date();
  return Math.round((end - this.startedAt) / 1000); // seconds
});

aiConversationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

aiConversationSchema.virtual('summary').get(function() {
  if (this.messages.length === 0) return 'Empty conversation';
  
  const userMessages = this.messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return 'No user messages';
  
  return userMessages[0].content.substring(0, 100) + '...';
});

// Indexes
aiConversationSchema.index({ user: 1, createdAt: -1 });
aiConversationSchema.index({ sessionId: 1 });
aiConversationSchema.index({ status: 1 });
aiConversationSchema.index({ 'topics': 1 });
aiConversationSchema.index({ expiresAt: 1 });
aiConversationSchema.index({ lastMessageAt: -1 });
aiConversationSchema.index({ 'metrics.engagementScore': -1 });

// Middleware
aiConversationSchema.pre('save', function(next) {
  // Update metrics
  if (this.messages) {
    this.metrics.totalMessages = this.messages.length;
    this.metrics.userMessages = this.messages.filter(m => m.role === 'user').length;
    this.metrics.aiMessages = this.messages.filter(m => m.role === 'assistant').length;
  }
  
  // Update last message time
  if (this.messages && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
  
  // Auto-generate title if not set
  if (!this.title || this.title === 'New Conversation') {
    if (this.messages && this.messages.length > 0) {
      const firstUserMessage = this.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        this.title = firstUserMessage.content.substring(0, 50) + '...';
      }
    }
  }
  
  next();
});

// Methods
aiConversationSchema.methods.addMessage = function(message) {
  this.messages.push(message);
  this.lastMessageAt = new Date();
  
  // Maintain context window
  if (this.messages.length > this.contextWindow * 2) {
    this.messages = this.messages.slice(-this.contextWindow * 2);
  }
  
  return this;
};

aiConversationSchema.methods.addToMemory = function(key, value, importance = 5) {
  const existing = this.memory.find(item => item.key === key);
  
  if (existing) {
    existing.value = value;
    existing.importance = importance;
    existing.timestamp = new Date();
  } else {
    this.memory.push({
      key,
      value,
      importance,
      timestamp: new Date(),
    });
  }
  
  // Keep only important memories
  this.memory = this.memory
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 50); // Keep top 50 memories
  
  return this;
};

aiConversationSchema.methods.getMemory = function(key) {
  const item = this.memory.find(m => m.key === key);
  return item ? item.value : null;
};

aiConversationSchema.methods.executeCommand = function(command, parameters) {
  const commandResult = {
    command,
    parameters,
    timestamp: new Date(),
    success: false,
  };
  
  try {
    // Process command
    switch (command) {
      case 'create_project':
        commandResult.result = { action: 'project_creation', data: parameters };
        break;
      case 'schedule_meeting':
        commandResult.result = { action: 'meeting_scheduled', data: parameters };
        break;
      case 'set_reminder':
        commandResult.result = { action: 'reminder_set', data: parameters };
        break;
      default:
        commandResult.result = { error: 'Unknown command' };
    }
    
    commandResult.success = true;
  } catch (error) {
    commandResult.result = { error: error.message };
  }
  
  this.executedCommands.push(commandResult);
  return commandResult;
};

aiConversationSchema.methods.analyzeSentiment = function() {
  const messages = this.messages.filter(m => m.role === 'user');
  if (messages.length === 0) return 0;
  
  // Simple sentiment analysis (in real app, use NLP library)
  let sentimentScore = 0;
  const positiveWords = ['great', 'good', 'excellent', 'happy', 'thanks'];
  const negativeWords = ['bad', 'poor', 'terrible', 'sad', 'angry'];
  
  messages.forEach(message => {
    const content = message.content.toLowerCase();
    positiveWords.forEach(word => {
      if (content.includes(word)) sentimentScore += 0.1;
    });
    negativeWords.forEach(word => {
      if (content.includes(word)) sentimentScore -= 0.1;
    });
  });
  
  this.metrics.sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  return this.metrics.sentimentScore;
};

aiConversationSchema.methods.getContext = function() {
  const context = {
    conversationId: this._id,
    sessionId: this.sessionId,
    userPreferences: this.userPreferences,
    memory: this.memory.slice(0, 10), // Top 10 memories
    recentMessages: this.recentMessages,
    currentTopics: this.topics,
    primaryIntent: this.primaryIntent,
    executedCommands: this.executedCommands.slice(-5),
  };
  
  return context;
};

// Static Methods
aiConversationSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    user: userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ lastMessageAt: -1 });
};

aiConversationSchema.statics.findRecentConversations = function(userId, limit = 10) {
  return this.find({
    user: userId,
    status: { $in: ['active', 'paused'] },
    expiresAt: { $gt: new Date() },
  })
  .sort({ lastMessageAt: -1 })
  .limit(limit);
};

aiConversationSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $ne: 'archived' },
    },
    {
      $set: { status: 'archived' },
    }
  );
};

aiConversationSchema.statics.createNewSession = function(userId, options = {}) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return this.create({
    user: userId,
    sessionId,
    title: options.title || 'New Conversation',
    aiModel: options.aiModel || 'gpt-4',
    temperature: options.temperature || 0.7,
    aiPersonality: options.personality || 'professional',
    userPreferences: options.preferences || {},
    startedAt: new Date(),
  });
};

const AIConversation = mongoose.model('AIConversation', aiConversationSchema);

export default AIConversation;