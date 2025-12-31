import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // Handle specific error codes
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', data.message);
          break;
        case 404:
          // Not found
          console.error('Resource not found:', data.message);
          break;
        case 422:
          // Validation error
          console.error('Validation error:', data.errors);
          break;
        case 429:
          // Rate limit exceeded
          console.error('Rate limit exceeded. Please try again later.');
          break;
        case 500:
          // Server error
          console.error('Server error:', data.message);
          break;
        default:
          console.error('API error:', data.message || 'Unknown error');
      }
      
      // Throw formatted error
      const errorMessage = data.message || `Request failed with status ${status}`;
      const formattedError = new Error(errorMessage);
      formattedError.status = status;
      formattedError.data = data;
      throw formattedError;
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
      throw error;
    }
  }
);

// API methods
export const apiService = {
  // Auth
  async login(email, password) {
    return api.post('/auth/login', { email, password });
  },

  async register(userData) {
    return api.post('/auth/register', userData);
  },

  async getCurrentUser() {
    return api.get('/auth/me');
  },

  // Projects
  async getAllProjects() {
    return api.get('/projects');
  },

  async getProject(id) {
    return api.get(`/projects/${id}`);
  },

  async createProject(projectData) {
    return api.post('/projects', projectData);
  },

  async updateProject(id, updates) {
    return api.put(`/projects/${id}`, updates);
  },

  async deleteProject(id) {
    return api.delete(`/projects/${id}`);
  },

  // Tasks
  async getProjectTasks(projectId) {
    return api.get(`/projects/${projectId}/tasks`);
  },

  async createTask(projectId, taskData) {
    return api.post(`/projects/${projectId}/tasks`, taskData);
  },

  async updateTask(taskId, updates) {
    return api.put(`/tasks/${taskId}`, updates);
  },

  async deleteTask(taskId) {
    return api.delete(`/tasks/${taskId}`);
  },

  // Notifications
  async getNotifications() {
    return api.get('/notifications');
  },

  async markAsRead(notificationId) {
    return api.put(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead() {
    return api.put('/notifications/read-all');
  },

  async deleteNotification(notificationId) {
    return api.delete(`/notifications/${notificationId}`);
  },

  async clearNotifications() {
    return api.delete('/notifications');
  },

  // AI Assistant
  async sendMessage(message, context = []) {
    return api.post('/ai/chat', { message, context });
  },

  async analyzeProject(projectId) {
    return api.post(`/ai/analyze/${projectId}`);
  },

  async generateSchedule(projectData) {
    return api.post('/ai/schedule', projectData);
  },

  // User settings
  async updateProfile(userData) {
    return api.put('/user/profile', userData);
  },

  async updatePreferences(preferences) {
    return api.put('/user/preferences', preferences);
  },

  async updateSubscription(subscription) {
    return api.put('/user/subscription', { subscription });
  },

  // Upload
  async uploadFile(file, type = 'document') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Analytics
  async getAnalytics(timeframe = 'week') {
    return api.get(`/analytics?timeframe=${timeframe}`);
  },

  // Mock data for development
  async getMockData(endpoint) {
    if (import.meta.env.DEV) {
      const mockEndpoints = {
        '/projects': [
          {
            id: '1',
            title: 'Website Redesign',
            description: 'Complete redesign of company website',
            status: 'in-progress',
            progress: 65,
            dueDate: '2024-02-15',
            priority: 'high',
            tasks: 12,
            completedTasks: 8,
            members: 3,
          },
          {
            id: '2',
            title: 'Mobile App Development',
            description: 'Build new mobile application',
            status: 'planning',
            progress: 20,
            dueDate: '2024-03-30',
            priority: 'medium',
            tasks: 8,
            completedTasks: 2,
            members: 5,
          },
        ],
        '/notifications': [
          {
            id: '1',
            type: 'info',
            title: 'New Task Assigned',
            message: 'You have been assigned to "Design Review"',
            timestamp: '2024-01-15T10:30:00Z',
            read: false,
            priority: 'normal',
          },
          {
            id: '2',
            type: 'warning',
            title: 'Project Deadline Approaching',
            message: 'Website Redesign project due in 3 days',
            timestamp: '2024-01-14T15:45:00Z',
            read: true,
            priority: 'high',
          },
        ],
      };
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockEndpoints[endpoint] || []);
        }, 500);
      });
    }
    
    throw new Error('Mock data only available in development');
  },
};

export default apiService;