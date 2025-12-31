const User = require('../models/User');
const { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  hashPassword, 
  verifyPassword,
  generateVerificationToken,
  hashVerificationToken,
  generateResetToken,
  generateOTP,
  validateEmail,
  validatePassword,
  blacklistToken,
} = require('../config/auth');
const { cache } = require('../config/database');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/emailTemplates');
const validator = require('validator');

class AuthController {
  /**
   * Register a new user
   */
  async register(req, res) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      // Validate input
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required',
        });
      }

      // Validate email
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address',
        });
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password validation failed',
          details: passwordValidation.errors,
        });
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Passwords do not match',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists with this email',
        });
      }

      // Create verification token
      const verificationToken = generateVerificationToken();
      const hashedVerificationToken = hashVerificationToken(verificationToken);

      // Create user
      const user = new User({
        name,
        email,
        password,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          theme: 'light',
          language: 'en',
        },
      });

      await user.save();

      // Generate tokens
      const token = generateToken(user._id, {
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const refreshToken = generateRefreshToken(user._id);

      // Store refresh token in cache
      await cache.set(`refresh_token:${user._id}`, refreshToken, 30 * 24 * 60 * 60); // 30 days

      // Send verification email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Verify your OmniMind account',
          template: 'verify-email',
          data: {
            name: user.name,
            verificationToken,
            verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
          },
        });
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
        // Continue without throwing error
      }

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.emailVerificationToken;
      delete userResponse.emailVerificationExpires;
      delete userResponse.passwordResetToken;
      delete userResponse.passwordResetExpires;

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          token,
          refreshToken,
        },
        message: 'Registration successful. Please check your email to verify your account.',
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      // Find user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.accountLockedUntil - new Date()) / (1000 * 60));
        return res.status(423).json({
          success: false,
          error: 'Account is temporarily locked',
          details: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
        });
      }

      // Check password
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          await user.save();
          
          return res.status(423).json({
            success: false,
            error: 'Account locked due to too many failed attempts',
            details: 'Account will be unlocked in 15 minutes.',
          });
        }
        
        await user.save();
        
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          remainingAttempts: 5 - user.failedLoginAttempts,
        });
      }

      // Reset failed login attempts on successful login
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      user.lastLogin = new Date();
      user.stats.lastActive = new Date();
      await user.save();

      // Generate tokens
      const token = generateToken(user._id, {
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
      });

      const refreshToken = generateRefreshToken(user._id);

      // Store refresh token in cache
      const refreshTokenTTL = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
      await cache.set(`refresh_token:${user._id}`, refreshToken, refreshTokenTTL);

      // Update user stats
      await User.findByIdAndUpdate(user._id, {
        $inc: { 'stats.loginCount': 1 },
        $set: { 'stats.lastActive': new Date() },
      });

      // Remove sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.emailVerificationToken;
      delete userResponse.emailVerificationExpires;
      delete userResponse.passwordResetToken;
      delete userResponse.passwordResetExpires;

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        data: {
          user: userResponse,
          token,
          refreshToken,
          expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // in seconds
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
        });
      }

      // Check if refresh token exists in cache
      const cachedRefreshToken = await cache.get(`refresh_token:${decoded.userId}`);
      if (!cachedRefreshToken || cachedRefreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token expired or invalid',
        });
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Generate new access token
      const newAccessToken = generateToken(user._id, {
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
      });

      // Generate new refresh token (optional: rotate refresh token)
      const newRefreshToken = generateRefreshToken(user._id);
      await cache.set(`refresh_token:${user._id}`, newRefreshToken, 30 * 24 * 60 * 60);

      res.json({
        success: true,
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        },
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const { refreshToken } = req.body;

      if (token) {
        // Add token to blacklist
        const decoded = verifyToken(token);
        if (decoded) {
          const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            blacklistToken(token, expiresIn);
          }
        }
      }

      if (refreshToken) {
        const decoded = verifyToken(refreshToken);
        if (decoded && decoded.userId) {
          // Remove refresh token from cache
          await cache.del(`refresh_token:${decoded.userId}`);
        }
      }

      logger.info(`User logged out: ${req.user?.email || 'Unknown'}`);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user._id).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
      }

      const hashedToken = hashVerificationToken(token);

      // Find user with valid verification token
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token',
        });
      }

      // Mark email as verified
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      logger.info(`Email verified: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Email verification failed',
      });
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified',
        });
      }

      // Check rate limit for resend requests
      const resendKey = `verification_resend:${user._id}`;
      const resendCount = await cache.incr(resendKey);
      
      if (resendCount === 1) {
        await cache.expire(resendKey, 3600); // 1 hour
      }
      
      if (resendCount > 3) {
        return res.status(429).json({
          success: false,
          error: 'Too many verification requests. Please try again later.',
        });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const hashedVerificationToken = hashVerificationToken(verificationToken);

      user.emailVerificationToken = hashedVerificationToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      // Send verification email
      await sendEmail({
        to: user.email,
        subject: 'Verify your OmniMind account',
        template: 'verify-email',
        data: {
          name: user.name,
          verificationToken,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
        },
      });

      logger.info(`Verification email resent: ${user.email}`);

      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      logger.error('Resend verification email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resend verification email',
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link.',
        });
      }

      // Check rate limit for password reset requests
      const resetKey = `password_reset:${user._id}`;
      const resetCount = await cache.incr(resetKey);
      
      if (resetCount === 1) {
        await cache.expire(resetKey, 3600); // 1 hour
      }
      
      if (resetCount > 3) {
        return res.status(429).json({
          success: false,
          error: 'Too many password reset requests. Please try again later.',
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const hashedResetToken = hashVerificationToken(resetToken);

      user.passwordResetToken = hashedResetToken;
      user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
      await user.save();

      // Send password reset email
      await sendEmail({
        to: user.email,
        subject: 'Reset your OmniMind password',
        template: 'password-reset',
        data: {
          name: user.name,
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        },
      });

      logger.info(`Password reset requested: ${user.email}`);

      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Passwords do not match',
        });
      }

      // Validate password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password validation failed',
          details: passwordValidation.errors,
        });
      }

      const hashedToken = hashVerificationToken(token);

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token',
        });
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();

      // Send password changed notification
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your OmniMind password has been changed',
          template: 'password-changed',
          data: {
            name: user.name,
            timestamp: new Date().toLocaleString(),
          },
        });
      } catch (emailError) {
        logger.error('Failed to send password changed email:', emailError);
      }

      logger.info(`Password reset successful: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset failed',
      });
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user._id;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'New passwords do not match',
        });
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'New password validation failed',
          details: passwordValidation.errors,
        });
      }

      // Get user with password
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify current password
      const isPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Check if new password is same as current
      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          error: 'New password must be different from current password',
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Send password changed notification
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your OmniMind password has been changed',
          template: 'password-changed',
          data: {
            name: user.name,
            timestamp: new Date().toLocaleString(),
          },
        });
      } catch (emailError) {
        logger.error('Failed to send password changed email:', emailError);
      }

      // Invalidate all existing sessions
      await cache.del(`refresh_token:${user._id}`);

      logger.info(`Password changed: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
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

      // Validate updates
      if (updates.name && updates.name.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Name must be at least 2 characters',
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      logger.info(`Profile updated: ${user.email}`);

      res.json({
        success: true,
        data: { user },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user._id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to delete account',
        });
      }

      // Get user with password
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Password is incorrect',
        });
      }

      // Soft delete: mark as deleted instead of removing from database
      user.deletedAt = new Date();
      user.email = `deleted_${Date.now()}_${user.email}`;
      await user.save();

      // Invalidate tokens
      await cache.del(`refresh_token:${user._id}`);

      logger.info(`Account deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findById(userId).select('stats');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: { stats: user.stats },
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user statistics',
      });
    }
  }

  /**
   * Social login callback
   */
  async socialLoginCallback(req, res) {
    try {
      const { provider, code, redirectUri } = req.body;

      // This is a placeholder for social login implementation
      // In a real application, you would:
      // 1. Exchange code for access token with provider (Google, Facebook, etc.)
      // 2. Get user info from provider
      // 3. Find or create user in database
      // 4. Generate JWT tokens
      // 5. Return tokens and user data

      logger.info(`Social login callback for provider: ${provider}`);

      res.status(501).json({
        success: false,
        error: 'Social login not implemented yet',
      });
    } catch (error) {
      logger.error('Social login callback error:', error);
      res.status(500).json({
        success: false,
        error: 'Social login failed',
      });
    }
  }
}

module.exports = new AuthController();