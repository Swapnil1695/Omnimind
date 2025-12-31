import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiArrowRight, FiMail, FiLock, FiUser, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import SignupForm from '../components/auth/SignupForm';
import { toast } from 'react-hot-toast';

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (data) => {
    setLoading(true);
    try {
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      };
      
      await register(userData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'AI-powered project management',
    'Intelligent scheduling',
    'Voice assistant with emotional intelligence',
    'Real-time error detection',
    'Smart notifications',
    'Free forever plan available',
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <span className="text-2xl font-bold gradient-text">OmniMind</span>
            </Link>
            <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Create your account
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Start your journey with AI-powered productivity
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <SignupForm onSubmit={handleSignup} loading={loading} />
            
            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right side - Features */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="h-full flex flex-col justify-center max-w-lg mx-auto"
        >
          <div className="mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Why join OmniMind?
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Join thousands of professionals who have transformed their productivity with AI assistance
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                className="flex items-start"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {feature}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">98%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">User Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">70%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Time Saved</div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <p className="text-gray-700 dark:text-gray-300 italic">
              "OmniMind has completely transformed how I manage projects. The AI insights are incredibly accurate."
            </p>
            <div className="mt-4 flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                SC
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Sarah Chen
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Product Manager, TechCorp
                </p>
              </div>
            </div>
          </div>

          {/* Quick start guide */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              <FiArrowRight className="inline mr-2" />
              Quick Start Guide
            </h3>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>1. Create your free account</li>
              <li>2. Connect your work tools</li>
              <li>3. Let AI analyze your patterns</li>
              <li>4. Start receiving intelligent assistance</li>
            </ol>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;