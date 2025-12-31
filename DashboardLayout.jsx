import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TopNav from '../components/common/Header';
import AlertBell from '../components/notifications/AlertBell';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';

const DashboardLayout = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  if (!user) {
    return null; // or loading spinner
  }

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <TopNav />
            </div>
            <div className="flex items-center space-x-4">
              <AlertBell />
              <button className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span>{user.name}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;