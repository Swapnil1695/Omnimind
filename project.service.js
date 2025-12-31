import { apiService } from './api';

class ProjectService {
  async getAllProjects() {
    try {
      // In development, return mock data
      if (import.meta.env.DEV) {
        return await apiService.getMockData('/projects');
      }
      
      return await apiService.getAllProjects();
    } catch (error) {
      console.error('Get all projects error:', error);
      
      // Fallback to mock data in development
      if (import.meta.env.DEV) {
        return await apiService.getMockData('/projects');
      }
      
      throw error;
    }
  }

  async getProject(id) {
    try {
      return await apiService.getProject(id);
    } catch (error) {
      console.error('Get project error:', error);
      throw error;
    }
  }

  async createProject(projectData) {
    try {
      const project = {
        ...projectData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: projectData.status || 'planning',
        progress: 0,
        tasks: [],
        members: [],
        aiInsights: {},
      };
      
      return await apiService.createProject(project);
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  async updateProject(id, updates) {
    try {
      const updatedProject = {
        ...updates,
        id,
        updatedAt: new Date().toISOString(),
      };
      
      return await apiService.updateProject(id, updatedProject);
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      return await apiService.deleteProject(id);
    } catch (error) {
      console.error('Delete project error:', error);
      throw error;
    }
  }

  async getProjectTasks(projectId) {
    try {
      return await apiService.getProjectTasks(projectId);
    } catch (error) {
      console.error('Get project tasks error:', error);
      throw error;
    }
  }

  async createTask(projectId, taskData) {
    try {
      const task = {
        ...taskData,
        id: Date.now().toString(),
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee || null,
        estimatedHours: taskData.estimatedHours || 0,
        actualHours: 0,
        dependencies: taskData.dependencies || [],
        tags: taskData.tags || [],
      };
      
      return await apiService.createTask(projectId, task);
    } catch (error) {
      console.error('Create task error:', error);
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const updatedTask = {
        ...updates,
        id: taskId,
        updatedAt: new Date().toISOString(),
      };
      
      return await apiService.updateTask(taskId, updatedTask);
    } catch (error) {
      console.error('Update task error:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      return await apiService.deleteTask(taskId);
    } catch (error) {
      console.error('Delete task error:', error);
      throw error;
    }
  }

  async analyzeProjectWithAI(projectId) {
    try {
      return await apiService.analyzeProject(projectId);
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Mock AI analysis for development
      if (import.meta.env.DEV) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              risks: [
                { type: 'schedule', description: 'Project timeline may be tight', severity: 'medium' },
                { type: 'resource', description: 'Limited availability of team members', severity: 'low' },
              ],
              suggestions: [
                'Consider breaking down tasks into smaller subtasks',
                'Add buffer time for testing phase',
                'Schedule regular team check-ins',
              ],
              predictions: {
                completionDate: '2024-02-20',
                confidence: 85,
                estimatedHours: 120,
              },
            });
          }, 1000);
        });
      }
      
      throw error;
    }
  }

  async generateProjectSchedule(projectData) {
    try {
      return await apiService.generateSchedule(projectData);
    } catch (error) {
      console.error('Generate schedule error:', error);
      
      // Mock schedule for development
      if (import.meta.env.DEV) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              timeline: {
                startDate: '2024-01-16',
                endDate: '2024-02-15',
                phases: [
                  {
                    name: 'Planning',
                    startDate: '2024-01-16',
                    endDate: '2024-01-20',
                    tasks: 5,
                  },
                  {
                    name: 'Development',
                    startDate: '2024-01-21',
                    endDate: '2024-02-05',
                    tasks: 15,
                  },
                  {
                    name: 'Testing',
                    startDate: '2024-02-06',
                    endDate: '2024-02-12',
                    tasks: 8,
                  },
                  {
                    name: 'Deployment',
                    startDate: '2024-02-13',
                    endDate: '2024-02-15',
                    tasks: 3,
                  },
                ],
              },
              milestones: [
                { date: '2024-01-25', description: 'Complete core features' },
                { date: '2024-02-10', description: 'Finish testing phase' },
              ],
              recommendations: [
                'Schedule daily standup meetings at 10 AM',
                'Block Friday afternoons for code reviews',
                'Consider adding one buffer week for unexpected delays',
              ],
            });
          }, 1500);
        });
      }
      
      throw error;
    }
  }

  async uploadProjectFile(projectId, file) {
    try {
      return await apiService.uploadFile(file, 'project-document');
    } catch (error) {
      console.error('Upload project file error:', error);
      throw error;
    }
  }

  async getProjectAnalytics(projectId, timeframe = 'week') {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/projects/${projectId}/analytics?timeframe=${timeframe}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch project analytics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get project analytics error:', error);
      
      // Mock analytics for development
      if (import.meta.env.DEV) {
        return {
          progress: {
            planned: 100,
            completed: 65,
            remaining: 35,
          },
          tasks: {
            total: 12,
            completed: 8,
            inProgress: 3,
            blocked: 1,
          },
          time: {
            estimated: 160,
            spent: 95,
            remaining: 65,
          },
          team: {
            activeMembers: 3,
            totalMembers: 4,
            productivityScore: 78,
          },
          timeline: [
            { date: '2024-01-10', completed: 2 },
            { date: '2024-01-11', completed: 3 },
            { date: '2024-01-12', completed: 1 },
            { date: '2024-01-13', completed: 2 },
            { date: '2024-01-14', completed: 0 },
            { date: '2024-01-15', completed: 1 },
          ],
        };
      }
      
      throw error;
    }
  }
}

export const projectService = new ProjectService();