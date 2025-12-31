import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'completed', 'blocked'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dueDate: Date,
  estimatedTime: Number, // in minutes
  actualTime: Number, // in minutes
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],
  tags: [String],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    edited: Boolean,
  }],
  history: [{
    action: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    changes: Object,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
});

const projectSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Project title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'team', 'client', 'education', 'research'],
    default: 'work',
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
    default: 'planning',
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private',
  },

  // Project Details
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['viewer', 'contributor', 'editor', 'admin'],
      default: 'contributor',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  clients: [{
    name: String,
    email: String,
    company: String,
  }],

  // Timeline
  startDate: Date,
  deadline: Date,
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    completed: Boolean,
    completedAt: Date,
  }],

  // Tasks
  tasks: [taskSchema],

  // Resources
  budget: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD',
    },
    spent: {
      type: Number,
      default: 0,
    },
  },
  resources: [{
    name: String,
    type: String,
    url: String,
    description: String,
  }],
  tools: [String],

  // Settings
  settings: {
    autoDetectTasks: {
      type: Boolean,
      default: true,
    },
    sendNotifications: {
      type: Boolean,
      default: true,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    taskAutoAssignment: {
      type: Boolean,
      default: false,
    },
    weeklyReports: {
      type: Boolean,
      default: true,
    },
    riskNotifications: {
      type: Boolean,
      default: true,
    },
  },

  // AI Data
  aiAnalysis: {
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex', 'very-complex'],
    },
    estimatedCompletion: Date,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    suggestions: [{
      type: String,
      category: String,
      priority: String,
    }],
    lastAnalyzed: Date,
  },

  // Analytics
  analytics: {
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    velocity: Number, // tasks completed per week
    qualityScore: Number, // 0-100
    teamSatisfaction: Number, // 0-100
    clientSatisfaction: Number, // 0-100
    budgetUtilization: Number, // percentage
    timeEfficiency: Number, // percentage
  },

  // Tags & Metadata
  tags: [String],
  industry: String,
  department: String,
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },

  // History & Audit
  history: [{
    action: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: Object,
  }],
  version: {
    type: Number,
    default: 1,
  },

  // Timestamps
  archivedAt: Date,
  completedAt: Date,
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
projectSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.deadline) return null;
  const duration = new Date(this.deadline) - new Date(this.startDate);
  return Math.ceil(duration / (1000 * 60 * 60 * 24)); // days
});

projectSchema.virtual('timeRemaining').get(function() {
  if (!this.deadline) return null;
  const now = new Date();
  const remaining = new Date(this.deadline) - now;
  return Math.ceil(remaining / (1000 * 60 * 60 * 24)); // days
});

projectSchema.virtual('isOverdue').get(function() {
  if (!this.deadline) return false;
  return new Date() > new Date(this.deadline) && this.status !== 'completed';
});

projectSchema.virtual('teamMembers').get(function() {
  return this.team.map(member => member.user);
});

projectSchema.virtual('completedTasks').get(function() {
  return this.tasks.filter(task => task.status === 'completed').length;
});

projectSchema.virtual('pendingTasks').get(function() {
  return this.tasks.filter(task => task.status !== 'completed').length;
});

// Middleware
projectSchema.pre('save', function(next) {
  // Calculate progress based on completed tasks
  if (this.tasks && this.tasks.length > 0) {
    const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
    this.analytics.progress = Math.round((completedTasks / this.tasks.length) * 100);
  }
  
  // Update version
  this.version += 1;
  next();
});

projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methods
projectSchema.methods.addTeamMember = function(userId, role = 'contributor') {
  if (!this.team.some(member => member.user.toString() === userId.toString())) {
    this.team.push({
      user: userId,
      role,
      joinedAt: new Date(),
    });
  }
  return this;
};

projectSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(member => member.user.toString() !== userId.toString());
  return this;
};

projectSchema.methods.updateTaskStatus = function(taskId, status) {
  const task = this.tasks.id(taskId);
  if (task) {
    task.status = status;
    task.updatedAt = new Date();
    
    // Add to history
    task.history.push({
      action: 'status_update',
      user: task.updatedBy || task.createdBy,
      timestamp: new Date(),
      changes: { status },
    });
  }
  return this;
};

projectSchema.methods.calculateMetrics = function() {
  const metrics = {
    totalTasks: this.tasks.length,
    completedTasks: this.tasks.filter(t => t.status === 'completed').length,
    inProgressTasks: this.tasks.filter(t => t.status === 'in-progress').length,
    blockedTasks: this.tasks.filter(t => t.status === 'blocked').length,
    
    totalEstimatedTime: this.tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0),
    totalActualTime: this.tasks.reduce((sum, task) => sum + (task.actualTime || 0), 0),
    
    overdueTasks: this.tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false;
      return new Date(task.dueDate) < new Date();
    }).length,
    
    highPriorityTasks: this.tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
  };
  
  // Calculate efficiency
  if (metrics.totalEstimatedTime > 0) {
    metrics.timeEfficiency = Math.round(
      (metrics.totalEstimatedTime / Math.max(metrics.totalActualTime, 1)) * 100
    );
  }
  
  return metrics;
};

// Static Methods
projectSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'team.user': userId },
    ],
  });
};

projectSchema.statics.findActiveProjects = function() {
  return this.find({
    status: { $in: ['planning', 'active'] },
  });
};

projectSchema.statics.findOverdueProjects = function() {
  return this.find({
    deadline: { $lt: new Date() },
    status: { $in: ['planning', 'active'] },
  });
};

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ 'team.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ deadline: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ 'analytics.progress': 1 });
projectSchema.index({ title: 'text', description: 'text' });

const Project = mongoose.model('Project', projectSchema);
const Task = mongoose.model('Task', taskSchema);

export { Project, Task };