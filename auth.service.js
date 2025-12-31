import { apiService } from './api';

class AuthService {
  async login(email, password) {
    try {
      const response = await apiService.login(email, password);
      
      // Store token
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await apiService.register(userData);
      
      // Store token
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await apiService.getCurrentUser();
      return response.user;
    } catch (error) {
      // If token is invalid, clear it
      if (error.status === 401) {
        this.logout();
      }
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    // Optional: Clear other user data
    localStorage.removeItem('user');
    sessionStorage.clear();
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  async updateProfile(userData) {
    try {
      const response = await apiService.updateProfile(userData);
      return response.user;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async updatePassword(currentPassword, newPassword) {
    try {
      const response = await apiService.updateProfile({ 
        currentPassword, 
        newPassword 
      });
      return response;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email) {
    try {
      // This would call your backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to request password reset');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  async verifyEmail(token) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify email');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Social login methods
  async loginWithGoogle() {
    // Redirect to Google OAuth
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  }

  async loginWithGithub() {
    // Redirect to GitHub OAuth
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
  }

  async handleOAuthCallback(code, provider) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to authenticate with ${provider}`);
      }
      
      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      return data;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();