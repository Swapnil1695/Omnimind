const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const logger = require('../utils/logger');

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://omnimind.ai']
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key',
    'X-Client-Version',
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
};

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use API key if provided, otherwise use IP
    return req.headers['x-api-key'] || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(options.statusCode).json(options.message);
  },
});

// Slow down configuration (additional protection)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs
  delayMs: 100, // Add 100ms of delay per request above delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});

// Login rate limiting (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip,
});

// Password reset rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again after 1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip,
});

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Skip validation for public routes
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/auth/reset-password',
    '/api/health',
    '/api/docs',
  ];
  
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required',
    });
  }
  
  // In production, validate against database
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn(`Invalid API key attempt: ${apiKey}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
  }
  
  next();
};

// Request logging middleware
const requestLogger = morgan((tokens, req, res) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTime: tokens['response-time'](req, res),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'anonymous',
  };
  
  // Log at appropriate level based on status code
  if (res.statusCode >= 500) {
    logger.error('HTTP Request Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP Request Warning', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
  
  return null;
}, {
  stream: {
    write: (message) => {
      // Message is already logged above
    },
  },
});

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// File upload validation middleware
const validateFileUpload = (options = {}) => {
  return (req, res, next) => {
    if (!req.file && options.required) {
      return res.status(400).json({
        success: false,
        error: 'File is required',
      });
    }
    
    if (req.file) {
      // Check file size
      if (options.maxSize && req.file.size > options.maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size must be less than ${options.maxSize / 1024 / 1024}MB`,
        });
      }
      
      // Check file type
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const fileType = req.file.mimetype;
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
        
        const isTypeAllowed = options.allowedTypes.some(type => {
          if (type.startsWith('.')) {
            return type.toLowerCase() === `.${fileExtension}`;
          }
          return fileType.startsWith(type);
        });
        
        if (!isTypeAllowed) {
          return res.status(400).json({
            success: false,
            error: `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
          });
        }
      }
    }
    
    next();
  };
};

// Cache control middleware
const cacheControl = (duration = 60) => {
  return (req, res, next) => {
    // Skip cache for authenticated requests
    if (req.user) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      res.set('Cache-Control', `public, max-age=${duration}`);
    }
    next();
  };
};

// Pagination middleware
const paginate = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pagination parameters',
    });
  }
  
  req.pagination = {
    page,
    limit,
    skip,
    sort: req.query.sort || '-createdAt',
  };
  
  next();
};

// Response formatting middleware
const formatResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    const formattedData = {
      success: res.statusCode < 400,
      data: data?.data || data,
      meta: data?.meta || {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      },
    };
    
    // Add pagination info if available
    if (req.pagination && Array.isArray(formattedData.data)) {
      formattedData.meta.pagination = {
        page: req.pagination.page,
        limit: req.pagination.limit,
        total: data?.total || formattedData.data.length,
        pages: data?.total ? Math.ceil(data.total / req.pagination.limit) : 1,
      };
    }
    
    // Add error info if present
    if (data?.error) {
      formattedData.error = data.error;
    }
    
    return originalJson.call(this, formattedData);
  };
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id,
  });
  
  next(err);
};

// Maintenance mode middleware
const maintenanceMode = (req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    // Allow health checks and admin routes
    if (req.path === '/api/health' || req.path.startsWith('/api/admin/')) {
      return next();
    }
    
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable for maintenance',
      maintenance: true,
      estimatedRestoration: process.env.MAINTENANCE_ETA,
    });
  }
  
  next();
};

// Request ID middleware
const requestId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};

// Timeout middleware
const timeout = (ms = 30000) => {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout',
        });
      }
    }, ms);
    
    // Clear timeout on response
    const originalEnd = res.end;
    res.end = function(...args) {
      clearTimeout(timeoutId);
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Combine all middleware
const middleware = {
  // Security
  securityHeaders,
  cors: cors(corsOptions),
  mongoSanitize: mongoSanitize(),
  xss: xss(),
  hpp: hpp(),
  
  // Performance
  compression: compression({ level: 6 }),
  
  // Rate limiting
  apiLimiter,
  speedLimiter,
  loginLimiter,
  passwordResetLimiter,
  
  // Logging
  requestLogger,
  errorLogger,
  
  // Custom middleware
  validateApiKey,
  validateRequest,
  validateFileUpload,
  cacheControl,
  paginate,
  formatResponse,
  maintenanceMode,
  requestId,
  timeout,
  
  // Export config for use in routes
  corsOptions,
};

module.exports = middleware;