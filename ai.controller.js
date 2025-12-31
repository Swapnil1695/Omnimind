const Project = require('../models/Project');
const Task = require('../models/Task');
const { cache } = require('../config/database');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const axios = require('axios');

class AIController {
  /**
   * AI Chat endpoint
   */
  async chat(req, res) {
    try {
      const { message, context = [], projectId } = req.body;
      const userId = req.user._id;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Rate limiting check
      const rateLimitKey = `ai_chat:${userId}:${new Date().toDateString()}`;
      const todayCount = await cache.incr(rateLimitKey);
      
      if (todayCount === 1) {
        await cache.expire(rateLimitKey, 24 * 60 * 60); // 24 hours
      }
      
      // Check subscription limits
      const user = req.user;
      const maxDailyRequests = {
        free: 50,
        pro: 1000,
        business: 10000,
        enterprise: 100000
      };
      
      const userLimit = maxDailyRequests[user.subscription] || maxDailyRequests.free;
      
      if (todayCount > userLimit) {
        return res.status(429).json({
          success: false,
          error: `Daily AI request limit reached (${userLimit}). Upgrade your plan for more requests.`
        });
      }

      // Get project context if projectId is provided
      let projectContext = '';
      if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
        const project = await Project.findOne({
          _id: projectId,
          $or: [
            { owner: userId },
            { members: userId }
          ],
          deletedAt: null
        })
        .select('title description status priority progress dueDate tasks')
        .populate('tasks', 'title status priority dueDate assignee')
        .lean();

        if (project) {
          projectContext = `
Project: ${project.title}
Status: ${project.status}
Priority: ${project.priority}
Progress: ${project.progress}%
Due Date: ${project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}
Tasks: ${project.tasks?.length || 0} total
${project.tasks?.map(task => `- ${task.title} (${task.status}, ${task.priority})`).join('\n') || ''}
`.trim();
        }
      }

      // Prepare system prompt based on context
      const systemPrompt = `You are OmniMind, an AI productivity assistant. You help users manage projects, tasks, and schedules.

User Context:
- Name: ${user.name}
- Email: ${user.email}
- Subscription: ${user.subscription}
${projectContext ? `\nCurrent Project Context:\n${projectContext}` : ''}

Previous Conversation:
${context.slice(-5).map(c => `${c.role}: ${c.content}`).join('\n')}

Instructions:
1. Be helpful, concise, and professional
2. Focus on productivity, project management, and task organization
3. Offer specific, actionable advice when possible
4. If asked about features you don't have, suggest workarounds
5. Ask clarifying questions when needed
6. Keep responses under 500 words unless detailed explanation is requested

Current time: ${new Date().toLocaleString()}`;

      // In a real implementation, you would call an AI service like OpenAI or Claude
      // For now, we'll simulate a response
      const aiResponse = await this.generateMockResponse(message, systemPrompt, projectContext);

      // Log the interaction
      logger.info(`AI Chat: User ${user.email} - "${message.substring(0, 100)}..."`);

      // Update user stats
      await cache.incr(`ai_requests_total:${userId}`);

      res.json({
        success: true,
        data: {
          message: aiResponse,
          usage: {
            requestsToday: todayCount,
            requestsTotal: await cache.get(`ai_requests_total:${userId}`) || 0,
            limit: userLimit
          }
        }
      });
    } catch (error) {
      logger.error('AI Chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process AI request'
      });
    }
  }

  /**
   * Analyze project with AI
   */
  async analyzeProject(req, res) {
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
      const project = await Project.findOne({
        _id: id,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      })
      .populate('tasks')
      .populate('members', 'name email')
      .lean();

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Check cache
      const cacheKey = `ai_analysis:${id}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          meta: { cached: true }
        });
      }

      // Calculate project metrics for AI analysis
      const tasks = project.tasks || [];
      const now = new Date();
      const dueDate = project.dueDate ? new Date(project.dueDate) : null;

      const metrics = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        overdueTasks: tasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
        ).length,
        highPriorityTasks: tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length,
        unassignedTasks: tasks.filter(t => !t.assignee).length,
        averageTaskAge: tasks.length > 0 ? 
          tasks.reduce((sum, task) => sum + (now - new Date(task.createdAt)), 0) / tasks.length / (1000 * 60 * 60 * 24) : 0,
        daysUntilDue: dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null,
        memberCount: project.members?.length || 0,
        progress: project.progress || 0
      };

      // Generate AI analysis
      const analysis = await this.generateProjectAnalysis(project, metrics);

      // Cache for 1 hour
      await cache.set(cacheKey, analysis, 3600);

      // Update project with AI insights
      await Project.findByIdAndUpdate(id, {
        $set: {
          'aiInsights.lastAnalysis': new Date(),
          'aiInsights.analysis': analysis.summary,
          'aiInsights.risks': analysis.risks,
          'aiInsights.suggestions': analysis.suggestions
        }
      });

      logger.info(`AI Project Analysis: ${project.title} by ${req.user.email}`);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('AI Analyze project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze project'
      });
    }
  }

  /**
   * Generate project schedule with AI
   */
  async generateSchedule(req, res) {
    try {
      const { projectId, tasks, constraints } = req.body;
      const userId = req.user._id;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Validate project access
      const project = await Project.findOne({
        _id: projectId,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      }).select('title startDate dueDate members');

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Get tasks if not provided
      let taskList = tasks;
      if (!taskList || taskList.length === 0) {
        taskList = await Task.find({
          project: projectId,
          deletedAt: null
        })
        .select('title description estimatedHours priority dependencies status assignee')
        .lean();
      }

      if (taskList.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No tasks to schedule'
        });
      }

      // Generate schedule using AI
      const schedule = await this.generateAISchedule(
        project,
        taskList,
        constraints || {}
      );

      logger.info(`AI Schedule Generated: ${project.title} with ${taskList.length} tasks`);

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('AI Generate schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate schedule'
      });
    }
  }

  /**
   * Auto-detect and fix errors
   */
  async detectErrors(req, res) {
    try {
      const { projectId } = req.body;
      const userId = req.user._id;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Validate project access
      const project = await Project.findOne({
        _id: projectId,
        deletedAt: null,
        $or: [
          { owner: userId },
          { members: userId }
        ]
      })
      .populate('tasks')
      .lean();

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      // Detect errors
      const errors = await this.detectProjectErrors(project);

      // Auto-fix simple errors
      const autoFixed = [];
      const needsAttention = [];

      for (const error of errors) {
        if (error.autoFixable) {
          try {
            const fixResult = await this.autoFixError(error, projectId);
            if (fixResult.success) {
              autoFixed.push({
                ...error,
                fix: fixResult
              });
            } else {
              needsAttention.push(error);
            }
          } catch (fixError) {
            needsAttention.push(error);
          }
        } else {
          needsAttention.push(error);
        }
      }

      logger.info(`Error detection: ${project.title} - Found ${errors.length} errors, Auto-fixed ${autoFixed.length}`);

      res.json({
        success: true,
        data: {
          errors: needsAttention,
          autoFixed,
          summary: {
            totalErrors: errors.length,
            autoFixed: autoFixed.length,
            needsAttention: needsAttention.length
          }
        }
      });
    } catch (error) {
      logger.error('AI Detect errors error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect errors'
      });
    }
  }

  /**
   * Transcribe audio
   */
  async transcribe(req, res) {
    try {
      const { audio, language = 'en-US' } = req.body;
      const userId = req.user._id;

      if (!audio) {
        return res.status(400).json({
          success: false,
          error: 'Audio data is required'
        });
      }

      // Check subscription for voice features
      const user = req.user;
      if (user.subscription === 'free') {
        return res.status(403).json({
          success: false,
          error: 'Voice transcription requires Pro plan or higher'
        });
      }

      // In a real implementation, you would:
      // 1. Save audio file
      // 2. Send to speech-to-text service (Google Speech-to-Text, Whisper, etc.)
      // 3. Return transcription
      
      // For now, simulate with mock response
      const transcription = "This is a mock transcription of the audio. In a real application, this would be the actual transcribed text.";
      
      const confidence = 0.85;

      logger.info(`Audio transcription by user: ${user.email}`);

      res.json({
        success: true,
        data: {
          text: transcription,
          confidence,
          language,
          duration: 10.5 // Mock duration in seconds
        }
      });
    } catch (error) {
      logger.error('AI Transcribe error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transcribe audio'
      });
    }
  }

  /**
   * Summarize text
   */
  async summarize(req, res) {
    try {
      const { text, maxLength = 200 } = req.body;
      const userId = req.user._id;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      // Rate limiting
      const rateLimitKey = `ai_summarize:${userId}:${new Date().toDateString()}`;
      const todayCount = await cache.incr(rateLimitKey);
      
      if (todayCount === 1) {
        await cache.expire(rateLimitKey, 24 * 60 * 60);
      }
      
      if (todayCount > 100) {
        return res.status(429).json({
          success: false,
          error: 'Daily summarization limit reached'
        });
      }

      // Generate summary
      const summary = await this.generateTextSummary(text, parseInt(maxLength));

      logger.info(`Text summarization by user: ${req.user.email}`);

      res.json({
        success: true,
        data: {
          originalLength: text.length,
          summaryLength: summary.length,
          summary,
          reduction: Math.round((1 - summary.length / text.length) * 100)
        }
      });
    } catch (error) {
      logger.error('AI Summarize error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to summarize text'
      });
    }
  }

  /**
   * Translate text
   */
  async translate(req, res) {
    try {
      const { text, targetLanguage = 'es', sourceLanguage = 'auto' } = req.body;
      const userId = req.user._id;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      // Check subscription for translation features
      const user = req.user;
      if (user.subscription === 'free') {
        return res.status(403).json({
          success: false,
          error: 'Translation features require Pro plan or higher'
        });
      }

      // In a real implementation, you would use a translation API
      // For now, simulate with mock response
      const translation = "Esta es una traducción simulada del texto. En una aplicación real, este sería el texto traducido real.";
      
      const detectedLanguage = 'en';

      logger.info(`Text translation by user: ${user.email}, ${detectedLanguage} -> ${targetLanguage}`);

      res.json({
        success: true,
        data: {
          original: text,
          translation,
          sourceLanguage: detectedLanguage,
          targetLanguage,
          characterCount: text.length
        }
      });
    } catch (error) {
      logger.error('AI Translate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to translate text'
      });
    }
  }

  /**
   * Generate mock AI response (for development)
   */
  async generateMockResponse(message, systemPrompt, projectContext) {
    // Simple rule-based responses for development
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! I'm OmniMind, your AI productivity assistant. How can I help you today?`;
    }
    
    if (lowerMessage.includes('project') && lowerMessage.includes('create')) {
      return `I can help you create a new project! To create a project, go to the Projects page and click "New Project". You'll need to provide:
1. Project title
2. Description (optional)
3. Start and due dates
4. Priority level

Would you like me to guide you through creating a specific type of project?`;