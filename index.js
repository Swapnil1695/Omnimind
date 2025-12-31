import User from './user.model.js';
import { Project, Task } from './project.model.js';
import Notification from './notification.model.js';
import AIConversation from './ai-conversation.model.js';
import Analytics from './analytics.model.js';

// Export all models
export {
  User,
  Project,
  Task,
  Notification,
  AIConversation,
  Analytics,
};

// Export default
export default {
  User,
  Project,
  Task,
  Notification,
  AIConversation,
  Analytics,
};

// Helper function to initialize models
export const initializeModels = async (mongoose) => {
  try {
    // Create indexes
    await User.createIndexes();
    await Project.createIndexes();
    await Notification.createIndexes();
    await AIConversation.createIndexes();
    await Analytics.createIndexes();
    
    console.log('✅ Database models initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing models:', error);
    throw error;
  }
};

// Schema validation helper
export const validateModel = (modelName, data) => {
  const models = {
    User,
    Project,
    Task,
    Notification,
    AIConversation,
    Analytics,
  };
  
  const Model = models[modelName];
  if (!Model) {
    throw new Error(`Model ${modelName} not found`);
  }
  
  const instance = new Model(data);
  const validationError = instance.validateSync();
  
  if (validationError) {
    const errors = {};
    Object.keys(validationError.errors).forEach(key => {
      errors[key] = validationError.errors[key].message;
    });
    return { valid: false, errors };
  }
  
  return { valid: true, data: instance.toObject() };
};

// Database utility functions
export const getModelStats = async () => {
  const stats = {};
  
  stats.users = await User.countDocuments();
  stats.projects = await Project.countDocuments();
  stats.tasks = await Task.countDocuments();
  stats.notifications = await Notification.countDocuments();
  stats.conversations = await AIConversation.countDocuments();
  stats.analytics = await Analytics.countDocuments();
  
  return stats;
};

// Seed database (for development)
export const seedDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('⚠️  Seeding only allowed in development environment');
    return;
  }
  
  try {
    console.log('🌱 Seeding database...');
    
    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Notification.deleteMany({});
    await AIConversation.deleteMany({});
    await Analytics.deleteMany({});
    
    console.log('✅ Database cleared');
    
    // Add seed data here if needed
    
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// Backup database
export const backupDatabase = async () => {
  const backup = {
    timestamp: new Date(),
    users: await User.find({}),
    projects: await Project.find({}),
    tasks: await Task.find({}),
    notifications: await Notification.find({}),
    conversations: await AIConversation.find({}),
    analytics: await Analytics.find({}),
  };
  
  return backup;
};

// Restore database
export const restoreDatabase = async (backupData) => {
  if (!backupData || !backupData.timestamp) {
    throw new Error('Invalid backup data');
  }
  
  try {
    console.log(`🔄 Restoring database from ${backupData.timestamp}`);
    
    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Notification.deleteMany({});
    await AIConversation.deleteMany({});
    await Analytics.deleteMany({});
    
    // Restore data
    if (backupData.users && backupData.users.length > 0) {
      await User.insertMany(backupData.users);
    }
    
    if (backupData.projects && backupData.projects.length > 0) {
      await Project.insertMany(backupData.projects);
    }
    
    if (backupData.tasks && backupData.tasks.length > 0) {
      await Task.insertMany(backupData.tasks);
    }
    
    if (backupData.notifications && backupData.notifications.length > 0) {
      await Notification.insertMany(backupData.notifications);
    }
    
    if (backupData.conversations && backupData.conversations.length > 0) {
      await AIConversation.insertMany(backupData.conversations);
    }
    
    if (backupData.analytics && backupData.analytics.length > 0) {
      await Analytics.insertMany(backupData.analytics);
    }
    
    console.log('✅ Database restored successfully');
    return true;
  } catch (error) {
    console.error('❌ Error restoring database:', error);
    throw error;
  }
};