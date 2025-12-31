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
  FiChevronLeft,
  FiChevronRight,
  FiBarChart2,
  FiUsers,
  FiFolder,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/projects', icon: FiFolder, label: 'Projects', badge: 3 },
    { path: '/schedule', icon: FiCalendar, label: 'Schedule' },
    { path: '/assistant', icon: FiMessageSquare, label: 'Assistant' },
    { path: '/notifications', icon: FiBell, label: 'Notifications', badge: 12 },
  ];

  const secondaryItems = [
    { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { path: '/team', icon: FiUsers, label: 'Team' },
  ];

  const settingsItems = [
    { path: '/settings', icon: FiSettings, label: 'Settings' },
    { path: '/billing', icon: FiDollarSign, label: 'Billing' },
    { path: '/help', icon: FiHelpCircle, label: 'Help' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`
        ${collapsed ? 'w-20' : 'w-64'}
        flex flex-col h-full
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
      `}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">OmniMind</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold">O</span>
          </div>
        )}
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <div className="space-y-1 px-3">
          <h3 className={`
            px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2
            ${collapsed ? 'text-center' : ''}
          `}>
            {collapsed ? '...' : 'Navigation'}
          </h3>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center ${collapsed ? 'justify-center px-3' : 'px-3'}
                  py-3 rounded-lg transition-all relative
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                title={collapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5" />
                {!collapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
                {item.badge && (
                  <span className={`
                    absolute ${collapsed ? 'top-1 right-1' : 'right-3'}
                    inline-flex items-center justify-center px-2 py-1
                    text-xs font-bold leading-none
                    ${active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                    rounded-full
                  `}>
                    {item.badge}
                  </span>
                )}
                {active && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r"></div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 space-y-1 px-3">
          <h3 className={`
            px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2
            ${collapsed ? 'text-center' : ''}
          `}>
            {collapsed ? '...' : 'Tools'}
          </h3>
          
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center ${collapsed ? 'justify-center px-3' : 'px-3'}
                  py-3 rounded-lg transition-all
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                title={collapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5" />
                {!collapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Navigation */}
        <div className="mt-8 space-y-1 px-3">
          <h3 className={`
            px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2
            ${collapsed ? 'text-center' : ''}
          `}>
            {collapsed ? '...' : 'Settings'}
          </h3>
          
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center ${collapsed ? 'justify-center px-3' : 'px-3'}
                  py-3 rounded-lg transition-all
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                title={collapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5" />
                {!collapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          </div>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.subscription === 'free' ? 'Free Plan' : 'Pro Plan'}
              </p>
            </div>
          )}
          
          <button
            onClick={logout}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition ${collapsed ? '' : 'ml-2'}`}
            title="Logout"
          >
            <FiLogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;