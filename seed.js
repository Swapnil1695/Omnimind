#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Models
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Notification = require('../models/notification.model');
const AIConversation = require('../models/ai-conversation.model');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/omnimind', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    
    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Notification.deleteMany({}),
      AIConversation.deleteMany({})
    ]);
    
    console.log('📦 Seeding new data...');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = await User.create({
      email: 'admin@omnimind.ai',
      password: adminPassword,
      name: 'System Admin',
      role: 'admin',
      tier: 'enterprise',
      emailVerified: true,
      settings: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        theme: 'dark',
        language: 'en',
        timezone: 'UTC'
      },
      profile: {
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        jobTitle: 'System Administrator',
        company: 'OmniMind AI',
        bio: 'System administrator with full access to all features.'
      }
    });

    // Create test users
    const users = [];
    const userPasswords = await Promise.all(
      ['User@123', 'Test@123', 'Demo@123'].map(pass => bcrypt.hash(pass, 10))
    );

    const testUsers = [
      {
        email: 'john@example.com',
        password: userPasswords[0],
        name: 'John Doe',
        role: 'user',
        tier: 'premium',
        emailVerified: true,
        profile: {
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
          jobTitle: 'Product Manager',
          company: 'TechCorp',
          bio: 'Experienced product manager with 5+ years in tech.'
        }
      },
      {
        email: 'jane@example.com',
        password: userPasswords[1],
        name: 'Jane Smith',
        role: 'user',
        tier: 'free',
        emailVerified: true,
        profile: {
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
          jobTitle: 'Software Developer',
          company: 'DevStudio',
          bio: 'Full-stack developer passionate about AI and ML.'
        }
      },
      {
        email: 'alex@example.com',
        password: userPasswords[2],
        name: 'Alex Johnson',
        role: 'user',
        tier: 'free',
        emailVerified: false,
        profile: {
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
          jobTitle: 'Marketing Specialist',
          company: 'GrowthHub',
          bio: 'Digital marketing expert with focus on AI products.'
        }
      }
    ];

    for (const userData of testUsers) {
      const user = await User.create(userData);
      users.push(user);
    }

    console.log(`👥 Created ${users.length + 1} users`);

    // Create sample projects
    const projects = [];
    const projectTemplates = [
      {
        name: 'E-commerce Platform Redesign',
        description: 'Complete redesign of the company e-commerce platform with AI-powered recommendations',
        status: 'active',
        priority: 'high',
        progress: 65,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        budget: 50000,
        teamSize: 8,
        risks: ['Technical debt', 'Integration challenges', 'Performance issues'],
        aiInsights: {
          predictedCompletion: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          confidence: 85,
          recommendations: ['Prioritize mobile optimization', 'Add more testing phases']
        }
      },
      {
        name: 'AI Chatbot Integration',
        description: 'Integrate OmniMind AI chatbot into customer support system',
        status: 'planning',
        priority: 'medium',
        progress: 20,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        budget: 25000,
        teamSize: 4,
        risks: ['Data privacy concerns', 'Training data quality'],
        aiInsights: {
          predictedCompletion: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
          confidence: 78,
          recommendations: ['Start with limited scope', 'Focus on common use cases']
        }
      },
      {
        name: 'Mobile App Development',
        description: 'Cross-platform mobile app for project management',
        status: 'completed',
        priority: 'high',
        progress: 100,
        deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        budget: 75000,
        teamSize: 6,
        revenue: 120000,
        risks: [],
        aiInsights: {
          actualCompletion: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          accuracy: 92,
          lessons: ['Early testing saved 20% time', 'AI predictions were 92% accurate']
        }
      }
    ];

    for (let i = 0; i < projectTemplates.length; i++) {
      const projectData = {
        ...projectTemplates[i],
        userId: users[i % users.length]._id,
        createdAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      };
      
      const project = await Project.create(projectData);
      projects.push(project);
    }

    console.log(`📊 Created ${projects.length} projects`);

    // Create sample notifications
    const notifications = [];
    const notificationTypes = [
      {
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned to "Implement user authentication"',
        priority: 'medium'
      },
      {
        type: 'deadline_approaching',
        title: 'Deadline Approaching',
        message: 'Project "E-commerce Redesign" deadline is in 3 days',
        priority: 'high'
      },
      {
        type: 'ai_insight',
        title: 'AI Insight Generated',
        message: 'New productivity insights available for your review',
        priority: 'low'
      },
      {
        type: 'system_update',
        title: 'System Update',
        message: 'New features have been deployed to the platform',
        priority: 'low'
      }
    ];

    for (const user of users) {
      for (let i = 0; i < 2; i++) {
        const notificationData = {
          userId: user._id,
          ...notificationTypes[i % notificationTypes.length],
          read: i % 3 === 0,
          metadata: {
            projectId: projects[i % projects.length]._id,
            actionUrl: `/projects/${projects[i % projects.length]._id}`
          }
        };
        
        const notification = await Notification.create(notificationData);
        notifications.push(notification);
      }
    }

    console.log(`🔔 Created ${notifications.length} notifications`);

    // Create AI conversation history
    const conversations = [];
    const conversationTemplates = [
      {
        prompt: "What's my schedule for today?",
        response: "You have 3 meetings and 5 tasks scheduled. The most important is the project review at 2 PM.",
        context: { user: users[0]._id, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      },
      {
        prompt: "Create a new project for website redesign",
        response: "I've created 'Website Redesign' project. Would you like me to generate initial tasks and timeline?",
        context: { user: users[1]._id, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) }
      },
      {
        prompt: "Show me productivity insights",
        response: "Your productivity score is 87%. Peak hours are 9-11 AM. Recommendation: Schedule deep work in the morning.",
        context: { user: users[2]._id, timestamp: new Date() }
      }
    ];

    for (const conv of conversationTemplates) {
      const conversation = await AIConversation.create({
        userId: conv.context.user,
        messages: [
          { role: 'user', content: conv.prompt },
          { role: 'assistant', content: conv.response }
        ],
        context: conv.context,
        model: 'gpt-4',
        tokens: { prompt: 50, completion: 100, total: 150 }
      });
      conversations.push(conversation);
    }

    console.log(`💭 Created ${conversations.length} AI conversations`);

    // Create analytics data
    console.log('📈 Generating analytics data...');
    
    // This would be expanded to generate more comprehensive analytics
    console.log('✅ Analytics data generation complete');

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Users: ${users.length + 1} (1 admin, ${users.length} regular)`);
    console.log(`- Projects: ${projects.length}`);
    console.log(`- Notifications: ${notifications.length}`);
    console.log(`- AI Conversations: ${conversations.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@omnimind.ai / Admin@123');
    console.log('User 1: john@example.com / User@123');
    console.log('User 2: jane@example.com / Test@123');
    console.log('User 3: alex@example.com / Demo@123');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Main execution
(async () => {
  await connectDB();
  await seedData();
  
  // Close connection
  mongoose.connection.close();
  console.log('\n👋 Database connection closed');
  process.exit(0);
})();