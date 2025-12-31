import { useState } from 'react';
import { FiCheck, FiTrash2, FiFilter, FiBell, FiBellOff, FiSettings, FiRefresh } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from '../components/notifications/NotificationCenter';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { toast } from 'react-hot-toast';

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return notification.type === filter;
  });

  const notificationStats = {
    all: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    read: notifications.filter(n => n.read).length,
    info: notifications.filter(n => n.type === 'info').length,
    success: notifications.filter(n => n.type === 'success').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    error: notifications.filter(n => n.type === 'error').length,
  };

  const handleSelectNotification = (id) => {
    setSelectedNotifications(prev =>
      prev.includes(id)
        ? prev.filter(notificationId => notificationId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleMarkSelectedAsRead = () => {
    selectedNotifications.forEach(id => markAsRead(id));
    setSelectedNotifications([]);
    toast.success('Marked as read');
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Delete ${selectedNotifications.length} notification(s)?`)) {
      selectedNotifications.forEach(id => deleteNotification(id));
      setSelectedNotifications([]);
      toast.success('Notifications deleted');
    }
  };

  const filters = [
    { id: 'all', label: 'All', count: notificationStats.all },
    { id: 'unread', label: 'Unread', count: notificationStats.unread },
    { id: 'read', label: 'Read', count: notificationStats.read },
    { id: 'info', label: 'Info', count: notificationStats.info },
    { id: 'success', label: 'Success', count: notificationStats.success },
    { id: 'warning', label: 'Warning', count: notificationStats.warning },
    { id: 'error', label: 'Error', count: notificationStats.error },
  ];

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
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
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={notificationStats.unread === 0}
          >
            <FiCheck className="mr-2" />
            Mark All Read
          </Button>
          <Button
            variant="danger"
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            <FiTrash2 className="mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {filters.map((filterItem) => (
          <Card
            key={filterItem.id}
            className={`text-center cursor-pointer transition-all hover:shadow-md ${filter === filterItem.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter(filterItem.id)}
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filterItem.count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filterItem.label}
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications List */}
        <div className="lg:col-span-2">
          <Card>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length > 0 && selectedNotifications.length === filteredNotifications.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Select all ({selectedNotifications.length}/{filteredNotifications.length})
                  </span>
                </div>
                
                {selectedNotifications.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleMarkSelectedAsRead}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiCheck className="w-4 h-4 inline mr-1" />
                      Mark Read
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {/* Refresh */}}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Refresh"
                >
                  <FiRefresh className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {/* Filter */}}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Filter"
                >
                  <FiFilter className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <AnimatePresence>
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-4 rounded-lg border transition-all ${notification.read
                          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                          : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800'
                        } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => handleSelectNotification(notification.id)}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={() => handleSelectNotification(notification.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-blue-500"
                        />
                        
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={`font-medium ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'}`}>
                              {notification.title}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          
                          {notification.data && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {notification.data.project && (
                                <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded mr-2">
                                  Project: {notification.data.project}
                                </span>
                              )}
                              {notification.data.task && (
                                <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                  Task: {notification.data.task}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                              title="Mark as read"
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4">
                      <FiBellOff className="w-full h-full" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No notifications
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {filter === 'all' ? 'You\'re all caught up!' : `No ${filter} notifications`}
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notification Center Preview */}
          <NotificationCenter compact />

          {/* Notification Settings */}
          <Card title="Notification Settings">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Delivery Methods
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Push Notifications</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Email Notifications</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">SMS Alerts</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Notification Types
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Project Updates</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Task Assignments</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Meeting Reminders</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">System Alerts</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Quiet Hours
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Enable Quiet Hours</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        defaultValue="22:00"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        defaultValue="07:00"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <Button fullWidth>
                <FiSettings className="mr-2" />
                Save Settings
              </Button>
            </div>
          </Card>

          {/* Notification Statistics */}
          <Card title="Notification Stats">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Read Rate</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {notifications.length > 0
                      ? Math.round((notificationStats.read / notifications.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${notifications.length > 0
                        ? (notificationStats.read / notifications.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Response Time</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">2.3h avg</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {notifications.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {notificationStats.unread}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Unread
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Notifications;