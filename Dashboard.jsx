import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiPlus, FiTrendingUp, FiClock, FiCheckCircle, 
  FiCalendar, FiBell, FiMessageSquare, FiActivity,
  FiChevronRight, FiDownload, FiFilter, FiSearch
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import { useNotifications } from '../hooks/useNotifications';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StatsCard from '../components/dashboard/StatsCard';
import QuickActions from '../components/dashboard/QuickActions';
import RecentActivity from '../components/dashboard/RecentActivity';
import AdBanner from '../components/ads/AdBanner';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { notifications, unreadCount } = useNotifications();
  const [stats, setStats] = useState({
    activeProjects: 0,
    tasksCompleted: 0,
    timeSaved: 0,
    productivityScore: 0,
    upcomingDeadlines: 0,
    teamMembers: 0,
  });

  const [recentProjects, setRecentProjects] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);

  useEffect(() => {
    // Calculate stats from projects
    const activeProjects = projects.filter(p => p.status === 'in-progress').length;
    const totalTasks = projects.reduce((sum, project) => sum + (project.tasks?.length || 0), 0);
    const completedTasks = projects.reduce((sum, project) => {
      return sum + (project.tasks?.filter(t => t.status === 'completed').length || 0);
    }, 0);
    
    // Mock data for demonstration
    setStats({
      activeProjects,
      tasksCompleted: completedTasks,
      timeSaved: Math.floor(Math.random() * 100) + 50,
      productivityScore: Math.floor(Math.random() * 30) + 70,
      upcomingDeadlines: projects.filter(p => {
        if (!p.dueDate) return false;
        const dueDate = new Date(p.dueDate);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }).length,
      teamMembers: Math.floor(Math.random() * 10) + 1,
    });

    // Set recent projects (last 3 modified)
    setRecentProjects([...projects]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 3));

    // Mock today's schedule
    setTodaySchedule([
      { id: 1, time: '09:00 AM', title: 'Team Standup', type: 'meeting', project: 'Website Redesign' },
      { id: 2, time: '11:00 AM', title: 'Design Review', type: 'review', project: 'Mobile App' },
      { id: 3, time: '02:00 PM', title: 'Client Call', type: 'meeting', project: 'Marketing Campaign' },
      { id: 4, time: '04:00 PM', title: 'Code Review', type: 'review', project: 'API Development' },
    ]);
  }, [projects]);

  const quickActions = [
    {
      title: 'Create New Project',
      description: 'Start a new project with AI assistance',
      icon: FiPlus,
      color: 'blue',
      action: '/projects/new',
    },
    {
      title: 'Schedule Meeting',
      description: 'Let AI find the best time',
      icon: FiCalendar,
      color: 'green',
      action: '/schedule/new',
    },
    {
      title: 'Talk to Assistant',
      description: 'Get help with your tasks',
      icon: FiMessageSquare,
      color: 'purple',
      action: '/assistant',
    },
    {
      title: 'Generate Report',
      description: 'Weekly productivity insights',
      icon: FiTrendingUp,
      color: 'orange',
      action: '/analytics',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getGreeting()}, {user?.firstName || 'there'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here's what's happening with your projects today.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
            />
          </div>
          <Button>
            <FiDownload className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Active Projects"
          value={stats.activeProjects}
          change="+2 this week"
          icon={FiActivity}
          color="blue"
          trend="up"
        />
        <StatsCard
          title="Tasks Completed"
          value={stats.tasksCompleted}
          change="+12 today"
          icon={FiCheckCircle}
          color="green"
          trend="up"
        />
        <StatsCard
          title="Hours Saved"
          value={stats.timeSaved}
          change="By AI automation"
          icon={FiClock}
          color="purple"
          trend="up"
        />
        <StatsCard
          title="Productivity"
          value={`${stats.productivityScore}%`}
          change="+5% from last week"
          icon={FiTrendingUp}
          color="orange"
          trend="up"
        />
        <StatsCard
          title="Deadlines"
          value={stats.upcomingDeadlines}
          change="In next 7 days"
          icon={FiCalendar}
          color="red"
          trend="neutral"
        />
        <StatsCard
          title="Team Online"
          value={stats.teamMembers}
          change="All available"
          icon={FiBell}
          color="indigo"
          trend="neutral"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card title="Quick Actions" subtitle="Get things done faster">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    to={action.action}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start">
                      <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30 flex items-center justify-center mr-4`}>
                        <Icon className={`w-5 h-5 text-${action.color}-600 dark:text-${action.color}-400`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {action.description}
                        </p>
                      </div>
                      <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Recent Projects */}
          <Card 
            title="Recent Projects" 
            subtitle="Your active projects"
            actions={
              <Link to="/projects" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                View All
              </Link>
            }
          >
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {project.title.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {project.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {project.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {project.progress || 0}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Progress
                        </div>
                      </div>
                      <Link
                        to={`/projects/${project.id}`}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4">
                  <FiActivity className="w-full h-full" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No projects yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first project to get started
                </p>
                <Link to="/projects/new">
                  <Button>
                    <FiPlus className="mr-2" />
                    Create Project
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <Card title="Today's Schedule" subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}>
            <div className="space-y-4">
              {todaySchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.time} • {item.project}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'meeting' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                    {item.type}
                  </span>
                </div>
              ))}
              <Link
                to="/schedule"
                className="block text-center py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                View Full Calendar →
              </Link>
            </div>
          </Card>

          {/* AI Assistant Widget */}
          <Card
            variant="gradient"
            title="OmniMind Assistant"
            subtitle="Ready to help you with tasks"
          >
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                I can help you with:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">Schedule optimization</span>
                </li>
                <li className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">Project risk analysis</span>
                </li>
                <li className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">Meeting preparation</span>
                </li>
                <li className="flex items-center">
                  <FiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">Task prioritization</span>
                </li>
              </ul>
              
              <Link to="/assistant">
                <Button fullWidth>
                  <FiMessageSquare className="mr-2" />
                  Start Conversation
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Activity */}
          <RecentActivity />

          {/* Ad Banner */}
          <AdBanner 
            size="medium"
            placement="dashboard-sidebar"
          />

          {/* Notifications Preview */}
          <Card title="Notifications" subtitle={`${unreadCount} unread`}>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg ${notification.read ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : notification.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {notification.type === 'error' ? '⚠️' : notification.type === 'success' ? '✓' : 'ℹ️'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                to="/notifications"
                className="block text-center py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                View All Notifications →
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Section - Charts/Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Insights */}
        <Card title="Productivity Insights" subtitle="Weekly performance">
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="10" strokeDasharray={`${stats.productivityScore * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="50" textAnchor="middle" dy="0.3em" className="text-2xl font-bold fill-gray-900 dark:fill-gray-100">
                    {stats.productivityScore}%
                  </text>
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Your productivity score is {stats.productivityScore >= 80 ? 'excellent' : stats.productivityScore >= 60 ? 'good' : 'needs improvement'}
              </p>
            </div>
          </div>
        </Card>

        {/* Time Distribution */}
        <Card title="Time Distribution" subtitle="Hours spent this week">
          <div className="h-64 flex items-center justify-center">
            <div className="space-y-4 w-full max-w-sm">
              {[
                { label: 'Project Work', hours: 32, color: 'bg-blue-500' },
                { label: 'Meetings', hours: 12, color: 'bg-purple-500' },
                { label: 'Planning', hours: 8, color: 'bg-green-500' },
                { label: 'Administrative', hours: 6, color: 'bg-yellow-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center">
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                    {item.label}
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${(item.hours / 58) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.hours}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;