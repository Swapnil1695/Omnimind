// Application constants
export const APP_NAME = 'OmniMind AI';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-powered productivity assistant';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  PROJECTS: {
    BASE: '/projects',
    DETAIL: '/projects/:id',
    TASKS: '/projects/:id/tasks',
    ANALYTICS: '/projects/:id/analytics',
  },
  TASKS: {
    BASE: '/tasks',
    DETAIL: '/tasks/:id',
    COMPLETE: '/tasks/:id/complete',
    REOPEN: '/tasks/:id/reopen',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    READ: '/notifications/:id/read',
    READ_ALL: '/notifications/read-all',
  },
  AI: {
    CHAT: '/ai/chat',
    ANALYZE: '/ai/analyze/:id',
    SCHEDULE: '/ai/schedule',
    TRANSCRIBE: '/ai/transcribe',
    TRANSLATE: '/ai/translate',
    SUMMARIZE: '/ai/summarize',
  },
  USER: {
    PROFILE: '/user/profile',
    PREFERENCES: '/user/preferences',
    SUBSCRIPTION: '/user/subscription',
    INTEGRATIONS: '/user/integrations',
  },
  ANALYTICS: {
    BASE: '/analytics',
    PRODUCTIVITY: '/analytics/productivity',
    TEAM: '/analytics/team',
    PROJECTS: '/analytics/projects',
  },
};

// Project statuses
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in-progress',
  ON_HOLD: 'on-hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived',
};

export const PROJECT_STATUS_COLORS = {
  [PROJECT_STATUS.PLANNING]: 'bg-yellow-100 text-yellow-800',
  [PROJECT_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [PROJECT_STATUS.ON_HOLD]: 'bg-orange-100 text-orange-800',
  [PROJECT_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [PROJECT_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  [PROJECT_STATUS.ARCHIVED]: 'bg-gray-100 text-gray-800',
};

export const PROJECT_STATUS_ICONS = {
  [PROJECT_STATUS.PLANNING]: '📋',
  [PROJECT_STATUS.IN_PROGRESS]: '🚀',
  [PROJECT_STATUS.ON_HOLD]: '⏸️',
  [PROJECT_STATUS.COMPLETED]: '✅',
  [PROJECT_STATUS.CANCELLED]: '❌',
  [PROJECT_STATUS.ARCHIVED]: '📁',
};

// Task statuses
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
};

export const TASK_STATUS_COLORS = {
  [TASK_STATUS.TODO]: 'bg-gray-100 text-gray-800',
  [TASK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TASK_STATUS.REVIEW]: 'bg-purple-100 text-purple-800',
  [TASK_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [TASK_STATUS.BLOCKED]: 'bg-red-100 text-red-800',
};

// Priority levels
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PRIORITY_COLORS = {
  [PRIORITY.LOW]: 'bg-gray-100 text-gray-800',
  [PRIORITY.MEDIUM]: 'bg-blue-100 text-blue-800',
  [PRIORITY.HIGH]: 'bg-orange-100 text-orange-800',
  [PRIORITY.CRITICAL]: 'bg-red-100 text-red-800',
};

export const PRIORITY_ICONS = {
  [PRIORITY.LOW]: '⬇️',
  [PRIORITY.MEDIUM]: '➡️',
  [PRIORITY.HIGH]: '⬆️',
  [PRIORITY.CRITICAL]: '🔥',
};

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SYSTEM: 'system',
};

export const NOTIFICATION_TYPE_COLORS = {
  [NOTIFICATION_TYPES.INFO]: 'bg-blue-100 text-blue-800',
  [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-100 text-green-800',
  [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-100 text-yellow-800',
  [NOTIFICATION_TYPES.ERROR]: 'bg-red-100 text-red-800',
  [NOTIFICATION_TYPES.SYSTEM]: 'bg-purple-100 text-purple-800',
};

export const NOTIFICATION_TYPE_ICONS = {
  [NOTIFICATION_TYPES.INFO]: 'ℹ️',
  [NOTIFICATION_TYPES.SUCCESS]: '✅',
  [NOTIFICATION_TYPES.WARNING]: '⚠️',
  [NOTIFICATION_TYPES.ERROR]: '❌',
  [NOTIFICATION_TYPES.SYSTEM]: '⚙️',
};

// User roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MANAGER: 'manager',
  GUEST: 'guest',
};

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
};

export const SUBSCRIPTION_FEATURES = {
  [SUBSCRIPTION_PLANS.FREE]: {
    price: '$0',
    features: [
      'Up to 3 projects',
      'Basic task management',
      'Email notifications',
      'Basic AI assistance',
      'Community support',
    ],
    limitations: [
      'Limited to 5 team members',
      'No advanced analytics',
      'Ad-supported',
      'Limited storage',
    ],
  },
  [SUBSCRIPTION_PLANS.PRO]: {
    price: '$14.99/month',
    features: [
      'Unlimited projects',
      'Advanced task management',
      'Push notifications',
      'Advanced AI assistance',
      'Priority support',
      'No ads',
      '10GB storage',
    ],
    limitations: [
      'Limited to 20 team members',
      'No custom branding',
    ],
  },
  [SUBSCRIPTION_PLANS.BUSINESS]: {
    price: '$29/user/month',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Custom branding',
      'API access',
      'Advanced analytics',
      'Dedicated support',
      '100GB storage',
    ],
    limitations: [],
  },
  [SUBSCRIPTION_PLANS.ENTERPRISE]: {
    price: 'Custom',
    features: [
      'Everything in Business',
      'On-premise deployment',
      'Custom AI models',
      'SLA guarantee',
      'Dedicated account manager',
      'Unlimited storage',
      'White-label solution',
    ],
    limitations: [],
  },
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy h:mm a',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  TIME_ONLY: 'h:mm a',
  WEEKDAY: 'EEEE',
  SHORT_DATE: 'MM/dd/yyyy',
};

// Time constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
};

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_USER_NOT_FOUND: 'AUTH_004',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_005',
  
  // Project errors
  PROJECT_NOT_FOUND: 'PROJ_001',
  PROJECT_ACCESS_DENIED: 'PROJ_002',
  PROJECT_VALIDATION_ERROR: 'PROJ_003',
  
  // Task errors
  TASK_NOT_FOUND: 'TASK_001',
  TASK_ACCESS_DENIED: 'TASK_002',
  TASK_VALIDATION_ERROR: 'TASK_003',
  
  // AI errors
  AI_SERVICE_UNAVAILABLE: 'AI_001',
  AI_RATE_LIMIT_EXCEEDED: 'AI_002',
  AI_INVALID_REQUEST: 'AI_003',
  
  // System errors
  SYSTEM_ERROR: 'SYS_001',
  DATABASE_ERROR: 'SYS_002',
  NETWORK_ERROR: 'SYS_003',
  VALIDATION_ERROR: 'SYS_004',
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'omnimind_token',
  USER: 'omnimind_user',
  THEME: 'omnimind_theme',
  LANGUAGE: 'omnimind_language',
  PREFERENCES: 'omnimind_preferences',
  RECENT_PROJECTS: 'omnimind_recent_projects',
  CONVERSATION_HISTORY: 'omnimind_conversation_history',
};

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#8b5cf6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  DARK: '#1f2937',
  LIGHT: '#9ca3af',
};

