const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { cache } = require('../config/database');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { sendEmail } = require('../utils/emailTemplates');

class UserController {
  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updates = req.body;

      // Remove restricted fields
      delete updates.password;
      delete updates.email;
      delete updates.role;
      delete updates.subscription;
      delete updates.emailVerified;
      delete updates.stats;

      // Validate name
      if (updates.name && updates.name.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Name must be at least 2 characters'
        });
      }

      // Validate preferences if provided
      if (updates.preferences) {
        // Validate theme
        if (updates.preferences.theme && !['light', 'dark', 'auto'].includes(updates.preferences.theme)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid theme value'
          });
        }

        // Validate language (basic check)
        if (updates.preferences.language && updates.preferences.language.length !== 2) {
          return res.status(400).json({
            success: false,
            error: 'Invalid language code'
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          }
        },
        { 
          new: true, 
          runValidators: true 
        }
      ).select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Clear user cache
      await cache.del(`user:${userId}`);

      logger.info(`Profile updated: ${user.email}`);

      res.json({
        success: true,
        data: { user },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req, res) {
    try {
      const userId = req.user._id;
      const preferences = req.body;

      // Validate preferences
      const validPreferences = {};
      
      if (preferences.theme) {
        if (!['light', 'dark', 'auto'].includes(preferences.theme)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid theme value'
          });
        }
        validPreferences.theme = preferences.theme;
      }

      if (preferences.language) {
        if (preferences.language.length !== 2) {
          return res.status(400).json({
            success: false,
            error: 'Invalid language code'
          });
        }
        validPreferences.language = preferences.language;
      }

      if (preferences.notifications) {
        validPreferences.notifications = {
          email: !!preferences.notifications.email,
          push: !!preferences.notifications.push,
          sms: !!preferences.notifications.sms,
          desktop: !!preferences.notifications.desktop,
          sound: !!preferences.notifications.sound
        };
      }

      if (preferences.privacy) {
        validPreferences.privacy = {
          showOnlineStatus: !!preferences.privacy.showOnlineStatus,
          showEmail: !!preferences.privacy.showEmail,
          allowTracking: !!preferences.privacy.allowTracking
        };
      }

      if (preferences.appearance) {
        validPreferences.appearance = {
          compactMode: !!preferences.appearance.compactMode,
          showAvatars: !!preferences.appearance.showAvatars,
          animateTransitions: !!preferences.appearance.animateTransitions,
          fontSize: preferences.appearance.fontSize || 'medium'
        };
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            'preferences': validPreferences,
            updatedAt: new Date()
          }
        },
        { new: true }
      ).select('preferences');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Clear user cache
      await cache.del(`user:${userId}`);

      logger.info(`Preferences updated: ${user.email}`);

      res.json({
        success: true,
        data: { preferences: user.preferences },
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(req, res) {
    try {
      const userId = req.user._id;
      const { plan, paymentMethodId, cancelAtPeriodEnd } = req.body;

      // Validate plan
      const validPlans = ['free', 'pro', 'business', 'enterprise'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subscription plan'
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // In a real application, you would:
      // 1. Process payment with Stripe/other payment processor
      // 2. Update subscription in database
      // 3. Send confirmation email
      
      // For now, just update the plan
      const oldPlan = user.subscription;
      user.subscription = plan;
      user.subscriptionUpdatedAt = new Date();
      
      if (cancelAtPeriodEnd) {
        user.subscriptionCancelsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      } else {
        user.subscriptionCancelsAt = null;
      }

      await user.save();

      // Clear user cache
      await cache.del(`user:${userId}`);

      // Send subscription update email
      try {
        await sendEmail({
          to: user.email,
          subject: `Your OmniMind subscription has been ${plan === 'free' ? 'downgraded' : 'upgraded'}`,
          template: 'subscription-updated',
          data: {
            name: user.name,
            oldPlan,
            newPlan: plan,
            timestamp: new Date().toLocaleString()
          }
        });
      } catch (emailError) {
        logger.error('Failed to send subscription email:', emailError);
      }

      logger.info(`Subscription updated: ${user.email} from ${oldPlan} to ${plan}`);

      res.json({
        success: true,
        data: { 
          subscription: user.subscription,
          subscriptionUpdatedAt: user.subscriptionUpdatedAt,
          subscriptionCancelsAt: user.subscriptionCancelsAt
        },
        message: `Subscription ${plan === 'free' ? 'downgraded' : 'upgraded'} to ${plan}`
      });
    } catch (error) {
      logger.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription'
      });
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(req, res) {
    try {
      const userId = req.user._id;
      const { cancelAtPeriodEnd = true } = req.body;

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (user.subscription === 'free') {
        return res.status(400).json({
          success: false,
          error: 'Free subscription cannot be cancelled'
        });
      }

      if (cancelAtPeriodEnd) {
        // Cancel at end of billing period
        user.subscriptionCancelsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        user.subscriptionStatus = 'cancelling';
        
        // Send cancellation email
        await sendEmail({
          to: user.email,
          subject: 'Your OmniMind subscription cancellation',
          template: 'subscription-cancelled',
          data: {
            name: user.name,
            plan: user.subscription,
            cancellationDate: user.subscriptionCancelsAt.toLocaleDateString(),
            featuresLost: ['No ads', 'Advanced AI features', 'Priority support'] // Example
          }
        });
        
        message = 'Subscription will be cancelled at the end of the billing period';
      } else {
        // Cancel immediately (downgrade to free)
        const oldPlan = user.subscription;
        user.subscription = 'free';
        user.subscriptionStatus = 'cancelled';
        user.subscriptionCancelsAt = null;
        
        // Send immediate cancellation email
        await sendEmail({
          to: user.email,
          subject: 'Your OmniMind subscription has been cancelled',
          template: 'subscription-cancelled-immediate',
          data: {
            name: user.name,
            oldPlan,
            timestamp: new Date().toLocaleString()
          }
        });
        
        message = 'Subscription cancelled immediately. Downgraded to free plan.';
      }

      user.subscriptionUpdatedAt = new Date();
      await user.save();

      // Clear user cache
      await cache.del(`user:${userId}`);

      logger.info(`Subscription cancelled: ${user.email}, plan: ${user.subscription}`);

      res.json({
        success: true,
        data: { 
          subscription: user.subscription,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionCancelsAt: user.subscriptionCancelsAt
        },
        message
      });
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription'
      });
    }
  }

  /**
   * Get user dashboard data
   */
  async getDashboard(req, res) {
    try {
      const userId = req.user._id;

      // Check cache
      const cacheKey = `dashboard:${userId}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          meta: { cached: true }
        });
      }

      // Get user's projects
      const projects = await Project.find({
        $or: [
          { owner: userId },
          { members: userId }
        ],
        deletedAt: null,
        status: { $ne: 'archived' }
      })
      .select('title status priority progress dueDate startDate members tasks')
      .populate('members', 'name email')
      .limit(10)
      .lean();

      // Get user's tasks
      const tasks = await Task.find({
        $or: [
          { assignee: userId },
          { createdBy: userId }
        ],
        deletedAt: null
      })
      .select('title status priority dueDate project')
      .populate('project', 'title')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

      // Calculate statistics
      const projectStats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'in-progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        overdue: projects.filter(p => 
          p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'completed'
        ).length
      };

      const taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        todo: tasks.filter(t => t.status === 'todo').length,
        overdue: tasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
        ).length,
        assignedToMe: tasks.filter(t => t.assignee && t.assignee.equals(userId)).length
      };

      // Get recent activity
      const recentActivity = await Task.find({
        $or: [
          { assignee: userId },
          { createdBy: userId }
        ],
        deletedAt: null
      })
      .select('title status updatedAt updatedBy')
      .populate('updatedBy', 'name')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

      // Calculate productivity score
      const completedTasksThisWeek = tasks.filter(t => 
        t.status === 'completed' && 
        t.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      const totalTasksThisWeek = tasks.filter(t => 
        t.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      const productivityScore = totalTasksThisWeek > 0 
        ? Math.round((completedTasksThisWeek / totalTasksThisWeek) * 100)
        : 100;

      // Get upcoming deadlines (next 7 days)
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const upcomingDeadlines = tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) <= sevenDaysFromNow && 
        new Date(t.dueDate) > new Date() &&
        t.status !== 'completed'
      ).slice(0, 5);

      const dashboardData = {
        overview: {
          projectStats,
          taskStats,
          productivityScore,
          activeProjects: projectStats.active
        },
        recentProjects: projects.slice(0, 5).map(p => ({
          id: p._id,
          title: p.title,
          status: p.status,
          progress: p.progress,
          dueDate: p.dueDate,
          memberCount: p.members.length,
          taskCount: p.tasks?.length || 0
        })),
        upcomingDeadlines: upcomingDeadlines.map(t => ({
          id: t._id,
          title: t.title,
          dueDate: t.dueDate,
          project: t.project?.title,
          priority: t.priority,
          daysUntil: Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        recentActivity: recentActivity.map(a => ({
          id: a._id,
          title: a.title,
          status: a.status,
          updatedAt: a.updatedAt,
          updatedBy: a.updatedBy?.name || 'System',
          timeAgo: this.getTimeAgo(a.updatedAt)
        })),
        quickStats: {
          tasksCompletedToday: tasks.filter(t => 
            t.status === 'completed' && 
            t.updatedAt.toDateString() === new Date().toDateString()
          ).length,
          meetingsToday: 2, // This would come from calendar integration
          unreadNotifications: 3, // This would come from notification system
          timeSaved: 4.5 // This would be calculated from AI assistance
        }
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, dashboardData, 300);

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data'
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user._id;

      // Check cache
      const cacheKey = `user_stats:${userId}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          meta: { cached: true }
        });
      }

      const user = await User.findById(userId).select('stats');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get additional statistics
      const [projectCount, taskCount, completedTaskCount] = await Promise.all([
        Project.countDocuments({
          $or: [
            { owner: userId },
            { members: userId }
          ],
          deletedAt: null
        }),
        Task.countDocuments({
          $or: [
            { assignee: userId },
            { createdBy: userId }
          ],
          deletedAt: null
        }),
        Task.countDocuments({
          $or: [
            { assignee: userId },
            { createdBy: userId }
          ],
          status: 'completed',
          deletedAt: null
        })
      ]);

      // Calculate streak (consecutive days with activity)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const hadActivityToday = user.stats.lastActive && 
        user.stats.lastActive.toDateString() === today.toDateString();
      
      const hadActivityYesterday = user.stats.lastActive && 
        user.stats.lastActive.toDateString() === yesterday.toDateString();
      
      const currentStreak = hadActivityToday ? (hadActivityYesterday ? user.stats.currentStreak || 1 : 1) : 0;

      const stats = {
        ...user.stats.toObject(),
        projects: projectCount,
        tasks: taskCount,
        completedTasks: completedTaskCount,
        completionRate: taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0,
        currentStreak,
        longestStreak: Math.max(user.stats.longestStreak || 0, currentStreak),
        averageTasksPerDay: user.stats.loginCount > 0 ? Math.round(taskCount / user.stats.loginCount) : 0
      };

      // Update streak in database
      if (currentStreak !== user.stats.currentStreak) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            'stats.currentStreak': currentStreak,
            'stats.longestStreak': stats.longestStreak
          }
        });
      }

      // Cache for 1 hour
      await cache.set(cacheKey, stats, 3600);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics'
      });
    }
  }

  /**
   * Get user activity timeline
   */
  async getActivityTimeline(req, res) {
    try {
      const userId = req.user._id;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get project activities
      const projectActivities = await Project.find({
        $or: [
          { owner: userId },
          { members: userId }
        ],
        deletedAt: null,
        updatedAt: { $gte: startDate }
      })
      .select('title status updatedAt updatedBy')
      .populate('updatedBy', 'name')
      .sort({ updatedAt: -1 })
      .lean();

      // Get task activities
      const taskActivities = await Task.find({
        $or: [
          { assignee: userId },
          { createdBy: userId }
        ],
        deletedAt: null,
        updatedAt: { $gte: startDate }
      })
      .select('title status updatedAt updatedBy project')
      .populate('updatedBy', 'name')
      .populate('project', 'title')
      .sort({ updatedAt: -1 })
      .lean();

      // Combine and sort activities
      const activities = [
        ...projectActivities.map(p => ({
          type: 'project',
          id: p._id,
          title: p.title,
          description: `Project ${p.status === 'completed' ? 'completed' : 'updated'}`,
          timestamp: p.updatedAt,
          user: p.updatedBy?.name || 'System',
          metadata: { status: p.status }
        })),
        ...taskActivities.map(t => ({
          type: 'task',
          id: t._id,
          title: t.title,
          description: `Task ${t.status === 'completed' ? 'completed' : 'updated'}`,
          timestamp: t.updatedAt,
          user: t.updatedBy?.name || 'System',
          metadata: { 
            status: t.status,
            project: t.project?.title 
          }
        }))
      ].sort((a, b) => b.timestamp - a.timestamp);

      // Group by date
      const groupedActivities = activities.reduce((acc, activity) => {
        const date = activity.timestamp.toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(activity);
        return acc;
      }, {});

      // Format for response
      const timeline = Object.entries(groupedActivities).map(([date, items]) => ({
        date,
        activities: items.slice(0, 10) // Limit to 10 per day
      }));

      res.json({
        success: true,
        data: { timeline, total: activities.length }
      });
    } catch (error) {
      logger.error('Get activity timeline error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity timeline'
      });
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(req, res) {
    try {
      const userId = req.user._id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
        });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum size is 5MB.'
        });
      }

      // In a real application, you would:
      // 1. Upload to cloud storage (S3, Cloudinary, etc.)
      // 2. Generate different sizes (thumbnail, medium, large)
      // 3. Store the URL in database
      
      // For now, simulate with a placeholder
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        userId,
        { 
          $set: { 
            avatar: avatarUrl,
            updatedAt: new Date()
          }
        },
        { new: true }
      ).select('avatar name email');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Clear user cache
      await cache.del(`user:${userId}`);

      logger.info(`Profile picture uploaded: ${user.email}`);

      res.json({
        success: true,
        data: { user },
        message: 'Profile picture uploaded successfully'
      });
    } catch (error) {
      logger.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture'
      });
    }
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!user.avatar) {
        return res.status(400).json({
          success: false,
          error: 'No profile picture to delete'
        });
      }

      // In a real application, you would delete from cloud storage here
      
      user.avatar = null;
      user.updatedAt = new Date();
      await user.save();

      // Clear user cache
      await cache.del(`user:${userId}`);

      logger.info(`Profile picture deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile picture deleted successfully'
      });
    } catch (error) {
      logger.error('Delete profile picture error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete profile picture'
      });
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportData(req, res) {
    try {
      const userId = req.user._id;
      const { format = 'json' } = req.query;

      // Get all user data
      const [user, projects, tasks] = await Promise.all([
        User.findById(userId)
          .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
          .lean(),
        Project.find({
          $or: [
            { owner: userId },
            { members: userId }
          ],
          deletedAt: null
        })
        .select('-deletedAt -__v')
        .populate('owner', 'name email')
        .populate('members', 'name email')
        .lean(),
        Task.find({
          $or: [
            { assignee: userId },
            { createdBy: userId }
          ],
          deletedAt: null
        })
        .select('-deletedAt -__v')
        .populate('project', 'title')
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean()
      ]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          userId: user._id,
          format,
          dataTypes: ['user', 'projects', 'tasks']
        },
        user: {
          profile: {
            name: user.name,
            email: user.email,
            role: user.role,
            subscription: user.subscription,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            preferences: user.preferences,
            integrations: user.integrations
          },
          statistics: user.stats
        },
        projects: projects.map(p => ({
          ...p,
          memberCount: p.members?.length || 0,
          taskCount: p.tasks?.length || 0
        })),
        tasks: tasks.map(t => ({
          ...t,
          projectTitle: t.project?.title,
          assigneeName: t.assignee?.name,
          createdByName: t.createdBy?.name,
          updatedByName: t.updatedBy?.name
        }))
      };

      // Log data export (for audit trail)
      logger.info(`Data exported for user: ${user.email}`);

      if (format === 'csv') {
        // Generate CSV (simplified)
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="omnimind_export_${userId}_${Date.now()}.csv"`);
        
        // This would be more comprehensive in a real implementation
        const csvContent = 'User Data Export\n\n' +
          `Exported at: ${new Date().toISOString()}\n` +
          `User: ${user.name} (${user.email})\n` +
          `Total Projects: ${projects.length}\n` +
          `Total Tasks: ${tasks.length}`;
        
        res.send(csvContent);
      } else {
        // JSON response
        res.json({
          success: true,
          data: exportData,
          message: 'Data exported successfully'
        });
      }
    } catch (error) {
      logger.error('Export data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }

  /**
   * Search users (for adding to projects, etc.)
   */
  async searchUsers(req, res) {
    try {
      const userId = req.user._id;
      const { query, excludeProject, limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
      }

      // Build search query
      const searchQuery = {
        _id: { $ne: userId }, // Exclude self
        deletedAt: null,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      };

      // Exclude users already in project if specified
      if (excludeProject && mongoose.Types.ObjectId.isValid(excludeProject)) {
        const project = await Project.findById(excludeProject).select('members');
        if (project) {
          searchQuery._id.$nin = project.members;
        }
      }

      const users = await User.find(searchQuery)
        .select('name email avatar role subscription')
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: { users }
      });
    } catch (error) {
      logger.error('Search users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search users'
      });
    }
  }

  /**
   * Get user notifications (placeholder)
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user._id;
      const { unreadOnly = false, limit = 20 } = req.query;

      // This would connect to your notification service
      // For now, return placeholder data
      const notifications = [
        {
          id: '1',
          type: 'info',
          title: 'Welcome to OmniMind!',
          message: 'Get started by creating your first project.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          read: false,
          priority: 'normal',
          action: { type: 'create_project', label: 'Create Project' }
        },
        {
          id: '2',
          type: 'warning',
          title: 'Project deadline approaching',
          message: 'Website Redesign project is due in 3 days.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          read: true,
          priority: 'high',
          action: { type: 'view_project', label: 'View Project', data: { projectId: '123' } }
        }
      ];

      // Filter if needed
      const filteredNotifications = unreadOnly 
        ? notifications.filter(n => !n.read)
        : notifications;

      res.json({
        success: true,
        data: { 
          notifications: filteredNotifications.slice(0, limit),
          unreadCount: notifications.filter(n => !n.read).length
        }
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  }

  // Helper method for time ago formatting
  getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) {
      return 'Just now';
    } else if (diff < hour) {
      const minutes = Math.floor(diff / minute);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < day) {
      const hours = Math.floor(diff / hour);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / day);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
}

module.exports = new UserController();