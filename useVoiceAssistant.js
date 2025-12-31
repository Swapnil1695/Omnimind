import { useState, useRef, useCallback } from 'react';
import { aiService } from '../services/ai.service';

export const useVoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
      
      if (finalTranscript) {
        handleCommand(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const handleCommand = async (command) => {
    try {
      // Add user message to conversation
      const userMessage = { role: 'user', content: command, timestamp: new Date() };
      setConversation(prev => [...prev, userMessage]);
      
      // Get AI response
      const response = await aiService.sendMessage(command, conversation);
      
      // Add AI response to conversation
      const aiMessage = { role: 'assistant', content: response, timestamp: new Date() };
      setConversation(prev => [...prev, aiMessage]);
      
      // Speak the response
      speak(response);
      
      return response;
    } catch (err) {
      setError(`Failed to process command: ${err.message}`);
      console.error('Error processing command:', err);
    }
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }

    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }

    synthesisRef.current = new SpeechSynthesisUtterance(text);
    synthesisRef.current.lang = 'en-US';
    synthesisRef.current.rate = 1.0;
    synthesisRef.current.pitch = 1.0;
    synthesisRef.current.volume = 1.0;

    synthesisRef.current.onstart = () => {
      setIsSpeaking(true);
    };

    synthesisRef.current.onend = () => {
      setIsSpeaking(false);
    };

    synthesisRef.current.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(synthesisRef.current);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (message) => {
    return handleCommand(message);
  };

  const clearConversation = () => {
    setConversation([]);
    setTranscript('');
    setError(null);
  };

  return {
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
  };
};