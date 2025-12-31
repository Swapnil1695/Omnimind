import { apiService } from './api';

class AIService {
  constructor() {
    this.conversationHistory = [];
    this.maxHistoryLength = 20;
  }

  async sendMessage(message, context = []) {
    try {
      // Add to conversation history
      this.addToHistory({ role: 'user', content: message });
      
      // Get AI response
      const response = await apiService.sendMessage(message, [
        ...this.conversationHistory.slice(-5), // Last 5 messages as context
        ...context,
      ]);
      
      // Add AI response to history
      this.addToHistory({ role: 'assistant', content: response });
      
      return response;
    } catch (error) {
      console.error('Send message error:', error);
      
      // Mock response for development
      if (import.meta.env.DEV) {
        return this.getMockResponse(message);
      }
      
      throw error;
    }
  }

  async analyzeProject(projectId) {
    try {
      return await apiService.analyzeProject(projectId);
    } catch (error) {
      console.error('Analyze project error:', error);
      
      // Mock analysis for development
      if (import.meta.env.DEV) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              summary: "Based on the project data, I've identified several key areas for optimization.",
              risks: [
                {
                  type: 'schedule',
                  description: 'The timeline appears ambitious given the current resource allocation.',
                  severity: 'medium',
                  suggestion: 'Consider extending the deadline by 2 weeks or adding more team members.',
                },
                {
                  type: 'dependency',
                  description: 'Task 4 depends on Task 2, but Task 2 has the highest complexity.',
                  severity: 'high',
                  suggestion: 'Break Task 2 into smaller subtasks to reduce dependency risk.',
                },
              ],
              opportunities: [
                'Automate the testing process to save 15 hours per week.',
                'Reuse components from previous project to reduce development time.',
                'Implement continuous integration to catch issues earlier.',
              ],
              recommendations: [
                'Schedule weekly risk assessment meetings.',
                'Use agile methodology with 2-week sprints.',
                'Implement daily standup meetings for better communication.',
              ],
            });
          }, 2000);
        });
      }
      
      throw error;
    }
  }

  async generateSchedule(projectData) {
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
                startDate: new Date().toISOString().split('T')[0],
                endDate: this.addDays(new Date(), 30).toISOString().split('T')[0],
                phases: [
                  {
                    name: 'Planning & Setup',
                    duration: 5,
                    tasks: ['Requirements gathering', 'Team allocation', 'Tool setup'],
                  },
                  {
                    name: 'Development',
                    duration: 15,
                    tasks: ['Core feature development', 'Integration testing', 'Code reviews'],
                  },
                  {
                    name: 'Testing & QA',
                    duration: 7,
                    tasks: ['User acceptance testing', 'Bug fixing', 'Performance testing'],
                  },
                  {
                    name: 'Deployment',
                    duration: 3,
                    tasks: ['Production deployment', 'Documentation', 'Training'],
                  },
                ],
              },
              milestones: [
                { week: 1, description: 'Complete project planning' },
                { week: 3, description: 'Finish core development' },
                { week: 4, description: 'Complete testing phase' },
              ],
              resourceAllocation: {
                developers: 3,
                testers: 2,
                designers: 1,
                projectManager: 1,
              },
              criticalPath: ['Task 1', 'Task 3', 'Task 7', 'Task 10'],
            });
          }, 1500);
        });
      }
      
      throw error;
    }
  }

  async detectErrors(projectData) {
    try {
      // This would call your error detection API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            errors: [
              {
                type: 'scheduling',
                description: 'Resource overallocation on Tuesday',
                severity: 'medium',
                suggestion: 'Move Task 5 to Thursday',
              },
              {
                type: 'dependency',
                description: 'Circular dependency detected in tasks 3 and 7',
                severity: 'high',
                suggestion: 'Break the circular dependency by adding an intermediate task',
              },
              {
                type: 'budget',
                description: 'Project spending is 15% over budget',
                severity: 'high',
                suggestion: 'Review non-essential expenses and reallocate budget',
              },
            ],
            warnings: [
              {
                type: 'timeline',
                description: 'No buffer time allocated for unexpected delays',
                suggestion: 'Add 20% buffer time to the schedule',
              },
            ],
            autoFixed: [
              {
                type: 'formatting',
                description: 'Fixed date format inconsistencies',
                action: 'Standardized all dates to YYYY-MM-DD format',
              },
            ],
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Detect errors error:', error);
      throw error;
    }
  }

  async autoFixError(errorType, errorData) {
    try {
      // This would call your auto-fix API
      return new Promise((resolve) => {
        setTimeout(() => {
          const fixes = {
            'scheduling': {
              action: 'Rescheduled conflicting tasks',
              details: 'Moved Task 5 from Tuesday to Thursday to resolve overallocation',
              success: true,
            },
            'dependency': {
              action: 'Added intermediate task',
              details: 'Created Task 8 as intermediate between Task 3 and Task 7',
              success: true,
            },
            'formatting': {
              action: 'Standardized formatting',
              details: 'Converted all text to consistent formatting',
              success: true,
            },
          };
          
          resolve(fixes[errorType] || {
            action: 'Manual review required',
            details: 'This error type requires manual intervention',
            success: false,
          });
        }, 800);
      });
    } catch (error) {
      console.error('Auto fix error:', error);
      throw error;
    }
  }

  async transcribeAudio(audioBlob) {
    try {
      // This would call your speech-to-text API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Transcribe audio error:', error);
      
      // Mock transcription for development
      if (import.meta.env.DEV) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              text: "This is a mock transcription of the audio. In a real application, this would be the actual transcribed text from the speech-to-text service.",
              confidence: 0.85,
              language: 'en-US',
            });
          }, 1000);
        });
      }
      
      throw error;
    }
  }

  async translateText(text, targetLanguage) {
    try {
      // This would call your translation API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, targetLanguage }),
      });
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Translate text error:', error);
      throw error;
    }
  }

  async summarizeText(text, maxLength = 200) {
    try {
      // This would call your summarization API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, maxLength }),
      });
      
      if (!response.ok) {
        throw new Error('Summarization failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Summarize text error:', error);
      throw error;
    }
  }

  // Helper methods
  addToHistory(message) {
    this.conversationHistory.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
    
    // Keep history within limit
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  getHistory() {
    return [...this.conversationHistory];
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getMockResponse(message) {
    const responses = {
      'hello': 'Hello! How can I assist you today?',
      'hi': 'Hi there! I\'m OmniMind, your AI assistant. How can I help?',
      'help': 'I can help you with:\n1. Project management\n2. Schedule planning\n3. Task organization\n4. Error detection\n5. Data analysis\nWhat would you like assistance with?',
      'create project': 'I can help you create a new project. What would you like to name it?',
      'schedule meeting': 'Sure! When would you like to schedule the meeting?',
      'tasks': 'I can show you your tasks. Would you like to see:\n1. Today\'s tasks\n2. This week\'s tasks\n3. All tasks',
      'analyze': 'I can analyze your project data to identify risks and opportunities. Which project would you like me to analyze?',
      'thanks': 'You\'re welcome! Is there anything else I can help you with?',
      'bye': 'Goodbye! Feel free to reach out if you need assistance.',
    };
    
    const lowerMessage = message.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }
    
    // Default response
    return `I understand you said: "${message}". As an AI assistant, I can help with project management, scheduling, and task organization. Could you please be more specific about what you need help with?`;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Emotional intelligence analysis
  async analyzeSentiment(text) {
    try {
      // This would call your sentiment analysis API
      return new Promise((resolve) => {
        setTimeout(() => {
          const positiveWords = ['good', 'great', 'excellent', 'happy', 'thanks'];
          const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated'];
          
          const words = text.toLowerCase().split(/\s+/);
          let score = 0;
          
          words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
          });
          
          let sentiment = 'neutral';
          if (score > 0) sentiment = 'positive';
          if (score < 0) sentiment = 'negative';
          
          resolve({
            sentiment,
            score,
            confidence: Math.abs(score) / words.length,
          });
        }, 500);
      });
    } catch (error) {
      console.error('Analyze sentiment error:', error);
      throw error;
    }
  }

  // Generate insights from data
  async generateInsights(data, context) {
    try {
      // This would call your insights generation API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            insights: [
              'Productivity peaks between 10 AM and 2 PM',
              'Team collaboration is strongest on Tuesdays and Thursdays',
              'Most errors occur in the late afternoon (3-5 PM)',
              'Project completion rate increases by 25% with daily standups',
            ],
            recommendations: [
              'Schedule important meetings in the morning',
              'Allocate complex tasks to Tuesday/Thursday',
              'Add review sessions in the late afternoon',
              'Continue daily standup meetings',
            ],
            predictions: {
              nextWeekProductivity: 85,
              estimatedCompletion: '2024-02-20',
              riskLevel: 'medium',
            },
          });
        }, 1500);
      });
    } catch (error) {
      console.error('Generate insights error:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();