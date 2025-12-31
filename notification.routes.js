import express from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Notification management
router.get('/', notificationController.getNotifications);
router.get('/unread', notificationController.getUnreadNotifications);
router.get('/:id', notificationController.getNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/:id/unread', notificationController.markAsUnread);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/', notificationController.clearAllNotifications);

// Notification preferences
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);
router.post('/preferences/channels', notificationController.updateChannelPreferences);

// Real-time notifications (WebSocket endpoint)
router.post('/subscribe', notificationController.subscribeToPush);

// Notification templates (admin only)
router.get('/templates', notificationController.getTemplates);
router.post('/templates', notificationController.createTemplate);
router.put('/templates/:id', notificationController.updateTemplate);
router.delete('/templates/:id', notificationController.deleteTemplate);

export default router;