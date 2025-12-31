/**
 * Migration: Initial Schema Setup
 * Created: 2024-01-01T00:00:00.000Z
 */

module.exports = {
  async up(db) {
    // Create users collection
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              description: 'must be a valid email address'
            },
            password: {
              bsonType: 'string',
              minLength: 8,
              description: 'must be at least 8 characters'
            },
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'must be between 2 and 100 characters'
            },
            role: {
              bsonType: 'string',
              enum: ['user', 'admin', 'manager'],
              default: 'user'
            },
            tier: {
              bsonType: 'string',
              enum: ['free', 'premium', 'enterprise'],
              default: 'free'
            },
            emailVerified: {
              bsonType: 'bool',
              default: false
            },
            settings: {
              bsonType: 'object',
              properties: {
                notifications: {
                  bsonType: 'object',
                  properties: {
                    email: { bsonType: 'bool' },
                    push: { bsonType: 'bool' },
                    sms: { bsonType: 'bool' }
                  }
                },
                theme: {
                  bsonType: 'string',
                  enum: ['light', 'dark', 'auto']
                },
                language: {
                  bsonType: 'string',
                  default: 'en'
                },
                timezone: {
                  bsonType: 'string',
                  default: 'UTC'
                }
              }
            },
            profile: {
              bsonType: 'object',
              properties: {
                avatar: { bsonType: 'string' },
                jobTitle: { bsonType: 'string' },
                company: { bsonType: 'string' },
                bio: { bsonType: 'string', maxLength: 500 }
              }
            },
            createdAt: {
              bsonType: 'date',
              default: () => new Date()
            },
            updatedAt: {
              bsonType: 'date',
              default: () => new Date()
            }
          }
        }
      }
    });

    // Create indexes for users
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ tier: 1 });

    // Create projects collection
    await db.createCollection('projects', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'userId'],
          properties: {
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 200,
              description: 'must be between 2 and 200 characters'
            },
            description: {
              bsonType: 'string',
              maxLength: 1000
            },
            userId: {
              bsonType: 'objectId',
              description: 'must reference a valid user'
            },
            status: {
              bsonType: 'string',
              enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
              default: 'planning'
            },
            priority: {
              bsonType: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: 'medium'
            },
            progress: {
              bsonType: 'int',
              minimum: 0,
              maximum: 100,
              default: 0
            },
            deadline: {
              bsonType: 'date'
            },
            budget: {
              bsonType: 'double',
              minimum: 0
            },
            teamSize: {
              bsonType: 'int',
              minimum: 1,
              maximum: 100
            },
            tags: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
              }
            },
            risks: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
              }
            },
            aiInsights: {
              bsonType: 'object',
              properties: {
                predictedCompletion: { bsonType: 'date' },
                confidence: { bsonType: 'int' },
                recommendations: { bsonType: 'array', items: { bsonType: 'string' } }
              }
            },
            createdAt: {
              bsonType: 'date',
              default: () => new Date()
            },
            updatedAt: {
              bsonType: 'date',
              default: () => new Date()
            }
          }
        }
      }
    });

    // Create indexes for projects
    await db.collection('projects').createIndex({ userId: 1 });
    await db.collection('projects').createIndex({ status: 1 });
    await db.collection('projects').createIndex({ priority: 1 });
    await db.collection('projects').createIndex({ deadline: 1 });
    await db.collection('projects').createIndex({ createdAt: -1 });
    await db.collection('projects').createIndex({ name: 'text', description: 'text' });

    // Create tasks collection
    await db.createCollection('tasks', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title', 'projectId'],
          properties: {
            title: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 200
            },
            description: {
              bsonType: 'string',
              maxLength: 1000
            },
            projectId: {
              bsonType: 'objectId'
            },
            userId: {
              bsonType: 'objectId'
            },
            status: {
              bsonType: 'string',
              enum: ['todo', 'in-progress', 'review', 'completed', 'blocked'],
              default: 'todo'
            },
            priority: {
              bsonType: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium'
            },
            dueDate: {
              bsonType: 'date'
            },
            completedAt: {
              bsonType: 'date'
            },
            estimatedTime: {
              bsonType: 'double',
              minimum: 0
            },
            actualTime: {
              bsonType: 'double',
              minimum: 0
            },
            assigneeId: {
              bsonType: 'objectId'
            },
            dependencies: {
              bsonType: 'array',
              items: {
                bsonType: 'objectId'
              }
            },
            tags: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
              }
            },
            aiInsights: {
              bsonType: 'string'
            },
            createdAt: {
              bsonType: 'date',
              default: () => new Date()
            },
            updatedAt: {
              bsonType: 'date',
              default: () => new Date()
            }
          }
        }
      }
    });

    // Create indexes for tasks
    await db.collection('tasks').createIndex({ projectId: 1 });
    await db.collection('tasks').createIndex({ userId: 1 });
    await db.collection('tasks').createIndex({ assigneeId: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('tasks').createIndex({ priority: 1 });
    await db.collection('tasks').createIndex({ dueDate: 1 });
    await db.collection('tasks').createIndex({ completedAt: 1 });
    await db.collection('tasks').createIndex({ title: 'text', description: 'text' });

    // Create notifications collection
    await db.createCollection('notifications', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'type', 'title'],
          properties: {
            userId: {
              bsonType: 'objectId'
            },
            type: {
              bsonType: 'string',
              enum: [
                'task_assigned',
                'deadline_approaching',
                'project_updated',
                'ai_insight',
                'system_update',
                'ad_promotion',
                'security_alert'
              ]
            },
            title: {
              bsonType: 'string',
              maxLength: 200
            },
            message: {
              bsonType: 'string',
              maxLength: 1000
            },
            priority: {
              bsonType: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: 'medium'
            },
            read: {
              bsonType: 'bool',
              default: false
            },
            metadata: {
              bsonType: 'object'
            },
            actionUrl: {
              bsonType: 'string'
            },
            expiresAt: {
              bsonType: 'date'
            },
            createdAt: {
              bsonType: 'date',
              default: () => new Date()
            }
          }
        }
      }
    });

    // Create indexes for notifications
    await db.collection('notifications').createIndex({ userId: 1 });
    await db.collection('notifications').createIndex({ type: 1 });
    await db.collection('notifications').createIndex({ priority: 1 });
    await db.collection('notifications').createIndex({ read: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });
    await db.collection('notifications').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Create ai_conversations collection
    await db.createCollection('ai_conversations', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'messages'],
          properties: {
            userId: {
              bsonType: 'objectId'
            },
            messages: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['role', 'content'],
                properties: {
                  role: {
                    bsonType: 'string',
                    enum: ['user', 'assistant', 'system']
                  },
                  content: {
                    bsonType: 'string'
                  },
                  timestamp: {
                    bsonType: 'date'
                  }
                }
              }
            },
            context: {
              bsonType: 'object'
            },
            model: {
              bsonType: 'string'
            },
            tokens: {
              bsonType: 'object',
              properties: {
                prompt: { bsonType: 'int' },
                completion: { bsonType: 'int' },
                total: { bsonType: 'int' }
              }
            },
            createdAt: {
              bsonType: 'date',
              default: () => new Date()
            }
          }
        }
      }
    });

    // Create indexes for ai_conversations
    await db.collection('ai_conversations').createIndex({ userId: 1 });
    await db.collection('ai_conversations').createIndex({ createdAt: -1 });

    // Create analytics collection
    await db.createCollection('analytics', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'activityType'],
          properties: {
            userId: {
              bsonType: 'objectId'
            },
            activityType: {
              bsonType: 'string'
            },
            metadata: {
              bsonType: 'object'
            },
            timestamp: {
              bsonType: 'date',
              default: () => new Date()
            },
            date: {
              bsonType: 'string'
            }
          }
        }
      }
    });

    // Create indexes for analytics
    await db.collection('analytics').createIndex({ userId: 1 });
    await db.collection('analytics').createIndex({ activityType: 1 });
    await db.collection('analytics').createIndex({ timestamp: -1 });
    await db.collection('analytics').createIndex({ date: 1 });

    // Create ads collection
    await db.createCollection('ads', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['advertiserId', 'title', 'imageUrl', 'targetUrl'],
          properties: {
            advertiserId: {
              bsonType: 'objectId'
            },
            title: {
              bsonType: 'string',
              maxLength: 100
            },
            description: {
              bsonType: 'string',
              maxLength: 500
            },
            imageUrl: {
              bsonType: 'string'
            },
            targetUrl: {
              bsonType: 'string'
            },
            targetAudience: {
              bsonType: 'object',
              properties: {
                ageRange: { bsonType: 'array', items: { bsonType: 'int' } },
                interests: { bsonType: 'array', items: { bsonType: 'string' } },
                location: { bsonType: 'string' },
                deviceType: {
                  bsonType: 'string',
                  enum: ['all', 'mobile', 'desktop', 'tablet']
                }
              }
            },
            budget: {
              bsonType: 'double',
              minimum: 0
            },
            spent: {
              bsonType: 'double',
              default: 0
            },
            maxBid: {
              bsonType: 'double',
              minimum: 0
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'paused', 'completed', 'rejected'],
              default: 'active'
            },
            impressions: {
              bsonType: 'int',
              default: 0
            },
            clicks: {
              bsonType: 'int',
              default: 0
            },
            ctr: {
              bsonType: 'double',
              default: 0
            },
            startDate: {
              bsonType: 'date'
            },
            endDate: {
              bsonType: 'date'
            },
            schedule: {
              bsonType: 'object',
              properties: {
                days: { bsonType: 'array', items: { bsonType: 'string' } },
                hours: { bsonType: 'array', items: { bsonType: 'string' } }
              }
            },
            aiOptimization: {
              bsonType: 'object',
              properties: {
                enabled: { bsonType: 'bool' },
                performanceScore: { bsonType: 'double' },
                suggestions: { bsonType: 'array', items: { bsonType: 'string' } }
              }
            },
            createdAt: {
              bsonType: 'date',
              default: () => new Date()
            },
            updatedAt: {
              bsonType: 'date',
              default: () => new Date()
            }
          }
        }
      }
    });

    // Create indexes for ads
    await db.collection('ads').createIndex({ advertiserId: 1 });
    await db.collection('ads').createIndex({ status: 1 });
    await db.collection('ads').createIndex({ startDate: 1 });
    await db.collection('ads').createIndex({ endDate: 1 });
    await db.collection('ads').createIndex({ createdAt: -1 });

    // Create ad_impressions collection
    await db.createCollection('ad_impressions', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['adId', 'userId'],
          properties: {
            adId: {
              bsonType: 'objectId'
            },
            userId: {
              bsonType: 'objectId'
            },
            action: {
              bsonType: 'string',
              enum: ['view', 'click', 'dismiss']
            },
            revenue: {
              bsonType: 'double',
              default: 0
            },
            timestamp: {
              bsonType: 'date',
              default: () => new Date()
            },
            userAgent: {
              bsonType: 'string'
            },
            ipAddress: {
              bsonType: 'string'
            }
          }
        }
      }
    });

    // Create indexes for ad_impressions
    await db.collection('ad_impressions').createIndex({ adId: 1 });
    await db.collection('ad_impressions').createIndex({ userId: 1 });
    await db.collection('ad_impressions').createIndex({ action: 1 });
    await db.collection('ad_impressions').createIndex({ timestamp: -1 });

    console.log('✅ Initial schema created successfully');
  },

  async down(db) {
    // Drop all collections in reverse order
    await db.collection('ad_impressions').drop();
    await db.collection('ads').drop();
    await db.collection('analytics').drop();
    await db.collection('ai_conversations').drop();
    await db.collection('notifications').drop();
    await db.collection('tasks').drop();
    await db.collection('projects').drop();
    await db.collection('users').drop();

    console.log('✅ All collections dropped');
  }
};