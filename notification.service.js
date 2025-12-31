import { apiService } from './api';

class NotificationService {
  async getNotifications() {
    try {
      // In development, return mock data
      if (import.meta.env.DEV) {
        return await apiService.getMockData('/notifications');
      }
      
      return await apiService.getNotifications();
    } catch (error) {
      console.error('Get notifications error:', error);
      
      // Fallback to mock data in development
      if (import.meta.env.DEV) {
        return await apiService.getMockData('/notifications');
      }
      
      throw error;
    }
  }

  async markAsRead(notificationId) {
    try {
      return await apiService.markAsRead(notificationId);
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      return await apiService.markAllAsRead();
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      return await apiService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  async clearAll() {
    try {
      return await apiService.clearNotifications();
    } catch (error) {
      console.error('Clear notifications error:', error);
      throw error;
    }
  }

  async createNotification(notificationData) {
    try {
      const notification = {
        id: Date.now().toString(),
        ...notificationData,
        timestamp: new Date().toISOString(),
        read: false,
        priority: notificationData.priority || 'normal',
      };
      
      // In a real app, this would be sent to the server
      // For now, we'll simulate it
      console.log('Notification created:', notification);
      
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(notification);
        }, 100);
      });
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Real-time notification methods
  setupWebSocket(onMessage) {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL || 'ws://localhost:5000'}/notifications?token=${token}`
    );
    
    ws.onopen = () => {
      console.log('WebSocket connected for notifications');
    };
    
    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        if (onMessage) {
          onMessage(notification);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return ws;
  }

  // Push notification methods
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }

  async sendPushNotification(title, options = {}) {
    const hasPermission = await this.requestNotificationPermission();
    
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [200, 100, 200],
        ...options,
      });
      
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Email notification methods (simulated)
  async sendEmailNotification(email, subject, template, data = {}) {
    try {
      // This would call your email service API
      console.log(`Sending email to ${email}: ${subject}`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, message: 'Email sent successfully' });
        }, 500);
      });
    } catch (error) {
      console.error('Send email notification error:', error);
      throw error;
    }
  }

  // SMS notification methods (simulated)
  async sendSMSNotification(phone, message) {
    try {
      // This would call your SMS service API
      console.log(`Sending SMS to ${phone}: ${message}`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, message: 'SMS sent successfully' });
        }, 500);
      });
    } catch (error) {
      console.error('Send SMS notification error:', error);
      throw error;
    }
  }

  // Create different types of notifications
  async createProjectNotification(projectId, type, data) {
    const messages = {
      'task-assigned': {
        title: 'New Task Assigned',
        message: `You have been assigned to "${data.taskTitle}" in project "${data.projectTitle}"`,
        type: 'info',
        priority: 'normal',
      },
      'deadline-approaching': {
        title: 'Deadline Approaching',
        message: `Project "${data.projectTitle}" deadline is in ${data.days} days`,
        type: 'warning',
        priority: 'high',
      },
      'milestone-reached': {
        title: 'Milestone Reached',
        message: `Project "${data.projectTitle}" reached milestone: ${data.milestone}`,
        type: 'success',
        priority: 'normal',
      },
      'risk-identified': {
        title: 'Risk Identified',
        message: `New risk identified in project "${data.projectTitle}": ${data.risk}`,
        type: 'error',
        priority: 'high',
      },
    };
    
    const notificationData = messages[type];
    if (!notificationData) {
      throw new Error(`Unknown notification type: ${type}`);
    }
    
    return this.createNotification({
      ...notificationData,
      projectId,
      data,
    });
  }

  // Get notification statistics
  async getNotificationStats() {
    try {
      const notifications = await this.getNotifications();
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        read: notifications.filter(n => n.read).length,
        byType: {
          info: notifications.filter(n => n.type === 'info').length,
          success: notifications.filter(n => n.type === 'success').length,
          warning: notifications.filter(n => n.type === 'warning').length,
          error: notifications.filter(n => n.type === 'error').length,
        },
        byPriority: {
          low: notifications.filter(n => n.priority === 'low').length,
          normal: notifications.filter(n => n.priority === 'normal').length,
          high: notifications.filter(n => n.priority === 'high').length,
          critical: notifications.filter(n => n.priority === 'critical').length,
        },
      };
      
      return stats;
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();