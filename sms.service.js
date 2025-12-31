import twilio from 'twilio';
import axios from 'axios';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class SMSService {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  initializeProviders() {
    // Twilio provider
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      this.providers.set('twilio', {
        name: 'Twilio',
        client: twilioClient,
        from: process.env.TWILIO_PHONE_NUMBER,
        priority: 1,
        enabled: true,
      });
    }

    // Vonage (Nexmo) provider
    if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
      this.providers.set('vonage', {
        name: 'Vonage',
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
        from: process.env.VONAGE_FROM_NUMBER,
        priority: 2,
        enabled: true,
      });
    }

    // MessageBird provider
    if (process.env.MESSAGEBIRD_API_KEY) {
      this.providers.set('messagebird', {
        name: 'MessageBird',
        apiKey: process.env.MESSAGEBIRD_API_KEY,
        from: process.env.MESSAGEBIRD_FROM_NUMBER,
        priority: 3,
        enabled: true,
      });
    }

    logger.info(`✅ Initialized ${this.providers.size} SMS providers`);
  }

  async sendSMS(options) {
    const {
      to,
      message,
      provider = 'auto',
      from = null,
      statusCallback = null,
      priority = 'normal',
      template = null,
      templateData = {},
    } = options;

    // Validate phone number
    if (!this.validatePhoneNumber(to)) {
      throw new AppError('Invalid phone number format', 400);
    }

    // Format message
    const formattedMessage = template
      ? this.applyTemplate(template, templateData)
      : message;

    if (formattedMessage.length > 1600) {
      throw new AppError('SMS message too long (max 1600 characters)', 400);
    }

    try {
      let result;
      
      if (provider === 'auto') {
        // Try providers in priority order
        const providers = Array.from(this.providers.values())
          .filter(p => p.enabled)
          .sort((a, b) => a.priority - b.priority);

        for (const provider of providers) {
          try {
            result = await this.sendWithProvider(provider, {
              to,
              message: formattedMessage,
              from: from || provider.from,
              statusCallback,
            });
            
            if (result.success) {
              break;
            }
          } catch (error) {
            logger.warn(`Failed with provider ${provider.name}:`, error.message);
            continue;
          }
        }
      } else {
        const selectedProvider = this.providers.get(provider);
        if (!selectedProvider || !selectedProvider.enabled) {
          throw new AppError(`SMS provider ${provider} not available`, 500);
        }

        result = await this.sendWithProvider(selectedProvider, {
          to,
          message: formattedMessage,
          from: from || selectedProvider.from,
          statusCallback,
        });
      }

      if (!result || !result.success) {
        throw new AppError('Failed to send SMS with all providers', 500);
      }

      logger.info(`📱 SMS sent to ${to} via ${result.provider}`);
      return result;
    } catch (error) {
      logger.error('❌ Error sending SMS:', error);
      throw error;
    }
  }

  async sendWithProvider(provider, options) {
    const { to, message, from, statusCallback } = options;

    try {
      switch (provider.name.toLowerCase()) {
        case 'twilio':
          return await this.sendWithTwilio(provider.client, {
            to,
            body: message,
            from,
            statusCallback,
          });

        case 'vonage':
          return await this.sendWithVonage(provider, {
            to,
            text: message,
            from,
          });

        case 'messagebird':
          return await this.sendWithMessageBird(provider, {
            to,
            body: message,
            originator: from,
          });

        default:
          throw new AppError(`Unsupported provider: ${provider.name}`, 500);
      }
    } catch (error) {
      logger.error(`Error with provider ${provider.name}:`, error);
      throw error;
    }
  }

  async sendWithTwilio(client, options) {
    const { to, body, from, statusCallback } = options;

    const message = await client.messages.create({
      body,
      to,
      from,
      statusCallback,
    });

    return {
      success: true,
      provider: 'twilio',
      messageId: message.sid,
      status: message.status,
      price: message.price,
      priceUnit: message.priceUnit,
    };
  }

  async sendWithVonage(provider, options) {
    const { to, text, from } = options;

    const response = await axios.post(
      'https://rest.nexmo.com/sms/json',
      {
        api_key: provider.apiKey,
        api_secret: provider.apiSecret,
        to,
        from,
        text,
      }
    );

    const message = response.data.messages[0];

    return {
      success: message.status === '0',
      provider: 'vonage',
      messageId: message['message-id'],
      status: message.status,
      errorText: message['error-text'],
    };
  }

  async sendWithMessageBird(provider, options) {
    const { to, body, originator } = options;

    const response = await axios.post(
      'https://rest.messagebird.com/messages',
      {
        recipients: [to],
        body,
        originator,
      },
      {
        headers: {
          Authorization: `AccessKey ${provider.apiKey}`,
        },
      }
    );

    return {
      success: true,
      provider: 'messagebird',
      messageId: response.data.id,
      status: response.data.status,
      recipientCount: response.data.recipients.totalCount,
    };
  }

  async sendVerificationCode(phoneNumber, code) {
    const message = `Your OmniMind verification code is: ${code}\n\nThis code expires in 10 minutes.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      template: 'verification',
      templateData: { code },
      priority: 'high',
    });
  }

  async sendLoginAlert(phoneNumber, deviceInfo) {
    const message = `Security Alert: New login detected on your OmniMind account.\n\nDevice: ${deviceInfo.device}\nLocation: ${deviceInfo.location}\nTime: ${deviceInfo.time}\n\nIf this wasn't you, please reset your password immediately.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      priority: 'high',
    });
  }

  async sendCriticalNotification(phoneNumber, notification) {
    const message = `🚨 ${notification.title}\n\n${notification.message}\n\nPriority: ${notification.priority.toUpperCase()}`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      priority: 'high',
    });
  }

  async sendTaskReminder(phoneNumber, task) {
    const message = `📋 Task Reminder: "${task.title}"\n\nDue: ${new Date(task.dueDate).toLocaleString()}\nProject: ${task.projectTitle}\n\nMark as complete: ${process.env.FRONTEND_URL}/tasks/${task.id}`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      template: 'task-reminder',
      templateData: {
        title: task.title,
        dueDate: new Date(task.dueDate).toLocaleString(),
        projectTitle: task.projectTitle,
        taskUrl: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
      },
    });
  }

  async sendMeetingReminder(phoneNumber, meeting) {
    const message = `📅 Meeting Reminder: "${meeting.title}"\n\nTime: ${new Date(meeting.startTime).toLocaleString()}\nDuration: ${meeting.duration} minutes\nJoin: ${meeting.joinUrl || 'Check dashboard for details'}`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      priority: 'medium',
    });
  }

  async sendProjectUpdate(phoneNumber, project, update) {
    const message = `📊 Project Update: "${project.title}"\n\n${update.message}\n\nProgress: ${update.progress}%\nView: ${process.env.FRONTEND_URL}/projects/${project.id}`;

    return this.sendSMS({
      to: phoneNumber,
      message,
    });
  }

  validatePhoneNumber(phoneNumber) {
    // Simple phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  formatPhoneNumber(phoneNumber, countryCode = 'US') {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing
    if (!cleaned.startsWith('+')) {
      const countryCodes = {
        'US': '1',
        'UK': '44',
        'CA': '1',
        'AU': '61',
        'DE': '49',
        'FR': '33',
        'IN': '91',
      };
      
      const code = countryCodes[countryCode] || '1';
      return `+${code}${cleaned}`;
    }
    
    return `+${cleaned}`;
  }

  applyTemplate(template, data) {
    const templates = {
      'verification': `Your OmniMind verification code is: ${data.code}\n\nThis code expires in 10 minutes.`,
      'task-reminder': `📋 Task Reminder: "${data.title}"\n\nDue: ${data.dueDate}\nProject: ${data.projectTitle}\n\nMark as complete: ${data.taskUrl}`,
      'meeting-reminder': `📅 Meeting: "${data.title}"\nTime: ${data.time}\nDuration: ${data.duration} minutes\nJoin: ${data.joinUrl}`,
      'urgent-alert': `🚨 URGENT: ${data.title}\n\n${data.message}\n\nRequired action: ${data.action}`,
      'welcome': `Welcome to OmniMind AI! 🎉\n\nYour account is ready. Download app: ${process.env.APP_STORE_URL || process.env.FRONTEND_URL}\n\nSupport: ${process.env.SUPPORT_PHONE || 'contact support via app'}`,
    };

    const templateText = templates[template];
    if (!templateText) {
      throw new AppError(`Template "${template}" not found`, 400);
    }

    // Replace placeholders with data
    return templateText.replace(/\${(\w+)}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  async getMessageStatus(provider, messageId) {
    try {
      switch (provider) {
        case 'twilio':
          const twilioClient = this.providers.get('twilio')?.client;
          if (!twilioClient) throw new Error('Twilio client not available');
          
          const message = await twilioClient.messages(messageId).fetch();
          return {
            status: message.status,
            sent: message.dateSent,
            price: message.price,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage,
          };

        default:
          throw new AppError(`Status check not supported for provider: ${provider}`, 400);
      }
    } catch (error) {
      logger.error('Error getting message status:', error);
      throw error;
    }
  }

  async getProviderStatus() {
    const status = {};
    
    for (const [name, provider] of this.providers) {
      status[name] = {
        enabled: provider.enabled,
        name: provider.name,
        priority: provider.priority,
        from: provider.from,
      };
    }
    
    return status;
  }

  async enableProvider(name, enabled = true) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new AppError(`Provider ${name} not found`, 404);
    }
    
    provider.enabled = enabled;
    logger.info(`${enabled ? 'Enabled' : 'Disabled'} SMS provider: ${name}`);
    
    return { success: true, provider: name, enabled };
  }
}

export default new SMSService();