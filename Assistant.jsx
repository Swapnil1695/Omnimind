import { useState, useRef, useEffect } from 'react';
import { FiSend, FiMic, FiMicOff, FiVolume2, FiVolumeX, FiMessageSquare, FiHistory, FiSettings, FiHelpCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import VoiceAssistant from '../components/assistant/VoiceAssistant';
import ChatInterface from '../components/assistant/ChatInterface';
import CommandHistory from '../components/assistant/CommandHistory';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { toast } from 'react-hot-toast';

const Assistant = () => {
  const {
    isListening,
    isSpeaking,
    transcript,
    conversation,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    sendMessage,
    clearConversation,
  } = useVoiceAssistant();

  const [inputMessage, setInputMessage] = useState('');
  const [view, setView] = useState('chat');
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    autoSpeak: true,
    language: 'en-US',
    wakeWord: 'hey omnimind',
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const message = inputMessage.trim();
    setInputMessage('');
    
    try {
      await sendMessage(message);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickCommands = [
    { command: 'Schedule meeting for tomorrow at 2 PM', icon: '📅' },
    { command: 'Create a new project for website redesign', icon: '🚀' },
    { command: 'What are my tasks for today?', icon: '📋' },
    { command: 'Analyze my productivity this week', icon: '📊' },
    { command: 'Find time for deep work this week', icon: '⏱️' },
    { command: 'Check for project risks', icon: '⚠️' },
  ];

  const capabilities = [
    { title: 'Project Management', description: 'Create, track, and analyze projects' },
    { title: 'Schedule Optimization', description: 'Find optimal times for meetings and work' },
    { title: 'Task Automation', description: 'Automate repetitive tasks and workflows' },
    { title: 'Risk Detection', description: 'Identify potential issues before they occur' },
    { title: 'Data Analysis', description: 'Analyze productivity patterns and trends' },
    { title: 'Multi-language', description: 'Support for 50+ languages with translation' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            OmniVoice Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Your AI-powered productivity companion
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={isListening ? 'danger' : 'primary'}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? (
              <>
                <FiMicOff className="mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <FiMic className="mr-2" />
                Start Voice
              </>
            )}
          </Button>
          
          <Button
            variant={isSpeaking ? 'danger' : 'outline'}
            onClick={isSpeaking ? stopSpeaking : () => speak('Hello, how can I help you today?')}
            disabled={!settings.voiceEnabled}
          >
            {isSpeaking ? (
              <>
                <FiVolumeX className="mr-2" />
                Stop Speaking
              </>
            ) : (
              <>
                <FiVolume2 className="mr-2" />
                Test Voice
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Voice Listening Indicator */}
      {isListening && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-red-500 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Listening...
              </p>
              {transcript && (
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  {transcript}
                </p>
              )}
            </div>
            <button
              onClick={stopListening}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <FiMessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Chat with OmniVoice
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ask anything about your projects, schedule, or tasks
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Toggle view"
                >
                  <FiHistory className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('settings')}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Settings"
                >
                  <FiSettings className="w-5 h-5" />
                </button>
                <button
                  onClick={clearConversation}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear Chat
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {view === 'chat' ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {conversation.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4">
                          <FiMessageSquare className="w-full h-full" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Start a conversation
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                          Ask me about your projects, schedule meetings, get productivity insights, or just say hello!
                        </p>
                      </div>
                    ) : (
                      conversation.map((msg, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                              }`}
                          >
                            <div className="flex items-center mb-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${msg.role === 'user' ? 'bg-blue-500' : 'bg-purple-500 text-white'}`}>
                                {msg.role === 'user' ? 'You' : 'AI'}
                              </div>
                              <span className="text-xs opacity-75">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Commands */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Try asking:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickCommands.map((cmd, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setInputMessage(cmd.command);
                            setTimeout(() => {
                              document.querySelector('textarea')?.focus();
                            }, 0);
                          }}
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                          <span className="mr-2">{cmd.icon}</span>
                          {cmd.command}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <textarea
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                          rows={2}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                          {inputMessage.length}/2000
                        </div>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSend className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : view === 'history' ? (
                <motion.div
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CommandHistory />
                </motion.div>
              ) : (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Assistant Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.voiceEnabled}
                          onChange={(e) => setSettings({ ...settings, voiceEnabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Enable Voice</span>
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">
                        Allow the assistant to speak responses
                      </p>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.autoSpeak}
                          onChange={(e) => setSettings({ ...settings, autoSpeak: e.target.checked })}
                          disabled={!settings.voiceEnabled}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className={`${!settings.voiceEnabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          Auto-speak Responses
                        </span>
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">
                        Automatically speak AI responses
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="de-DE">German</option>
                        <option value="ja-JP">Japanese</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Wake Word
                      </label>
                      <input
                        type="text"
                        value={settings.wakeWord}
                        onChange={(e) => setSettings({ ...settings, wakeWord: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="Enter wake word for voice activation"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Say this word to activate voice listening
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setView('chat')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Settings
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assistant Status */}
          <Card title="Assistant Status">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Voice Status</span>
                <span className={`px-2 py-1 text-xs rounded-full ${isListening ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {isListening ? 'Listening' : 'Ready'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Voice Output</span>
                <span className={`px-2 py-1 text-xs rounded-full ${isSpeaking ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                  {isSpeaking ? 'Speaking' : 'Silent'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Conversation</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {conversation.length} messages
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Language</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {settings.language.split('-')[0]}
                </span>
              </div>
            </div>
          </Card>

          {/* Capabilities */}
          <Card title="What I Can Do">
            <div className="space-y-3">
              {capabilities.map((capability, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {capability.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {capability.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Voice Assistant Widget */}
          <VoiceAssistant />

          {/* Tips & Tricks */}
          <Card title="Tips & Tricks">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center">
                  <FiHelpCircle className="w-4 h-4 mr-2" />
                  Voice Commands
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                  <li>"Schedule meeting tomorrow 2 PM"</li>
                  <li>"What's on my calendar today?"</li>
                  <li>"Create task for project X"</li>
                  <li>"Analyze my productivity"</li>
                </ul>
              </div>
              
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <h4 className="font-medium text-green-800 dark:text-green-300">
                  Pro Tip
                </h4>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Use specific dates and times for better scheduling accuracy.
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <h4 className="font-medium text-purple-800 dark:text-purple-300">
                  Quick Actions
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                  Click any quick command above to try it instantly.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Assistant;