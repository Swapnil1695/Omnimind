import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  // Entity Reference
  entityType: {
    type: String,
    enum: ['user', 'project', 'task', 'ai', 'platform', 'ad'],
    required: true,
    index: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Time Period
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
    index: true,
  },
  endDate: {
    type: Date,
    required: true,
  },

  // User Analytics
  userMetrics: {
    activeDays: {
      type: Number,
      default: 0,
    },
    sessions: {
      count: {
        type: Number,
        default: 0,
      },
      averageDuration: Number, // minutes
      totalDuration: Number, // minutes
    },
    featureUsage: {
      projectsCreated: Number,
      tasksCompleted: Number,
      meetingsScheduled: Number,
      aiInteractions: Number,
      notificationsReceived: Number,
      errorsResolved: Number,
    },
    productivity: {
      focusTime: Number, // minutes
      completedTasks: Number,
      timeSaved: Number, // minutes
      efficiencyScore: Number, // 0-100
    },
    engagement: {
      logins: Number,
      interactions: Number,
      retentionRate: Number, // percentage
      churnRisk: Number, // 0-100
    },
  },

  // Project Analytics
  projectMetrics: {
    progress: {
      current: Number, // percentage
      trend: Number, // percentage change
      velocity: Number, // tasks per day
    },
    timeline: {
      estimatedCompletion: Date,
      actualCompletion: Date,
      delay: Number, // days
      bufferUsed: Number, // percentage
    },
    quality: {
      bugCount: Number,
      reviewScore: Number, // 0-100
      clientSatisfaction: Number, // 0-100
      teamSatisfaction: Number, // 0-100
    },
    resources: {
      budgetUsed: Number, // percentage
      timeSpent: Number, // hours
      teamUtilization: Number, // percentage
      costEfficiency: Number, // 0-100
    },
  },

  // AI Analytics
  aiMetrics: {
    usage: {
      totalRequests: Number,
      successfulRequests: Number,
      failedRequests: Number,
      averageResponseTime: Number, // milliseconds
    },
    accuracy: {
      correctPredictions: Number,
      totalPredictions: Number,
      accuracyRate: Number, // percentage
    },
    learning: {
      newPatternsLearned: Number,
      modelImprovements: Number,
      feedbackReceived: Number,
    },
    cost: {
      totalCost: Number, // USD
      costPerRequest: Number,
      monthlyEstimate: Number,
    },
  },

  // Platform Analytics
  platformMetrics: {
    performance: {
      uptime: Number, // percentage
      responseTime: Number, // milliseconds
      errorRate: Number, // percentage
    },
    usage: {
      activeUsers: Number,
      newUsers: Number,
      returningUsers: Number,
      concurrentUsers: Number,
    },
    growth: {
      userGrowth: Number, // percentage
      revenueGrowth: Number, // percentage
      featureAdoption: Number, // percentage
    },
    technical: {
      apiCalls: Number,
      dataProcessed: Number, // GB
      storageUsed: Number, // GB
    },
  },

  // Advertising Analytics
  adMetrics: {
    impressions: {
      total: Number,
      unique: Number,
      frequency: Number, // average per user
    },
    clicks: {
      total: Number,
      unique: Number,
      ctr: Number, // percentage
    },
    engagement: {
      timeSpent: Number, // seconds
      conversions: Number,
      conversionRate: Number, // percentage
    },
    revenue: {
      total: Number, // USD
      cpm: Number, // cost per mille
      cpc: Number, // cost per click
      cpa: Number, // cost per action
    },
  },

  // Error Analytics
  errorMetrics: {
    detection: {
      totalErrors: Number,
      autoDetected: Number,
      userReported: Number,
    },
    resolution: {
      autoFixed: Number,
      manuallyFixed: Number,
      pending: Number,
    },
    impact: {
      downtime: Number, // minutes
      affectedUsers: Number,
      costImpact: Number, // USD
    },
    trends: {
      errorRate: Number, // percentage
      resolutionTime: Number, // minutes
      recurrenceRate: Number, // percentage
    },
  },

  // Custom Metrics
  customMetrics: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },

  // Comparative Data
  benchmarks: {
    industryAverage: mongoose.Schema.Types.Mixed,
    previousPeriod: mongoose.Schema.Types.Mixed,
    goals: mongoose.Schema.Types.Mixed,
  },

  // Insights
  insights: [{
    type: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'opportunity', 'risk'],
    },
    title: String,
    description: String,
    impact: Number, // -10 to 10
    confidence: Number, // 0-100
    recommendations: [String],
  }],

  // Metadata
  metadata: {
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculationMethod: String,
    dataSources: [String],
    sampleSize: Number,
    confidenceInterval: Number,
    tags: [String],
  },

  // Timestamps
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
analyticsSchema.virtual('dateRange').get(function() {
  return {
    start: this.startDate,
    end: this.endDate,
    duration: Math.round((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)), // days
  };
});

analyticsSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

analyticsSchema.virtual('keyMetrics').get(function() {
  switch (this.entityType) {
    case 'user':
      return {
        productivity: this.userMetrics.productivity.efficiencyScore,
        engagement: this.userMetrics.engagement.retentionRate,
        timeSaved: this.userMetrics.productivity.timeSaved,
      };
    case 'project':
      return {
        progress: this.projectMetrics.progress.current,
        timelineDelay: this.projectMetrics.timeline.delay,
        budgetUsed: this.projectMetrics.resources.budgetUsed,
      };
    case 'ai':
      return {
        accuracy: this.aiMetrics.accuracy.accuracyRate,
        responseTime: this.aiMetrics.usage.averageResponseTime,
        cost: this.aiMetrics.cost.totalCost,
      };
    case 'platform':
      return {
        uptime: this.platformMetrics.performance.uptime,
        activeUsers: this.platformMetrics.usage.activeUsers,
        errorRate: this.platformMetrics.performance.errorRate,
      };
    case 'ad':
      return {
        ctr: this.adMetrics.clicks.ctr,
        revenue: this.adMetrics.revenue.total,
        conversions: this.adMetrics.engagement.conversions,
      };
    default:
      return {};
  }
});

// Indexes
analyticsSchema.index({ entityType: 1, entityId: 1, period: 1, startDate: -1 });
analyticsSchema.index({ 'userMetrics.productivity.efficiencyScore': -1 });
analyticsSchema.index({ 'projectMetrics.progress.current': -1 });
analyticsSchema.index({ 'aiMetrics.accuracy.accuracyRate': -1 });
analyticsSchema.index({ 'platformMetrics.usage.activeUsers': -1 });
analyticsSchema.index({ 'adMetrics.revenue.total': -1 });
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ startDate: 1, endDate: 1 });

// Middleware
analyticsSchema.pre('save', function(next) {
  // Calculate derived metrics
  if (this.userMetrics) {
    const sessions = this.userMetrics.sessions;
    if (sessions.count > 0) {
      sessions.averageDuration = sessions.totalDuration / sessions.count;
    }
    
    const engagement = this.userMetrics.engagement;
    if (engagement.logins > 0) {
      engagement.retentionRate = (engagement.interactions / engagement.logins) * 100;
    }
  }
  
  if (this.projectMetrics) {
    const timeline = this.projectMetrics.timeline;
    if (timeline.actualCompletion && timeline.estimatedCompletion) {
      timeline.delay = Math.round(
        (timeline.actualCompletion - timeline.estimatedCompletion) / (1000 * 60 * 60 * 24)
      );
    }
  }
  
  if (this.aiMetrics) {
    const usage = this.aiMetrics.usage;
    if (usage.totalRequests > 0) {
      usage.successRate = (usage.successfulRequests / usage.totalRequests) * 100;
    }
    
    const accuracy = this.aiMetrics.accuracy;
    if (accuracy.totalPredictions > 0) {
      accuracy.accuracyRate = (accuracy.correctPredictions / accuracy.totalPredictions) * 100;
    }
  }
  
  if (this.adMetrics) {
    const clicks = this.adMetrics.clicks;
    if (clicks.total > 0 && this.adMetrics.impressions.total > 0) {
      clicks.ctr = (clicks.total / this.adMetrics.impressions.total) * 100;
    }
    
    const engagement = this.adMetrics.engagement;
    if (engagement.conversions > 0 && clicks.total > 0) {
      engagement.conversionRate = (engagement.conversions / clicks.total) * 100;
    }
  }
  
  if (this.errorMetrics) {
    const detection = this.errorMetrics.detection;
    if (detection.totalErrors > 0) {
      detection.autoDetectionRate = (detection.autoDetected / detection.totalErrors) * 100;
    }
    
    const resolution = this.errorMetrics.resolution;
    if (detection.totalErrors > 0) {
      resolution.autoFixRate = (resolution.autoFixed / detection.totalErrors) * 100;
    }
  }
  
  this.updatedAt = new Date();
  next();
});

