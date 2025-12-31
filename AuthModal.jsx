import { useState } from 'react';
import Modal from '../common/Modal';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (data) => {
    setLoading(true);
    try {
      // Implement login logic
      console.log('Login data:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data) => {
    setLoading(true);
    try {
      // Implement signup logic
      console.log('Signup data:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      className="max-w-md"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">O</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome to OmniMind
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Your AI-powered productivity assistant
        </p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'login'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'signup'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          onClick={() => setActiveTab('signup')}
        >
          Create Account
        </button>
      </div>

      {activeTab === 'login' ? (
        <LoginForm onSubmit={handleLogin} loading={loading} />
      ) : (
        <SignupForm onSubmit={handleSignup} loading={loading} />
      )}

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          By continuing, you agree to our{' '}
          <button className="text-blue-600 dark:text-blue-400 hover:underline">
            Terms of Service
          </button>{' '}
          and{' '}
          <button className="text-blue-600 dark:text-blue-400 hover:underline">
            Privacy Policy
          </button>
        </p>
      </div>
    </Modal>
  );
};

export default AuthModal;