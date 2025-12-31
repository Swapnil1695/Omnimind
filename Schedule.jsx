import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUsers, FiPlus, FiFilter, FiRefresh, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';
import CalendarView from '../components/schedule/CalendarView';
import TimeSlotPicker from '../components/schedule/TimeSlotPicker';
import MeetingScheduler from '../components/schedule/MeetingScheduler';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const Schedule = () => {
  const [view, setView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    // Mock meetings data
    const mockMeetings = [
      {
        id: 1,
        title: 'Team Standup',
        description: 'Daily team sync',
        startTime: new Date(new Date().setHours(9, 0, 0, 0)),
        endTime: new Date(new Date().setHours(9, 30, 0, 0)),
        participants: 8,
        type: 'team',
        color: 'blue',
      },
      {
        id: 2,
        title: 'Design Review',
        description: 'Mobile app design feedback',
        startTime: new Date(new Date().setHours(11, 0, 0, 0)),
        endTime: new Date(new Date().setHours(12, 0, 0, 0)),
        participants: 5,
        type: 'review',
        color: 'purple',
      },
      {
        id: 3,
        title: 'Client Meeting',
        description: 'Q2 planning with ABC Corp',
        startTime: new Date(new Date().setHours(14, 0, 0, 0)),
        endTime: new Date(new Date().setHours(15, 30, 0, 0)),
        participants: 3,
        type: 'client',
        color: 'green',
      },
      {
        id: 4,
        title: 'Project Retrospective',
        description: 'Website redesign project review',
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(10, 0, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(11, 30, 0, 0)),
        participants: 6,
        type: 'retro',
        color: 'orange',
      },
    ];
    setMeetings(mockMeetings);
  }, []);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleMeetingCreate = (meetingData) => {
    const newMeeting = {
      id: meetings.length + 1,
      ...meetingData,
      participants: meetingData.participants?.length || 0,
    };
    setMeetings([...meetings, newMeeting]);
    setShowScheduler(false);
  };

  const getUpcomingMeetings = () => {
    const now = new Date();
    return meetings
      .filter(meeting => meeting.startTime > now)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 5);
  };

  const getStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate.getTime() === today.getTime();
    });

    const totalHours = meetings.reduce((total, meeting) => {
      const duration = (meeting.endTime - meeting.startTime) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    const uniqueParticipants = new Set(
      meetings.flatMap(meeting => Array.from({ length: meeting.participants }, (_, i) => `participant-${meeting.id}-${i}`))
    ).size;

    return {
      today: todayMeetings.length,
      totalHours: Math.round(totalHours),
      participants: uniqueParticipants,
      upcoming: getUpcomingMeetings().length,
    };
  };

  const stats = getStats();
  const upcomingMeetings = getUpcomingMeetings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your meetings and optimize your time
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <FiDownload className="mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowScheduler(true)}>
            <FiPlus className="mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.today}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Today's Meetings
              </div>
            </div>
          </div>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FiClock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalHours}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Meeting Hours
              </div>
            </div>
          </div>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.participants}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Participants
              </div>
            </div>
          </div>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.upcoming}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Upcoming Meetings
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar & Time Slots */}
        <div className="lg:col-span-2 space-y-6">
          {/* View Toggles */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {['day', 'week', 'month'].map((viewType) => (
                  <button
                    key={viewType}
                    onClick={() => setView(viewType)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${view === viewType
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    {viewType}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <FiFilter className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <FiRefresh className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Calendar View */}
          <Card title="Calendar">
            <CalendarView
              view={view}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              meetings={meetings}
            />
          </Card>

          {/* Time Slot Optimizer */}
          <Card title="Time Slot Optimizer">
            <TimeSlotPicker
              date={selectedDate}
              meetings={meetings}
              onSlotSelect={(slot) => {
                setShowScheduler(true);
                // You could pre-fill the scheduler with the selected slot
              }}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <Card title="Upcoming Meetings">
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {meeting.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {meeting.description}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full bg-${meeting.color}-500`} />
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <FiClock className="w-4 h-4 mr-1" />
                      {meeting.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {meeting.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <FiUsers className="w-4 h-4 mr-1" />
                      {meeting.participants}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {meeting.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </motion.div>
              ))}
              
              {upcomingMeetings.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3">
                    <FiCalendar className="w-full h-full" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    No upcoming meetings
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Meeting Statistics */}
          <Card title="Meeting Statistics">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Team Meetings</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">40%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Client Meetings</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">25%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Reviews</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">20%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Planning</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">15%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </Card>

          {/* AI Schedule Tips */}
          <Card
            variant="gradient"
            title="AI Schedule Tips"
            subtitle="Based on your patterns"
          >
            <div className="space-y-3">
              <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Best time for deep work:</span> Tuesday & Thursday mornings
                </p>
              </div>
              
              <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Meeting efficiency:</span> Try 25-minute meetings instead of 30
                </p>
              </div>
              
              <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Buffer time needed:</span> Add 15 minutes between meetings
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Meeting Scheduler Modal */}
      {showScheduler && (
        <MeetingScheduler
          onClose={() => setShowScheduler(false)}
          onSubmit={handleMeetingCreate}
          initialDate={selectedDate}
        />
      )}
    </div>
  );
};

export default Schedule;