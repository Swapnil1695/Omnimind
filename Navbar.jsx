import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiGrid,
  FiCalendar,
  FiMessageSquare,
  FiBell,
  FiSettings,
  FiDollarSign,
  FiHelpCircle,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/projects', icon: FiGrid, label: 'Projects' },
    { path: '/schedule', icon: FiCalendar, label: 'Schedule' },
    { path: '/assistant', icon: FiMessageSquare, label: 'Assistant' },
    { path: '/notifications', icon: FiBell, label: 'Notifications' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
    { path: '/billing', icon: FiDollarSign, label: 'Billing' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {isExpanded ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="text-xl font-bold gradient-text">OmniMind</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold">O</span>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-6 overflow-y-auto">
        <div className="space-y-2 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {isExpanded && (
                  <span className={`font-medium ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="px-4 my-6">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Help section */}
        <div className="space-y-2 px-4">
          <button className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition w-full">
            <FiHelpCircle className="w-5 h-5" />
            {isExpanded && <span className="font-medium">Help & Support</span>}
          </button>
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition w-full"
          >
            <FiLogOut className="w-5 h-5" />
            {isExpanded && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* User profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            U
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                User Name
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Free Plan
              </p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;