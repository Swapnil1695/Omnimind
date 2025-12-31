import React, { useState, useEffect, useRef, useContext } from 'react';
import { useAuth } from './contexts/authcontext.jsx';
import { useVoiceAssistant } from './hooks/usevoiceassistant.js';
import { useNotifications } from './contexts/notificationcontext.jsx';
import { useProjects } from './contexts/projectcontext.jsx';
import Button from './components/button.jsx';
import Card from './components/card.jsx';
import Modal from './components/modal.jsx';
import LoadingSpinner from './components/loadingspinner.jsx';
import './voice-assistant.css';

const VoiceAssistant = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { projects, createProject, updateTask } = useProjects();
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assistantState, setAssistantState] = useState('idle');
  const messagesEndRef = useRef(null);
  
  const {
    startListening,
    stopListening,
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    language,
    setLanguage,
    availableLanguages,
    voiceResponse,
    sendMessage,
    clearConversation,
    isSpeaking,
    stopSpeaking,
    emotions,
  } = useVoiceAssistant();

  useEffect(() => {
    if (transcript && !isProcessing) {
      handleVoiceCommand(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    // Load previous conversation
    const savedConversation = localStorage.getItem('omnimind_conversation');
    if (savedConversation) {
      setConversation(JSON.parse(savedConversation));
    }
    
    // Set up voice assistant event listeners
    const handleVoiceResponse = (event) => {
      if (event.detail) {
        addToConversation('assistant', event.detail.message, event.detail.action);
        
        if (event.detail.action === 'create_project') {
          handleProjectCreation(event.detail.data);
        } else if (event.detail.action === 'update_task') {
          handleTaskUpdate(event.detail.data);
        }
      }
    };

    window.addEventListener('voice-response', handleVoiceResponse);
    return () => window.removeEventListener('voice-response', handleVoiceResponse);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceCommand = async (command) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    addToConversation('user', command);
    
    try {
      const response = await sendMessage(command, user.id);
      
      if (response.success) {
        // Add assistant's response to conversation
        addToConversation('assistant', response.message, response.action, response.data);
        
        // Handle specific actions
        if (response.action === 'create_project') {
          handleProjectCreation(response.data);
        } else if (response.action === 'schedule_meeting') {
          handleMeetingScheduling(response.data);
        } else if (response.action === 'send_notification') {
          handleNotification(response.data);
        }
      }
    } catch (error) {
      console.error('Error processing command:', error);
      addToConversation('assistant', 'Sorry, I encountered an error processing your request.');
    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  };

  const handleProjectCreation = (projectData) => {
    createProject(projectData);
    addNotification({
      type: 'project',
      title: 'Project Created',
      message: `"${projectData.title}" has been created by voice command`,
      priority: 'medium',
    });
  };

  const handleTaskUpdate = (taskData) => {
    updateTask(taskData.projectId, taskData.taskId, taskData.updates);
    addNotification({
      type: 'task',
      title: 'Task Updated',
      message: `Task "${taskData.taskTitle}" has been updated`,
      priority: 'medium',
    });
  };

  const handleMeetingScheduling = (meetingData) => {
    // Integrate with calendar API
    console.log('Scheduling meeting:', meetingData);
    addNotification({
      type: 'system',
      title: 'Meeting Scheduled',
      message: `Meeting "${meetingData.title}" scheduled for ${meetingData.time}`,
      priority: 'high',
    });
  };

  const handleNotification = (notificationData) => {
    addNotification(notificationData);
  };

  const addToConversation = (sender, message, action, data) => {
    const newMessage = {
      id: Date.now(),
      sender,
      message,
      timestamp: new Date().toISOString(),
      action,
      data,
      emotion: sender === 'assistant' ? emotions.current : null,
    };
    
    setConversation(prev => {
      const updated = [...prev, newMessage];
      localStorage.setItem('omnimind_conversation', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setAssistantState('processing');
    } else {
      startListening();
      setIsListening(true);
      setAssistantState('listening');
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleVoiceCommand(inputText);
      setInputText('');
    }
  };

  const handleQuickAction = (action) => {
    const commands = {
      createProject: "Create a new project for marketing campaign",
      scheduleMeeting: "Schedule a team meeting for tomorrow at 2 PM",
      checkTasks: "What are my pending tasks for today?",
      generateReport: "Generate a progress report for current projects",
      findErrors: "Scan my projects for potential issues",
    };
    
    handleVoiceCommand(commands[action]);
  };

  const getAssistantEmotionClass = () => {
    if (!emotions.current) return 'neutral';
    return emotions.current;
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Card className="voice-assistant-error">
        <h3>Voice Assistant Unavailable</h3>
        <p>Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.</p>
      </Card>
    );
  }

  return (
    <div className="voice-assistant">
      <div className="assistant-header">
        <div className="assistant-avatar">
          <div className={`avatar-emotion ${getAssistantEmotionClass()}`}>
            <span>🤖</span>
          </div>
          <div className="assistant-status">
            <span className={`status-dot ${assistantState}`}></span>
            <span className="status-text">{assistantState}</span>
          </div>
        </div>
        
        <div className="assistant-controls">
          <Button
            onClick={toggleListening}
            variant={isListening ? 'danger' : 'primary'}
            className="listen-button"
          >
            {isListening ? (
              <>
                <span className="pulse-ring"></span>
                <span>Stop Listening</span>
              </>
            ) : (
              'Start Voice Command'
            )}
          </Button>
          
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="language-select"
          >
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          
          <Button
            onClick={() => setShowModal(true)}
            variant="outline"
          >
            View History
          </Button>
        </div>
      </div>

      {transcript && (
        <div className="transcript-display">
          <p>
            <strong>You said:</strong> {transcript}
          </p>
        </div>
      )}

      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="action-buttons">
          <Button onClick={() => handleQuickAction('createProject')} size="small">
            Create Project
          </Button>
          <Button onClick={() => handleQuickAction('scheduleMeeting')} size="small">
            Schedule Meeting
          </Button>
          <Button onClick={() => handleQuickAction('checkTasks')} size="small">
            Check Tasks
          </Button>
          <Button onClick={() => handleQuickAction('generateReport')} size="small">
            Generate Report
          </Button>
          <Button onClick={() => handleQuickAction('findErrors')} size="small">
            Find Errors
          </Button>
        </div>
      </div>

      <div className="conversation-container">
        <div className="conversation-messages">
          {conversation.slice(-10).map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.sender}`}
            >
              <div className="message-header">
                <span className="message-sender">
                  {msg.sender === 'user' ? 'You' : 'OmniMind'}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="message-content">
                {msg.message}
                {msg.action && (
                  <span className="message-action">
                    Action: {msg.action}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleTextSubmit} className="text-input-form">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your command here..."
            disabled={isProcessing}
          />
          <Button type="submit" disabled={isProcessing || !inputText.trim()}>
            Send
          </Button>
        </form>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="Conversation History">
          <div className="conversation-history">
            <div className="history-header">
              <Button onClick={clearConversation} variant="outline" size="small">
                Clear History
              </Button>
            </div>
            
            <div className="history-messages">
              {conversation.map((msg) => (
                <div key={msg.id} className={`history-message ${msg.sender}`}>
                  <div className="history-message-content">
                    <strong>{msg.sender === 'user' ? 'You' : 'Assistant'}:</strong>
                    <p>{msg.message}</p>
                    <small>
                      {new Date(msg.timestamp).toLocaleString()}
                      {msg.action && ` • Action: ${msg.action}`}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VoiceAssistant;