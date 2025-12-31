const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth');
const { body, query } = require('express-validator');

// Track user activity
router.post(
  '/track',
  authenticate,
  [
    body('activityType').notEmpty().withMessage('Activity type is required'),
    body('metadata').optional().isObject()
  ],
  analyticsController.trackActivity
);

// Get user productivity
router.get(
  '/productivity',
  authenticate,
  [
    query('startDate').isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  analyticsController.getProductivity
);

// Get platform statistics
router.get(
  '/platform',
  authenticate,
  [
    query('timeframe').optional().isIn(['day', 'week', 'month', 'year'])
  ],
  analyticsController.getPlatformStats
);

// Get predictive insights
router.get(
  '/insights',
  authenticate,
  analyticsController.getPredictiveInsights
);

// Get ad performance
router.get(
  '/ads/performance',
  authenticate,
  analyticsController.getAdPerformance
);

// Get user growth analytics
router.get(
  '/growth',
  authenticate,
  [
    query('days').optional().isInt({ min: 1, max: 365 })
  ],
  analyticsController.getUserGrowth
);

// Get activity heatmap data
router.get(
  '/heatmap',
  authenticate,
  [
    query('days').optional().isInt({ min: 1, max: 30 })
  ],
  analyticsController.getHeatmapData
);

module.exports = router;