// Methods
analyticsSchema.methods.calculateTrend = function(previousAnalytics) {
  if (!previousAnalytics) return null;
  
  const trends = {};
  const currentMetrics = this.toObject();
  const previousMetrics = previousAnalytics.toObject();
  
  // Compare key metrics
  const metricPaths = [
    'userMetrics.productivity.efficiencyScore',
    'userMetrics.engagement.retentionRate',
    'projectMetrics.progress.current',
    'aiMetrics.accuracy.accuracyRate',
    'platformMetrics.usage.activeUsers',
    'adMetrics.revenue.total',
  ];
  
  metricPaths.forEach(path => {
    const currentValue = getNestedValue(currentMetrics, path);
    const previousValue = getNestedValue(previousMetrics, path);
    
    if (currentValue !== undefined && previousValue !== undefined && previousValue !== 0) {
      const change = ((currentValue - previousValue) / previousValue) * 100;
      setNestedValue(trends, path, {
        current: currentValue,
        previous: previousValue,
        change: parseFloat(change.toFixed(2)),
        direction: change >= 0 ? 'up' : 'down',
      });
    }
  });
  
  return trends;
};

analyticsSchema.methods.generateReport = function() {
  const report = {
    period: this.period,
    dateRange: this.dateRange,
    keyMetrics: this.keyMetrics,
    insights: this.insights,
    calculatedAt: this.metadata.calculatedAt,
  };
  
  // Add entity-specific details
  switch (this.entityType) {
    case 'user':
      report.summary = `User was active for ${this.userMetrics.activeDays} days with ${this.userMetrics.sessions.count} sessions.`;
      break;
    case 'project':
      report.summary = `Project is ${this.projectMetrics.progress.current}% complete with ${this.projectMetrics.timeline.delay || 0} days delay.`;
      break;
    case 'ai':
      report.summary = `AI had ${this.aiMetrics.usage.totalRequests} requests with ${this.aiMetrics.accuracy.accuracyRate}% accuracy.`;
      break;
    case 'platform':
      report.summary = `Platform had ${this.platformMetrics.usage.activeUsers} active users with ${this.platformMetrics.performance.uptime}% uptime.`;
      break;
    case 'ad':
      report.summary = `Ads generated $${this.adMetrics.revenue.total} revenue with ${this.adMetrics.clicks.ctr}% CTR.`;
      break;
  }
  
  return report;
};

// Static Methods
analyticsSchema.statics.findByEntity = function(entityType, entityId, period = 'daily', limit = 30) {
  return this.find({
    entityType,
    entityId,
    period,
  })
  .sort({ startDate: -1 })
  .limit(limit);
};

analyticsSchema.statics.findCurrentPeriod = function(entityType, entityId, period) {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'weekly':
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return this.findOne({
    entityType,
    entityId,
    period,
    startDate: { $lte: startDate },
    endDate: { $gte: endDate },
  });
};

analyticsSchema.statics.calculateAggregates = function(entityType, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        entityType,
        startDate: { $gte: startDate },
        endDate: { $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: { $cond: [{ $eq: ['$entityType', 'user'] }, 1, 0] } },
        totalProjects: { $sum: { $cond: [{ $eq: ['$entityType', 'project'] }, 1, 0] } },
        totalRevenue: { $sum: '$adMetrics.revenue.total' },
        avgProductivity: { $avg: '$userMetrics.productivity.efficiencyScore' },
        avgProgress: { $avg: '$projectMetrics.progress.current' },
        totalAiRequests: { $sum: '$aiMetrics.usage.totalRequests' },
        platformUptime: { $avg: '$platformMetrics.performance.uptime' },
      },
    },
  ]);
};

// Helper functions
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;