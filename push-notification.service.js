import webpush from 'web-push';
import admin from 'firebase-admin';
import { Expo } from 'expo-server-sdk';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class PushNotificationService {
  constructor() {
    this.expo = null;
    this.firebaseAdmin = null;
    this.initialized = false;
    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Initialize VAPID for Web Push
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT,
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        logger.info('✅ Web Push VAPID initialized');
      }

      // Initialize Firebase Admin for FCM
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          this.firebaseAdmin = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          logger.info('✅ Firebase Admin initialized');
        } catch (error) {
          logger.warn('Failed to initialize Firebase Admin:', error.message);
        }
      }

      // Initialize Expo
      if (process.env.EXPO_ACCESS_TOKEN) {
        this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
        logger.info('✅ Expo SDK initialized');
      }

      this.initialized = true;
      logger.info('✅ Push Notification Service ready');
    } catch (error) {
      logger.error('❌ Error initializing push services:', error);
    }
  }

  async sendPushNotification(subscription, payload) {
    const {
      title,
      body,
      data = {},
      icon = '/icons/icon-192x192.png',
      badge = 1,
      tag = 'omnimind-notification',
      requireInteraction = false,
      silent = false,
      ttl = 24 * 60 * 60, // 24 hours
      urgency = 'normal',
    } = payload;

    if (!subscription || !subscription.endpoint) {
      throw new AppError('Invalid push subscription', 400);
    }

    try {
      // Determine platform and send accordingly
      const platform = this.detectPlatform(subscription.endpoint);
      
      let result;
      switch (platform) {
        case 'fcm':
          result = await this.sendViaFCM(subscription, {
            title,
            body,
            data,
            icon,
            badge,
            tag,
          });
          break;

        case 'expo':
          result = await this.sendViaExpo(subscription, {
            title,
            body,
            data,
            sound: silent ? false : 'default',
            badge,
          });
          break;

        case 'web':
          result = await this.sendViaWebPush(subscription, {
            title,
            body,
            icon,
            badge,
            data,
            tag,
            requireInteraction,
            silent,
            ttl,
            urgency,
          });
          break;

        default:
          throw new AppError(`Unsupported push platform: ${platform}`, 400);
      }

      logger.info(`📱 Push notification sent via ${platform}: ${title}`);
      return {
        success: true,
        platform,
        messageId: result.messageId,
        status: result.status,
      };
    } catch (error) {
      logger.error('❌ Error sending push notification:', error);
      
      // Check if subscription is expired/invalid
      if (error.statusCode === 410 || error.code === 'registration-token-not-registered') {
        return {
          success: false,
          error: 'Subscription expired',
          shouldRemove: true,
        };
      }
      
      throw error;
    }
  }

  async sendViaWebPush(subscription, payload) {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      timestamp: Date.now(),
    });

    const options = {
      TTL: payload.ttl,
      urgency: payload.urgency,
    };

    try {
      const result = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        pushPayload,
        options
      );

      return {
        messageId: result.headers['location'] || Date.now().toString(),
        status: result.statusCode,
        headers: result.headers,
      };
    } catch (error) {
      // Handle specific webpush errors
      if (error.statusCode) {
        error.statusCode = error.statusCode;
      }
      throw error;
    }
  }

  async sendViaFCM(subscription, payload) {
    if (!this.firebaseAdmin) {
      throw new AppError('Firebase Admin not initialized', 500);
    }

    const token = this.extractFCMToken(subscription.endpoint);
    if (!token) {
      throw new AppError('Invalid FCM token', 400);
    }

    const message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      android: {
        notification: {
          icon: payload.icon,
          sound: 'default',
          tag: payload.tag,
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            badge: payload.badge,
            sound: 'default',
          },
        },
      },
      webpush: {
        notification: {
          icon: payload.icon,
          badge: payload.icon,
          tag: payload.tag,
        },
      },
      data: payload.data,
    };

    try {
      const response = await this.firebaseAdmin.messaging().send(message);
      return {
        messageId: response,
        status: 'success',
      };
    } catch (error) {
      // Map Firebase errors
      if (error.code === 'messaging/registration-token-not-registered') {
        error.statusCode = 410; // Gone
      }
      throw error;
    }
  }

  async sendViaExpo(subscription, payload) {
    if (!this.expo) {
      throw new AppError('Expo SDK not initialized', 500);
    }

    const token = this.extractExpoToken(subscription.endpoint);
    if (!Expo.isExpoPushToken(token)) {
      throw new AppError('Invalid Expo push token', 400);
    }

    const message = {
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound,
      badge: payload.badge,
      channelId: 'omnimind-notifications',
      priority: 'high',
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket.status === 'error') {
        const error = new AppError(ticket.message, 400);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          error.statusCode = 410; // Gone
        }
        throw error;
      }

      return {
        messageId: ticket.id,
        status: ticket.status,
      };
    } catch (error) {
      throw error;
    }
  }

  async sendToMultiple(subscriptions, payload) {
    const results = [];
    const failedSubscriptions = [];

    for (const subscription of subscriptions) {
      try {
        const result = await this.sendPushNotification(subscription, payload);
        results.push({
          subscriptionId: subscription.id,
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message,
          shouldRemove: error.statusCode === 410,
        });

        if (error.statusCode === 410) {
          failedSubscriptions.push(subscription.id);
        }
      }
    }

    return {
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      failedSubscriptions,
    };
  }

  async sendCriticalAlert(userId, alert) {
    // Get user's push subscriptions
    const subscriptions = await this.getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      return { success: false, error: 'No push subscriptions found' };
    }

    const payload = {
      title: `🚨 ${alert.title}`,
      body: alert.message,
      data: {
        type: 'critical-alert',
        alertId: alert.id,
        actionUrl: alert.actionUrl,
        timestamp: new Date().toISOString(),
      },
      requireInteraction: true,
      urgency: 'high',
      ttl: 60 * 60, // 1 hour
      badge: 99, // High badge count
    };

    return this.sendToMultiple(subscriptions, payload);
  }

  async sendTaskNotification(userId, task, action) {
    const subscriptions = await this.getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) return;

    const actionMap = {
      'created': 'created',
      'updated': 'updated',
      'assigned': 'assigned to you',
      'completed': 'completed',
      'due_soon': 'due soon',
    };

    const payload = {
      title: `📋 Task ${actionMap[action] || 'updated'}`,
      body: `"${task.title}" ${task.projectTitle ? `in ${task.projectTitle}` : ''}`,
      data: {
        type: 'task',
        taskId: task.id,
        projectId: task.projectId,
        action: action,
        taskUrl: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
      },
      icon: '/icons/task.png',
      tag: `task-${task.id}`,
    };

    return this.sendToMultiple(subscriptions, payload);
  }

  async sendProjectNotification(userId, project, action) {
    const subscriptions = await this.getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) return;

    const payload = {
      title: `📊 Project ${action}`,
      body: `"${project.title}" has been ${action}`,
      data: {
        type: 'project',
        projectId: project.id,
        action: action,
        projectUrl: `${process.env.FRONTEND_URL}/projects/${project.id}`,
      },
      icon: '/icons/project.png',
      tag: `project-${project.id}`,
    };

    return this.sendToMultiple(subscriptions, payload);
  }

  async sendMeetingReminder(userId, meeting) {
    const subscriptions = await this.getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) return;

    const startTime = new Date(meeting.startTime);
    const timeString = startTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const payload = {
      title: `📅 Meeting in ${meeting.minutesUntil} minutes`,
      body: `"${meeting.title}" at ${timeString}`,
      data: {
        type: 'meeting',
        meetingId: meeting.id,
        joinUrl: meeting.joinUrl,
        startTime: meeting.startTime,
      },
      icon: '/icons/meeting.png',
      requireInteraction: true,
      tag: `meeting-${meeting.id}`,
    };

    return this.sendToMultiple(subscriptions, payload);
  }

  detectPlatform(endpoint) {
    if (endpoint.includes('fcm.googleapis.com')) {
      return 'fcm';
    } else if (endpoint.includes('exp.host') || endpoint.includes('expo.io')) {
      return 'expo';
    } else if (endpoint.includes('wns.windows.com')) {
      return 'windows';
    } else if (endpoint.includes('push.apple.com')) {
      return 'apns';
    } else {
      return 'web';
    }
  }

  extractFCMToken(endpoint) {
    // Extract token from FCM endpoint
    const match = endpoint.match(/fcm\/send\/(.+)$/);
    return match ? match[1] : null;
  }

  extractExpoToken(endpoint) {
    // Extract token from Expo endpoint
    const match = endpoint.match(/\/push\/v2\/exponent\/push\/(.+)$/);
    return match ? match[1] : endpoint;
  }

  async getUserSubscriptions(userId) {
    // This would typically query your database
    // For now, return empty array
    return [];
  }

  createSubscriptionObject(userId, subscriptionData) {
    const { endpoint, keys, platform } = subscriptionData;
    
    return {
      userId,
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      platform: platform || this.detectPlatform(endpoint),
      userAgent: subscriptionData.userAgent,
      language: subscriptionData.language,
      createdAt: new Date(),
      lastUsed: new Date(),
    };
  }

  validateSubscription(subscription) {
    if (!subscription || !subscription.endpoint) {
      return false;
    }

    if (subscription.keys) {
      if (!subscription.keys.p256dh || !subscription.keys.auth) {
        return false;
      }
    }

    return true;
  }

  async getServiceStatus() {
    const status = {
      webPush: !!process.env.VAPID_PUBLIC_KEY,
      fcm: !!this.firebaseAdmin,
      expo: !!this.expo,
      initialized: this.initialized,
    };

    // Test each service
    if (status.webPush) {
      status.webPushTest = await this.testWebPush();
    }

    if (status.fcm) {
      status.fcmTest = await this.testFCM();
    }

    if (status.expo) {
      status.expoTest = await this.testExpo();
    }

    return status;
  }

  async testWebPush() {
    try {
      // Test with dummy subscription
      const testSubscription = {
        endpoint: 'https://example.com/test',
        keys: {
          p256dh: 'test',
          auth: 'test',
        },
      };

      await webpush.sendNotification(testSubscription, 'test');
      return { success: true };
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Expected error for invalid endpoint
        return { success: true, note: 'VAPID configured' };
      }
      return { success: false, error: error.message };
    }
  }

  async testFCM() {
    try {
      if (!this.firebaseAdmin) {
        return { success: false, error: 'Firebase Admin not initialized' };
      }
      
      // Verify Firebase app is initialized
      const app = this.firebaseAdmin.app();
      return { 
        success: true, 
        appName: app.name,
        projectId: app.options.projectId,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testExpo() {
    try {
      if (!this.expo) {
        return { success: false, error: 'Expo SDK not initialized' };
      }
      
      // Test Expo token validation
      const isValid = Expo.isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
      return { success: true, tokenValidation: isValid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new PushNotificationService();