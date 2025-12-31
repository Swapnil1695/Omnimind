const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { cache } = require('../config/database');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class ProjectController {
  /**
   * Get all projects for current user
   */
  async getAllProjects(req, res) {
    try {
      const userId = req.user._id;
      const { 
        status, 
        priority, 
        search, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Build query
      const query = { 
        $or: [
          { owner: userId },
          { members: userId }
        ],
        deletedAt: null
      };

      // Apply filters
      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }

      if (priority) {
        query.priority = Array.isArray(priority) ? { $in: priority } : priority;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Try cache first
      const cacheKey = `projects:${userId}:${JSON.stringify(query)}:${page}:${limit}:${JSON.stringify(sort)}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          meta: {
            ...cached.meta,
            cached: true,
          },
        });
      }

      // Get projects with pagination
      const [projects, total] = await Promise.all([
        Project.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('owner', 'name email')
          .populate('members', 'name email')
          .lean(),
        Project.countDocuments(query)
      ]);

      // Calculate statistics
      const stats = await Project.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalTasks: { $sum: { $size: { $ifNull: ['$tasks', []] } } },
            totalProgress: { $avg: '$progress' }
          }
        }
      ]);

      // Format response
      const formattedProjects = projects.map(project => ({
        ...project,
        overdue: project.dueDate && new Date(project.dueDate) < new Date(),
        memberCount: project.members?.length || 0,
        taskCount: project.tasks?.length || 0,
      }));

      const response = {
        data: formattedProjects,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          stats: stats.reduce((acc, stat) => {
            acc[stat._id] = {
              count: stat.count,
              totalTasks: stat.totalTasks,
              averageProgress: stat.totalProgress || 0
            };
            return acc;
          }, {})
        }
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, response, 300);

      res.json({
        success: true,
        ...response
      });
    } catch (error) {
      logger.error('Get all projects error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch projects'
      });
    }
  }

  /**
   * Get single project by ID
   */
  async getProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check cache
      const cacheKey = `project:${id}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        // Check if user has access
        if (!cached.owner.equals(userId) && !cached.members.includes(userId)) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
        
        return res.json({
          success: true,
          data: cached,
          meta: { cached: true }
        });
      }

      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role')
      .populate('tasks')
      .lean();

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Calculate project statistics
      const tasks = project.tasks || [];
      const taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        todo: tasks.filter(t => t.status === 'todo').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        overdue: tasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
        ).length
      };

      // Calculate time statistics
      const now = new Date();
      const startDate = new Date(project.startDate);
      const dueDate = new Date(project.dueDate);
      
      const timeStats = {
        isOverdue: dueDate < now,
        daysRemaining: Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))),
        daysElapsed: Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)),
        totalDuration: Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24))
      };

      // Calculate progress if not set
      if (!project.progress && tasks.length > 0) {
        project.progress = Math.round((taskStats.completed / tasks.length) * 100);
      }

      const projectWithStats = {
        ...project,
        stats: {
          tasks: taskStats,
          time: timeStats,
          members: project.members?.length || 0
        },
        overdue: timeStats.isOverdue
      };

      // Cache for 2 minutes
      await cache.set(cacheKey, projectWithStats, 120);

      res.json({
        success: true,
        data: projectWithStats
      });
    } catch (error) {
      logger.error('Get project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project'
      });
    }
  }

  /**
   * Create new project
   */
  async createProject(req, res) {
    try {
      const userId = req.user._id;
      const projectData = req.body;

      // Validate required fields
      if (!projectData.title || !projectData.title.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Project title is required'
        });
      }

      // Validate dates
      if (projectData.startDate && projectData.dueDate) {
        const startDate = new Date(projectData.startDate);
        const dueDate = new Date(projectData.dueDate);
        
        if (startDate >= dueDate) {
          return res.status(400).json({
            success: false,
            error: 'Due date must be after start date'
          });
        }
      }

      // Create project
      const project = new Project({
        ...projectData,
        owner: userId,
        members: [userId, ...(projectData.members || [])].filter((v, i, a) => a.indexOf(v) === i),
        createdBy: userId,
        updatedBy: userId,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        progress: 0,
        aiInsights: {},
        settings: {
          notifications: projectData.settings?.notifications || true,
          autoTaskCreation: projectData.settings?.autoTaskCreation || false,
          weeklyReports: projectData.settings?.weeklyReports || true,
          ...projectData.settings
        }
      });

      await project.save();

      // Populate references
      await project.populate('owner', 'name email');
      await project.populate('members', 'name email');

      // Clear relevant cache
      await cache.keys(`projects:${userId}:*`).then(keys => {
        if (keys.length > 0) {
          return Promise.all(keys.map(key => cache.del(key)));
        }
      });

      logger.info(`Project created: ${project.title} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      logger.error('Create project error:', error);
      
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
        error: 'Failed to create project'
      });
    }
  }

  /**
   * Update project
   */
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const updates = req.body;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user has access
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Check if user has permission to update (owner or admin)
      if (!project.owner.equals(userId) && !req.user.role === 'admin') {
        // Regular members can only update certain fields
        const allowedFields = ['status', 'progress', 'tasks'];
        const invalidFields = Object.keys(updates).filter(
          field => !allowedFields.includes(field)
        );
        
        if (invalidFields.length > 0) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            details: `You can only update: ${allowedFields.join(', ')}`
          });
        }
      }

      // Validate dates
      if (updates.startDate && updates.dueDate) {
        const startDate = new Date(updates.startDate);
        const dueDate = new Date(updates.dueDate);
        
        if (startDate >= dueDate) {
          return res.status(400).json({
            success: false,
            error: 'Due date must be after start date'
          });
        }
      }

      // Update project
      Object.keys(updates).forEach(key => {
        project[key] = updates[key];
      });
      
      project.updatedBy = userId;
      project.updatedAt = new Date();

      await project.save();

      // Populate references
      await project.populate('owner', 'name email');
      await project.populate('members', 'name email');

      // Clear cache
      await cache.del(`project:${id}`);
      await cache.keys(`projects:${userId}:*`).then(keys => {
        if (keys.length > 0) {
          return Promise.all(keys.map(key => cache.del(key)));
        }
      });

      logger.info(`Project updated: ${project.title} by ${req.user.email}`);

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });
    } catch (error) {
      logger.error('Update project error:', error);
      
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
        error: 'Failed to update project'
      });
    }
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user is owner
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        owner: userId
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or you are not the owner'
        });
      }

      // Soft delete
      project.deletedAt = new Date();
      project.updatedBy = userId;
      await project.save();

      // Clear cache
      await cache.del(`project:${id}`);
      await cache.keys(`projects:${userId}:*`).then(keys => {
        if (keys.length > 0) {
          return Promise.all(keys.map(key => cache.del(key)));
        }
      });

      logger.info(`Project deleted: ${project.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      logger.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project'
      });
    }
  }

  /**
   * Add member to project
   */
  async addMember(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { memberId, role = 'member' } = req.body;

      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(memberId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID'
        });
      }

      // Check if project exists and user is owner
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        owner: userId
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or you are not the owner'
        });
      }

      // Check if member exists
      const member = await User.findById(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if member is already in project
      if (project.members.includes(memberId)) {
        return res.status(400).json({
          success: false,
          error: 'User is already a member of this project'
        });
      }

      // Add member
      project.members.push(memberId);
      project.updatedBy = userId;
      project.updatedAt = new Date();
      
      // Add to member roles if exists
      if (!project.memberRoles) {
        project.memberRoles = {};
      }
      project.memberRoles[memberId] = role;

      await project.save();

      // Populate new member
      await project.populate('members', 'name email');

      // Clear cache
      await cache.del(`project:${id}`);

      logger.info(`Member added to project: ${member.email} to ${project.title}`);

      res.json({
        success: true,
        data: project,
        message: 'Member added successfully'
      });
    } catch (error) {
      logger.error('Add member error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add member'
      });
    }
  }

  /**
   * Remove member from project
   */
  async removeMember(req, res) {
    try {
      const { id, memberId } = req.params;
      const userId = req.user._id;

      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(memberId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID'
        });
      }

      // Check if project exists and user is owner
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        owner: userId
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or you are not the owner'
        });
      }

      // Check if member is in project
      if (!project.members.includes(memberId)) {
        return res.status(400).json({
          success: false,
          error: 'User is not a member of this project'
        });
      }

      // Cannot remove owner
      if (project.owner.equals(memberId)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove project owner'
        });
      }

      // Remove member
      project.members = project.members.filter(m => !m.equals(memberId));
      project.updatedBy = userId;
      project.updatedAt = new Date();
      
      // Remove from member roles
      if (project.memberRoles && project.memberRoles[memberId]) {
        delete project.memberRoles[memberId];
      }

      await project.save();

      // Clear cache
      await cache.del(`project:${id}`);

      logger.info(`Member removed from project: ${memberId} from ${project.title}`);

      res.json({
        success: true,
        data: project,
        message: 'Member removed successfully'
      });
    } catch (error) {
      logger.error('Remove member error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove member'
      });
    }
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { 
        status, 
        priority, 
        assignee,
        search,
        sortBy = 'dueDate',
        sortOrder = 'asc'
      } = req.query;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user has access
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      }).select('_id title');

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Build query
      const query = { project: id, deletedAt: null };

      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }

      if (priority) {
        query.priority = Array.isArray(priority) ? { $in: priority } : priority;
      }

      if (assignee) {
        query.assignee = assignee;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Get tasks
      const tasks = await Task.find(query)
        .sort(sort)
        .populate('assignee', 'name email avatar')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();

      // Calculate task statistics
      const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        todo: tasks.filter(t => t.status === 'todo').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        overdue: tasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
        ).length,
        highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length,
        assignedToMe: tasks.filter(t => t.assignee && t.assignee._id.equals(userId)).length
      };

      // Format tasks with additional info
      const formattedTasks = tasks.map(task => ({
        ...task,
        overdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed',
        isAssignedToMe: task.assignee && task.assignee._id.equals(userId)
      }));

      res.json({
        success: true,
        data: formattedTasks,
        meta: {
          project: {
            id: project._id,
            title: project.title
          },
          stats
        }
      });
    } catch (error) {
      logger.error('Get project tasks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project tasks'
      });
    }
  }

  /**
   * Get project analytics
   */
  async getProjectAnalytics(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { timeframe = 'month' } = req.query;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user has access
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      }).select('_id title startDate dueDate');

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Check cache
      const cacheKey = `project_analytics:${id}:${timeframe}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          meta: { cached: true }
        });
      }

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      // Get task completion trends
      const completionTrends = await Task.aggregate([
        {
          $match: {
            project: mongoose.Types.ObjectId.createFromHexString(id),
            status: 'completed',
            completedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$completedAt" }
            },
            count: { $sum: 1 },
            totalHours: { $sum: "$actualHours" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get task status distribution
      const statusDistribution = await Task.aggregate([
        {
          $match: {
            project: mongoose.Types.ObjectId.createFromHexString(id)
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgHours: { $avg: "$estimatedHours" }
          }
        }
      ]);

      // Get priority distribution
      const priorityDistribution = await Task.aggregate([
        {
          $match: {
            project: mongoose.Types.ObjectId.createFromHexString(id)
          }
        },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 }
          }
        }
      ]);

      // Get member contribution
      const memberContribution = await Task.aggregate([
        {
          $match: {
            project: mongoose.Types.ObjectId.createFromHexString(id),
            assignee: { $ne: null }
          }
        },
        {
          $group: {
            _id: "$assignee",
            tasksAssigned: { $sum: 1 },
            tasksCompleted: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            totalHours: { $sum: "$actualHours" }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            name: "$user.name",
            email: "$user.email",
            avatar: "$user.avatar",
            tasksAssigned: 1,
            tasksCompleted: 1,
            completionRate: {
              $cond: [
                { $eq: ["$tasksAssigned", 0] },
                0,
                { $multiply: [{ $divide: ["$tasksCompleted", "$tasksAssigned"] }, 100] }
              ]
            },
            totalHours: 1
          }
        },
        { $sort: { tasksCompleted: -1 } }
      ]);

      // Calculate project health score
      const tasks = await Task.find({ project: id });
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
      ).length;

      let healthScore = 100;
      
      // Deduct for low completion rate
      if (totalTasks > 0) {
        const completionRate = (completedTasks / totalTasks) * 100;
        if (completionRate < 50) healthScore -= 30;
        else if (completionRate < 75) healthScore -= 15;
      }

      // Deduct for overdue tasks
      if (overdueTasks > 0) {
        const overdueRate = (overdueTasks / totalTasks) * 100;
        healthScore -= Math.min(overdueRate * 2, 40); // Max 40% deduction
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      const analytics = {
        overview: {
          totalTasks,
          completedTasks,
          inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
          overdueTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        },
        trends: {
          completionTrends,
          velocity: completionTrends.reduce((sum, day) => sum + day.count, 0) / completionTrends.length || 0
        },
        distributions: {
          status: statusDistribution,
          priority: priorityDistribution
        },
        team: {
          members: memberContribution,
          topPerformer: memberContribution[0] || null
        },
        health: {
          score: Math.round(healthScore),
          level: healthScore >= 80 ? 'good' : healthScore >= 60 ? 'fair' : 'poor',
          factors: [
            {
              name: 'Completion Rate',
              score: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100,
              weight: 0.6
            },
            {
              name: 'On-Time Delivery',
              score: totalTasks > 0 ? Math.max(0, 100 - (overdueTasks / totalTasks) * 100) : 100,
              weight: 0.4
            }
          ]
        },
        predictions: {
          estimatedCompletion: project.dueDate,
          confidence: healthScore >= 80 ? 'high' : healthScore >= 60 ? 'medium' : 'low',
          risks: overdueTasks > 0 ? ['Tasks are overdue'] : []
        }
      };

      // Cache for 15 minutes
      await cache.set(cacheKey, analytics, 900);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Get project analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project analytics'
      });
    }
  }

  /**
   * Generate project report
   */
  async generateProjectReport(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { format = 'json', includeDetails = true } = req.query;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user has access
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      })
      .populate('owner', 'name email')
      .populate('members', 'name email role')
      .populate('tasks');

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Generate report data
      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: req.user.email,
          format,
          version: '1.0'
        },
        project: {
          id: project._id,
          title: project.title,
          description: project.description,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          startDate: project.startDate,
          dueDate: project.dueDate,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        },
        team: {
          owner: project.owner,
          members: project.members,
          totalMembers: project.members.length + 1
        },
        statistics: {
          totalTasks: project.tasks.length,
          completedTasks: project.tasks.filter(t => t.status === 'completed').length,
          inProgressTasks: project.tasks.filter(t => t.status === 'in-progress').length,
          overdueTasks: project.tasks.filter(t => 
            t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
          ).length,
          completionRate: project.tasks.length > 0 
            ? (project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100 
            : 0
        }
      };

      if (includeDetails && format === 'json') {
        report.details = {
          tasks: project.tasks,
          timeline: project.timeline,
          risks: project.risks || [],
          milestones: project.milestones || []
        };
      }

      // Log report generation
      logger.info(`Project report generated: ${project.title} by ${req.user.email}`);

      if (format === 'pdf') {
        // In a real implementation, you would generate PDF here
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_report.pdf"`);
        res.send('PDF generation would happen here');
      } else if (format === 'csv') {
        // CSV generation
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${project.title}_report.csv"`);
        
        // Simple CSV implementation
        const csvRows = [];
        csvRows.push(['Project Report', project.title]);
        csvRows.push(['Generated At', new Date().toISOString()]);
        csvRows.push([]);
        csvRows.push(['Task Title', 'Status', 'Priority', 'Assignee', 'Due Date']);
        
        project.tasks.forEach(task => {
          csvRows.push([
            task.title,
            task.status,
            task.priority,
            task.assignee?.name || 'Unassigned',
            task.dueDate || 'No due date'
          ]);
        });
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        res.send(csvContent);
      } else {
        // JSON response
        res.json({
          success: true,
          data: report
        });
      }
    } catch (error) {
      logger.error('Generate project report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate project report'
      });
    }
  }

  /**
   * Archive project
   */
  async archiveProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user is owner
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        owner: userId
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or you are not the owner'
        });
      }

      // Archive project
      project.status = 'archived';
      project.archivedAt = new Date();
      project.archivedBy = userId;
      project.updatedBy = userId;
      await project.save();

      // Clear cache
      await cache.del(`project:${id}`);
      await cache.keys(`projects:${userId}:*`).then(keys => {
        if (keys.length > 0) {
          return Promise.all(keys.map(key => cache.del(key)));
        }
      });

      logger.info(`Project archived: ${project.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Project archived successfully'
      });
    } catch (error) {
      logger.error('Archive project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to archive project'
      });
    }
  }

  /**
   * Restore archived project
   */
  async restoreProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user is owner
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        owner: userId,
        status: 'archived'
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found, not archived, or you are not the owner'
        });
      }

      // Restore project
      project.status = 'completed'; // Or whatever status it should have
      project.archivedAt = null;
      project.archivedBy = null;
      project.updatedBy = userId;
      await project.save();

      // Clear cache
      await cache.del(`project:${id}`);
      await cache.keys(`projects:${userId}:*`).then(keys => {
        if (keys.length > 0) {
          return Promise.all(keys.map(key => cache.del(key)));
        }
      });

      logger.info(`Project restored: ${project.title} by ${req.user.email}`);

      res.json({
        success: true,
        data: project,
        message: 'Project restored successfully'
      });
    } catch (error) {
      logger.error('Restore project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore project'
      });
    }
  }

  /**
   * Duplicate project
   */
  async duplicateProject(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Check if project exists and user has access
      const originalProject = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      }).populate('tasks');

      if (!originalProject) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Create duplicate project
      const duplicateData = {
        ...originalProject.toObject(),
        _id: undefined,
        title: `${originalProject.title} (Copy)`,
        owner: userId,
        members: [userId],
        status: 'planning',
        progress: 0,
        startDate: null,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
        archivedAt: null,
        archivedBy: null,
        deletedAt: null
      };

      // Remove tasks for now (they'll be duplicated separately)
      delete duplicateData.tasks;

      const duplicateProject = new Project(duplicateData);
      await duplicateProject.save();

      // Duplicate tasks if they exist
      if (originalProject.tasks && originalProject.tasks.length > 0) {
        const duplicateTasks = originalProject.tasks.map(task => ({
          ...task.toObject(),
          _id: undefined,
          project: duplicateProject._id,
          status: 'todo',
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId
        }));

        await Task.insertMany(duplicateTasks);
      }

      // Clear cache
      await cache.keys(`projects:${userId}:*`).then(keys => {
        if (keys.length > 0) {
          return Promise.all(keys.map(key => cache.del(key)));
        }
      });

      logger.info(`Project duplicated: ${originalProject.title} -> ${duplicateProject.title} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: duplicateProject,
        message: 'Project duplicated successfully'
      });
    } catch (error) {
      logger.error('Duplicate project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to duplicate project'
      });
    }
  }
}

module.exports = new ProjectController();