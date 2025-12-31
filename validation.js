import Joi from 'joi';
import { AppError } from './errorHandler.js';

const projectSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid('work', 'personal', 'team', 'client').required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  deadline: Joi.date().min('now').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  settings: Joi.object({
    autoDetectTasks: Joi.boolean().default(true),
    sendNotifications: Joi.boolean().default(true),
    shareWithTeam: Joi.boolean().default(false),
  }).optional(),
});

const taskSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('todo', 'in-progress', 'review', 'completed').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  assigneeId: Joi.string().optional(),
  estimatedTime: Joi.number().min(0).optional(),
  dueDate: Joi.date().optional(),
  dependencies: Joi.array().items(Joi.string()).optional(),
});

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('user', 'admin', 'manager').default('user'),
  preferences: Joi.object({
    notifications: Joi.boolean().default(true),
    darkMode: Joi.boolean().default(false),
    language: Joi.string().default('en'),
    timezone: Joi.string().default('UTC'),
  }).optional(),
});

const notificationSchema = Joi.object({
  type: Joi.string().valid('task', 'project', 'system', 'alert', 'promotion').required(),
  title: Joi.string().min(3).max(100).required(),
  message: Joi.string().max(500).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  actionUrl: Joi.string().uri().optional(),
  metadata: Joi.object().optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    return next(new AppError(errorMessage, 400));
  }

  next();
};

export {
  validate,
  projectSchema,
  taskSchema,
  userSchema,
  notificationSchema,
};

export const validateProject = validate(projectSchema);
export const validateTask = validate(taskSchema);
export const validateUser = validate(userSchema);
export const validateNotification = validate(notificationSchema);