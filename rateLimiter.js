const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'ratelimit:'
    }),
    skip: (req) => {
      // Skip rate limiting for certain routes or conditions
      return req.ip === '127.0.0.1' || req.path.includes('/health');
    }
  });
};

// Different rate limits for different types of requests
const rateLimiters = {
  // Strict limits for authentication endpoints
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'),
  
  // Standard API limits
  api: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'),
  
  // More generous limits for AI endpoints (higher cost)
  ai: createRateLimiter(60 * 60 * 1000, 50, 'AI rate limit exceeded'),
  
  // File upload limits
  upload: createRateLimiter(60 * 60 * 1000, 10, 'Too many uploads'),
  
  // Ad serving limits
  ads: createRateLimiter(60 * 60 * 1000, 1000, 'Ad serving limit exceeded'),
  
  // Webhook endpoints
  webhook: createRateLimiter(60 * 1000, 10, 'Too many webhook calls')
};

// Dynamic rate limiting based on user tier
const userTierRateLimiter = (req, res, next) => {
  const userTier = req.user?.tier || 'free';
  
  const tierLimits = {
    free: { windowMs: 15 * 60 * 1000, max: 100 },
    premium: { windowMs: 15 * 60 * 1000, max: 500 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 5000 }
  };

  const limit = tierLimits[userTier];
  
  rateLimit({
    windowMs: limit.windowMs,
    max: limit.max,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { 
      error: `Rate limit exceeded. Upgrade to premium for higher limits.`,
      tier: userTier,
      limit: limit.max
    }
  })(req, res, next);
};

// IP-based rate limiting for public endpoints
const ipRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  1000, // 1000 requests per hour per IP
  'IP rate limit exceeded'
);

// Concurrent request limiter
class ConcurrencyLimiter {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = new Map();
    this.waitingRequests = [];
  }

  async acquire(key) {
    return new Promise((resolve) => {
      const current = this.activeRequests.get(key) || 0;
      
      if (current < this.maxConcurrent) {
        this.activeRequests.set(key, current + 1);
        resolve();
      } else {
        this.waitingRequests.push({ key, resolve });
      }
    });
  }

  release(key) {
    const current = this.activeRequests.get(key);
    if (current > 0) {
      this.activeRequests.set(key, current - 1);
      
      // Check if any waiting requests can be processed
      const waitingIndex = this.waitingRequests.findIndex(req => req.key === key);
      if (waitingIndex !== -1) {
        const { resolve } = this.waitingRequests.splice(waitingIndex, 1)[0];
        this.activeRequests.set(key, (this.activeRequests.get(key) || 0) + 1);
        resolve();
      }
    }
  }
}

// Export rate limiters
module.exports = {
  ...rateLimiters,
  userTierRateLimiter,
  ipRateLimiter,
  ConcurrencyLimiter,
  
  // Rate limiting middleware for specific endpoints
  applyRateLimiting: (type = 'api') => {
    return rateLimiters[type] || rateLimiters.api;
  }
};