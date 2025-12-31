const analyticsService = require('../services/analytics.service');
const { validationResult } = require('express-validator');

class AnalyticsController {
  async trackActivity(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { activityType, metadata } = req.body;
      const userId = req.user.id;

      await analyticsService.trackUserActivity(userId, activityType, metadata);
      
      res.json({ success: true, message: 'Activity tracked successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getProductivity(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user.id;

      const productivity = await analyticsService.getUserProductivity(
        userId,
        new Date(startDate),
        new Date(endDate || new Date())
      );

      res.json(productivity);
    } catch (error) {
      next(error);
    }
  }

  async getPlatformStats(req, res, next) {
    try {
      const { timeframe } = req.query;
      const stats = await analyticsService.getPlatformAnalytics(timeframe || 'month');
      
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getPredictiveInsights(req, res, next) {
    try {
      const userId = req.user.id;
      const insights = await analyticsService.generatePredictiveInsights(userId);
      
      res.json(insights);
    } catch (error) {
      next(error);
    }
  }

  async getAdPerformance(req, res, next) {
    try {
      const userId = req.user.id;
      const performance = await analyticsService.getAdPerformance(userId);
      
      res.json(performance);
    } catch (error) {
      next(error);
    }
  }

  async getUserGrowth(req, res, next) {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const usersSnapshot = await req.app.locals.db
        .collection('users')
        .where('createdAt', '>=', startDate)
        .get();

      const growthData = [];
      let cumulative = 0;
      
      // Group by day
      const dayMap = new Map();
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        const date = user.createdAt.toDate().toISOString().split('T')[0];
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });

      // Create cumulative data
      const sortedDates = Array.from(dayMap.keys()).sort();
      sortedDates.forEach(date => {
        cumulative += dayMap.get(date);
        growthData.push({
          date,
          newUsers: dayMap.get(date),
          totalUsers: cumulative
        });
      });

      res.json({
        timeframe: `${days} days`,
        totalGrowth: cumulative,
        averageDailyGrowth: cumulative / days,
        data: growthData
      });
    } catch (error) {
      next(error);
    }
  }

  async getHeatmapData(req, res, next) {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.query;
      
      const activities = await analyticsService.getUserActivities(userId, parseInt(days));
      
      // Create heatmap data
      const heatmap = {};
      activities.forEach(activity => {
        const hour = activity.timestamp.getHours();
        const day = activity.timestamp.getDay();
        
        if (!heatmap[day]) heatmap[day] = {};
        heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
      });

      res.json(heatmap);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();