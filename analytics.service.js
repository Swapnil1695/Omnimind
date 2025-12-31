const { db } = require('../config/database');
const { logger } = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.collection = db.collection('analytics');
  }

  async trackUserActivity(userId, activityType, metadata = {}) {
    try {
      const activity = {
        userId,
        activityType,
        metadata,
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0]
      };

      await this.collection.add(activity);
      logger.info(`Activity tracked: ${activityType} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error tracking activity:', error);
      throw error;
    }
  }

  async getUserProductivity(userId, startDate, endDate) {
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .get();

      const activities = [];
      snapshot.forEach(doc => activities.push(doc.data()));

      // Calculate productivity metrics
      const productiveHours = activities
        .filter(a => a.activityType === 'task_completed' || a.activityType === 'focus_time')
        .reduce((sum, a) => sum + (a.metadata.duration || 1), 0);

      const distractedHours = activities
        .filter(a => a.activityType === 'distraction' || a.activityType === 'break')
        .reduce((sum, a) => sum + (a.metadata.duration || 1), 0);

      const totalTasks = activities.filter(a => a.activityType === 'task_completed').length;
      const completedProjects = activities.filter(a => a.activityType === 'project_completed').length;

      return {
        productiveHours,
        distractedHours,
        totalTasks,
        completedProjects,
        productivityScore: Math.round((productiveHours / (productiveHours + distractedHours)) * 100) || 0,
        weeklyTrend: this.calculateWeeklyTrend(activities)
      };
    } catch (error) {
      logger.error('Error getting user productivity:', error);
      throw error;
    }
  }

  async getPlatformAnalytics(timeframe = 'month') {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch(timeframe) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Get user growth
      const usersSnapshot = await db.collection('users')
        .where('createdAt', '>=', startDate)
        .get();
      const newUsers = usersSnapshot.size;

      // Get project statistics
      const projectsSnapshot = await db.collection('projects')
        .where('createdAt', '>=', startDate)
        .get();
      
      const projects = [];
      projectsSnapshot.forEach(doc => projects.push(doc.data()));

      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const revenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);

      // Get AI usage
      const aiInteractions = await this.collection
        .where('activityType', '==', 'ai_interaction')
        .where('timestamp', '>=', startDate)
        .get();

      return {
        newUsers,
        activeUsers: await this.getActiveUsersCount(startDate),
        activeProjects,
        completedProjects,
        totalTasks: projects.reduce((sum, p) => sum + (p.taskCount || 0), 0),
        aiInteractions: aiInteractions.size,
        revenue,
        averageProductivity: await this.getAverageProductivity(startDate)
      };
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  async generatePredictiveInsights(userId) {
    try {
      const userActivities = await this.getUserActivities(userId, 30);
      const userProjects = await this.getUserProjects(userId);

      // AI-powered insights
      const insights = {
        peakProductivityHours: this.calculatePeakHours(userActivities),
        riskFactors: this.identifyRiskFactors(userProjects),
        optimizationOpportunities: this.findOptimizationOpportunities(userActivities),
        predictedBurnout: this.predictBurnoutRisk(userActivities),
        recommendedActions: this.generateRecommendations(userActivities)
      };

      await this.collection.add({
        userId,
        type: 'predictive_insights',
        insights,
        generatedAt: new Date()
      });

      return insights;
    } catch (error) {
      logger.error('Error generating predictive insights:', error);
      throw error;
    }
  }

  async getAdPerformance(userId) {
    try {
      const adsSnapshot = await db.collection('ad_impressions')
        .where('userId', '==', userId)
        .get();

      const ads = [];
      adsSnapshot.forEach(doc => ads.push(doc.data()));

      const clicks = ads.filter(a => a.action === 'click').length;
      const impressions = ads.length;
      const revenue = ads.reduce((sum, a) => sum + (a.revenue || 0), 0);

      return {
        impressions,
        clicks,
        clickThroughRate: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : 0,
        revenue,
        topPerformingAds: this.getTopPerformingAds(ads)
      };
    } catch (error) {
      logger.error('Error getting ad performance:', error);
      throw error;
    }
  }

  // Helper methods
  calculateWeeklyTrend(activities) {
    // Implementation for trend calculation
    return 'improving';
  }

  async getActiveUsersCount(since) {
    const snapshot = await this.collection
      .where('timestamp', '>=', since)
      .where('activityType', 'in', ['login', 'task_completed', 'project_updated'])
      .get();
    
    const uniqueUsers = new Set();
    snapshot.forEach(doc => uniqueUsers.add(doc.data().userId));
    return uniqueUsers.size;
  }

  async getUserActivities(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .get();

    const activities = [];
    snapshot.forEach(doc => activities.push(doc.data()));
    return activities;
  }

  async getUserProjects(userId) {
    const snapshot = await db.collection('projects')
      .where('userId', '==', userId)
      .get();

    const projects = [];
    snapshot.forEach(doc => projects.push(doc.data()));
    return projects;
  }

  calculatePeakHours(activities) {
    // Implementation for peak hour calculation
    return ['09:00-11:00', '14:00-16:00'];
  }

  identifyRiskFactors(projects) {
    // Implementation for risk factor identification
    return projects.filter(p => p.riskScore > 70).map(p => ({
      projectId: p.id,
      riskScore: p.riskScore,
      factors: p.riskFactors || []
    }));
  }

  findOptimizationOpportunities(activities) {
    // Implementation for finding optimization opportunities
    return [
      'Schedule meetings in the morning',
      'Reduce context switching',
      'Automate repetitive tasks'
    ];
  }

  predictBurnoutRisk(activities) {
    // Implementation for burnout prediction
    const workHours = activities
      .filter(a => a.activityType === 'work_session')
      .reduce((sum, a) => sum + (a.metadata.duration || 0), 0);
    
    return workHours > 50 ? 'High' : workHours > 40 ? 'Medium' : 'Low';
  }

  generateRecommendations(activities) {
    // Implementation for generating AI recommendations
    return [
      { action: 'Take regular breaks', priority: 'high' },
      { action: 'Delegate 2 low-priority tasks', priority: 'medium' },
      { action: 'Schedule focus time blocks', priority: 'high' }
    ];
  }

  getTopPerformingAds(ads) {
    const adPerformance = {};
    ads.forEach(ad => {
      if (!adPerformance[ad.adId]) {
        adPerformance[ad.adId] = { impressions: 0, clicks: 0, revenue: 0 };
      }
      adPerformance[ad.adId].impressions++;
      if (ad.action === 'click') {
        adPerformance[ad.adId].clicks++;
      }
      adPerformance[ad.adId].revenue += ad.revenue || 0;
    });

    return Object.entries(adPerformance)
      .map(([adId, stats]) => ({
        adId,
        ...stats,
        ctr: (stats.clicks / stats.impressions * 100).toFixed(2)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  async getAverageProductivity(since) {
    const usersSnapshot = await db.collection('users').get();
    let totalScore = 0;
    let count = 0;

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      try {
        const productivity = await this.getUserProductivity(userId, since, new Date());
        totalScore += productivity.productivityScore;
        count++;
      } catch (error) {
        // Skip users with no data
      }
    }

    return count > 0 ? Math.round(totalScore / count) : 0;
  }
}

module.exports = new AnalyticsService();