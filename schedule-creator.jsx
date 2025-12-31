import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from './contexts/authcontext.jsx';
import { useProjects } from './contexts/projectcontext.jsx';
import { useNotifications } from './contexts/notificationcontext.jsx';
import Calendar from 'react-calendar';
import Button from './components/button.jsx';
import Card from './components/card.jsx';
import Modal from './components/modal.jsx';
import LoadingSpinner from './components/loadingspinner.jsx';
import './schedule-creator.css';

const ScheduleCreator = () => {
  const { user } = useAuth();
  const { projects, tasks } = useProjects();
  const { addNotification } = useNotifications();
  
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'meeting',
    priority: 'medium',
    attendees: [],
    projectId: '',
  });
  const [optimizing, setOptimizing] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    loadEvents();
    detectConflicts();
  }, [date, tasks]);

  const loadEvents = () => {
    // Load events from API/local storage
    const savedEvents = localStorage.getItem('omnimind_events');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  };

  const saveEvents = (eventsList) => {
    localStorage.setItem('omnimind_events', JSON.stringify(eventsList));
  };

  const detectConflicts = () => {
    const conflicts = [];
    const dayEvents = events.filter(event => 
      new Date(event.date).toDateString() === date.toDateString()
    );
    
    dayEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    for (let i = 1; i < dayEvents.length; i++) {
      const prevEnd = new Date(dayEvents[i-1].endTime);
      const currentStart = new Date(dayEvents[i].startTime);
      
      if (currentStart < prevEnd) {
        conflicts.push({
          event1: dayEvents[i-1],
          event2: dayEvents[i],
          overlap: Math.abs(prevEnd - currentStart) / (1000 * 60), // minutes
        });
      }
    }
    
    setConflicts(conflicts);
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setNewEvent({
      title: '',
      description: '',
      startTime: `${date.toISOString().split('T')[0]}T09:00`,
      endTime: `${date.toISOString().split('T')[0]}T10:00`,
      type: 'meeting',
      priority: 'medium',
      attendees: [],
      projectId: '',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    const event = {
      id: selectedEvent?.id || Date.now(),
      ...newEvent,
      date: date.toISOString().split('T')[0],
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (selectedEvent) {
      setEvents(prev => {
        const updated = prev.map(e => e.id === selectedEvent.id ? event : e);
        saveEvents(updated);
        return updated;
      });
    } else {
      setEvents(prev => {
        const updated = [...prev, event];
        saveEvents(updated);
        return updated;
      });
    }

    setShowEventModal(false);
    
    addNotification({
      type: 'system',
      title: selectedEvent ? 'Event Updated' : 'Event Created',
      message: `"${event.title}" has been ${selectedEvent ? 'updated' : 'added to your schedule'}`,
      priority: 'medium',
    });

    if (newEvent.type === 'meeting') {
      // Auto-send meeting invites
      sendMeetingInvites(event);
    }
  };

  const sendMeetingInvites = (event) => {
    // Integrate with email/calendar API
    console.log('Sending invites for:', event);
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(prev => {
      const updated = prev.filter(e => e.id !== eventId);
      saveEvents(updated);
      return updated;
    });
    
    addNotification({
      type: 'system',
      title: 'Event Deleted',
      message: 'The event has been removed from your schedule',
      priority: 'medium',
    });
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      priority: event.priority,
      attendees: event.attendees || [],
      projectId: event.projectId || '',
    });
    setShowEventModal(true);
  };

  const handleOptimizeSchedule = async () => {
    setOptimizing(true);
    
    try {
      const response = await fetch('/api/ai/optimize-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          events: events.filter(e => new Date(e.date) >= new Date()),
          tasks: tasks.filter(t => t.status !== 'completed'),
          preferences: user.preferences,
        }),
      });

      if (response.ok) {
        const optimized = await response.json();
        setEvents(prev => {
          const updated = prev.map(event => {
            const optimizedEvent = optimized.find(opt => opt.id === event.id);
            return optimizedEvent ? { ...event, ...optimizedEvent } : event;
          });
          saveEvents(updated);
          return updated;
        });
        
        addNotification({
          type: 'system',
          title: 'Schedule Optimized',
          message: 'Your schedule has been optimized based on your priorities',
          priority: 'medium',
        });
      }
    } catch (error) {
      console.error('Schedule optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleResolveConflict = (conflictIndex) => {
    const conflict = conflicts[conflictIndex];
    
    // Suggest alternative times
    const suggestions = [
      { time: '30 minutes later', action: () => moveEvent(conflict.event2.id, 30) },
      { time: '1 hour later', action: () => moveEvent(conflict.event2.id, 60) },
      { time: 'Move to tomorrow', action: () => moveEventToTomorrow(conflict.event2.id) },
      { time: 'Shorten both events', action: () => shortenEvents(conflict.event1.id, conflict.event2.id) },
    ];
    
    // Auto-select best option (in real app, use AI to decide)
    suggestions[0].action();
    
    setConflicts(prev => prev.filter((_, i) => i !== conflictIndex));
  };

  const moveEvent = (eventId, minutes) => {
    setEvents(prev => {
      const updated = prev.map(event => {
        if (event.id === eventId) {
          const start = new Date(event.startTime);
          start.setMinutes(start.getMinutes() + minutes);
          const end = new Date(event.endTime);
          end.setMinutes(end.getMinutes() + minutes);
          
          return {
            ...event,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          };
        }
        return event;
      });
      saveEvents(updated);
      return updated;
    });
  };

  const moveEventToTomorrow = (eventId) => {
    setEvents(prev => {
      const updated = prev.map(event => {
        if (event.id === eventId) {
          const start = new Date(event.startTime);
          start.setDate(start.getDate() + 1);
          const end = new Date(event.endTime);
          end.setDate(end.getDate() + 1);
          
          return {
            ...event,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            date: start.toISOString().split('T')[0],
          };
        }
        return event;
      });
      saveEvents(updated);
      return updated;
    });
  };

  const shortenEvents = (eventId1, eventId2) => {
    setEvents(prev => {
      const updated = prev.map(event => {
        if (event.id === eventId1 || event.id === eventId2) {
          const start = new Date(event.startTime);
          const end = new Date(event.endTime);
          const duration = (end - start) / (1000 * 60); // minutes
          const newEnd = new Date(start.getTime() + (duration * 0.8 * 60000)); // 80% of original
          
          return {
            ...event,
            endTime: newEnd.toISOString(),
          };
        }
        return event;
      });
      saveEvents(updated);
      return updated;
    });
  };

  const getEventsForDay = (date) => {
    return events.filter(event => 
      new Date(event.date).toDateString() === date.toDateString()
    );
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'meeting': return '#3b82f6';
      case 'task': return '#10b981';
      case 'break': return '#f59e0b';
      case 'focus': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div className="schedule-creator">
      <div className="schedule-header">
        <h2>Smart Schedule Creator</h2>
        <div className="schedule-actions">
          <Button onClick={handleCreateEvent} variant="primary">
            + Add Event
          </Button>
          <Button 
            onClick={handleOptimizeSchedule} 
            disabled={optimizing || events.length === 0}
          >
            {optimizing ? <LoadingSpinner size="small" /> : 'Optimize Schedule'}
          </Button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="conflicts-alert">
          <h4>⚠️ Schedule Conflicts Detected</h4>
          {conflicts.map((conflict, index) => (
            <Card key={index} className="conflict-card">
              <div className="conflict-details">
                <p>
                  <strong>{conflict.event1.title}</strong> conflicts with{' '}
                  <strong>{conflict.event2.title}</strong>
                </p>
                <p className="conflict-overlap">
                  Overlap: {conflict.overlap} minutes
                </p>
              </div>
              <Button 
                onClick={() => handleResolveConflict(index)}
                size="small"
                variant="primary"
              >
                Auto-Resolve
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div className="schedule-grid">
        <div className="calendar-section">
          <Calendar
            onChange={handleDateChange}
            value={date}
            tileClassName={({ date, view }) => {
              if (view === 'month') {
                const dayEvents = getEventsForDay(date);
                if (dayEvents.length > 0) {
                  return 'has-events';
                }
              }
              return null;
            }}
          />
          
          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-dot meeting"></span>
              <span>Meetings</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot task"></span>
              <span>Tasks</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot break"></span>
              <span>Breaks</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot focus"></span>
              <span>Focus Time</span>
            </div>
          </div>
        </div>

        <div className="events-section">
          <h3>Events for {date.toDateString()}</h3>
          
          {getEventsForDay(date).length === 0 ? (
            <Card className="no-events">
              <p>No events scheduled for this day.</p>
              <Button onClick={handleCreateEvent} variant="outline">
                Add Your First Event
              </Button>
            </Card>
          ) : (
            <div className="events-list">
              {getEventsForDay(date)
                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                .map(event => (
                  <Card key={event.id} className="event-card">
                    <div 
                      className="event-type-indicator"
                      style={{ backgroundColor: getEventTypeColor(event.type) }}
                    ></div>
                    
                    <div className="event-details">
                      <div className="event-header">
                        <h4>{event.title}</h4>
                        <span className={`priority-badge ${event.priority}`}>
                          {event.priority}
                        </span>
                      </div>
                      
                      <p className="event-description">{event.description}</p>
                      
                      <div className="event-time">
                        <span>
                          {new Date(event.startTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {' - '}
                          {new Date(event.endTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span className="event-duration">
                          {Math.round((new Date(event.endTime) - new Date(event.startTime)) / (1000 * 60))} min
                        </span>
                      </div>
                      
                      {event.projectId && (
                        <div className="event-project">
                          <span>Project: {projects.find(p => p.id === event.projectId)?.title || 'Unknown'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="event-actions">
                      <Button 
                        onClick={() => handleEditEvent(event)}
                        size="small"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button 
                        onClick={() => handleDeleteEvent(event.id)}
                        size="small"
                        variant="danger"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>

      {showEventModal && (
        <Modal 
          onClose={() => setShowEventModal(false)} 
          title={selectedEvent ? 'Edit Event' : 'Create New Event'}
        >
          <div className="event-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description"
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="meeting">Meeting</option>
                  <option value="task">Task Work</option>
                  <option value="break">Break</option>
                  <option value="focus">Focus Time</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newEvent.priority}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Related Project (Optional)</label>
              <select
                value={newEvent.projectId}
                onChange={(e) => setNewEvent(prev => ({ ...prev, projectId: e.target.value }))}
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-actions">
              <Button onClick={() => setShowEventModal(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSaveEvent} variant="primary">
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ScheduleCreator;