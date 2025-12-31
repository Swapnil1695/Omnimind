const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// JWT configuration
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRE || '7d',
  refreshExpiresIn: '30d',
  algorithm: 'HS256',
};

// Generate JWT token
const generateToken = (userId, userData = {}) => {
  const payload = {
    userId,
    ...userData,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
    algorithm: JWT_CONFIG.algorithm,
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.refreshExpiresIn,
    algorithm: JWT_CONFIG.algorithm,
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret, {
      algorithms: [JWT_CONFIG.algorithm],
    });
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    return null;
  }
};

// Decode JWT token without verification
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error(`Token decode error: ${error.message}`);
    return null;
  }
};

// Password hashing
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Password verification
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate random password
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash verification token for storage
const hashVerificationToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate API key
const generateApiKey = () => {
  return `omni_${crypto.randomBytes(16).toString('hex')}`;
};

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

// Add token to blacklist
const blacklistToken = (token, expiresIn) => {
  tokenBlacklist.add(token);
  
  // Auto-remove after expiration
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, expiresIn * 1000);
};

// Check if token is blacklisted
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Rate limiting configuration
const rateLimits = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
  },
  api: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
  },
};

// Password policy
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*',
};

// Validate password against policy
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters`);
  }
  
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (passwordPolicy.requireSpecialChars) {
    const specialCharsRegex = new RegExp(`[${passwordPolicy.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharsRegex.test(password)) {
      errors.push(`Password must contain at least one special character: ${passwordPolicy.specialChars}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate email
const validateEmail = (email) => {
  return emailRegex.test(email);
};

// Generate OTP (One-Time Password)
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

// Session management
const sessions = new Map();

// Create session
const createSession = (userId, userData) => {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    userId,
    userData,
    createdAt: new Date(),
    lastAccessed: new Date(),
    ip: null,
    userAgent: null,
    isValid: true,
  };
  
  sessions.set(sessionId, session);
  
  // Cleanup old sessions periodically (in production, use Redis TTL)
  setTimeout(() => {
    sessions.delete(sessionId);
  }, 24 * 60 * 60 * 1000); // 24 hours
  
  return session;
};

// Get session
const getSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastAccessed = new Date();
  }
  return session;
};

// Invalidate session
const invalidateSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.isValid = false;
  }
  sessions.delete(sessionId);
};

// Check session validity
const isSessionValid = (sessionId) => {
  const session = getSession(sessionId);
  return session && session.isValid;
};

// Cleanup expired sessions
const cleanupSessions = () => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const [sessionId, session] of sessions.entries()) {
    if (session.lastAccessed < twentyFourHoursAgo) {
      sessions.delete(sessionId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000);

module.exports = {
  JWT_CONFIG,
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  hashPassword,
  verifyPassword,
  generateRandomPassword,
  generateVerificationToken,
  generateResetToken,
  hashVerificationToken,
  generateApiKey,
  generateSessionId,
  blacklistToken,
  isTokenBlacklisted,
  rateLimits,
  passwordPolicy,
  validatePassword,
  validateEmail,
  generateOTP,
  createSession,
  getSession,
  invalidateSession,
  isSessionValid,
  sessions,
  emailRegex,
};