export const CHART_GRADIENT = [
  '#3b82f6',
  '#4f46e5',
  '#7c3aed',
  '#8b5cf6',
  '#a855f7',
];

// Language support
export const LANGUAGES = {
  EN: { code: 'en', name: 'English', nativeName: 'English' },
  ES: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  FR: { code: 'fr', name: 'French', nativeName: 'Français' },
  DE: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  ZH: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  JA: { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  KO: { code: 'ko', name: 'Korean', nativeName: '한국어' },
  RU: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  AR: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  PT: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  IT: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  NL: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
};

// Default settings
export const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    desktop: true,
    sound: true,
  },
  privacy: {
    dataCollection: true,
    analytics: true,
    personalizedAds: false,
  },
  appearance: {
    compactMode: false,
    showAvatars: true,
    animateTransitions: true,
  },
  shortcuts: {
    createTask: 'c',
    search: '/',
    toggleSidebar: 'b',
    markComplete: 'x',
  },
};

// Maximum limits
export const LIMITS = {
  FREE: {
    projects: 3,
    tasksPerProject: 50,
    teamMembers: 5,
    storageMB: 100,
    aiRequestsPerDay: 50,
  },
  PRO: {
    projects: 50,
    tasksPerProject: 500,
    teamMembers: 20,
    storageMB: 10240, // 10GB
    aiRequestsPerDay: 1000,
  },
  BUSINESS: {
    projects: 500,
    tasksPerProject: 5000,
    teamMembers: 100,
    storageMB: 102400, // 100GB
    aiRequestsPerDay: 10000,
  },
  ENTERPRISE: {
    projects: 999999,
    tasksPerProject: 999999,
    teamMembers: 999999,
    storageMB: 999999999,
    aiRequestsPerDay: 999999,
  },
};

// Export all constants
export default {
  APP_NAME,
  APP_VERSION,
  API_ENDPOINTS,
  PROJECT_STATUS,
  TASK_STATUS,
  PRIORITY,
  NOTIFICATION_TYPES,
  USER_ROLES,
  SUBSCRIPTION_PLANS,
  DATE_FORMATS,
  TIME_CONSTANTS,
  ERROR_CODES,
  STORAGE_KEYS,
  CHART_COLORS,
  LANGUAGES,
  DEFAULT_SETTINGS,
  LIMITS,
};