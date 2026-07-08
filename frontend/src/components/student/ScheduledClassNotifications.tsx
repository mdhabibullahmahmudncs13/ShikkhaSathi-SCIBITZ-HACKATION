import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Bell, Users, X } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';

interface ScheduledClass {
  id: string;
  class_id: string;
  title: string;
  description: string;
  teacher_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  notify_before: number;
  max_participants?: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  meeting_url: string;
  meeting_id: string;
  minutes_until_start?: number;
}

interface ScheduledClassNotificationsProps {
  studentId: string;
}

const ScheduledClassNotifications: React.FC<ScheduledClassNotificationsProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    fetchScheduledClasses();
    
    // Check for upcoming classes every minute
    const interval = setInterval(() => {
      checkUpcomingClasses();
    }, 60000);

    return () => clearInterval(interval);
  }, [studentId]);

  const fetchScheduledClasses = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/scheduled-classes/student/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setScheduledClasses(data.scheduled_classes || []);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUpcomingClasses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/scheduled-classes/upcoming');
      if (response.ok) {
        const data = await response.json();
        const studentUpcoming = data.upcoming_classes.filter((cls: ScheduledClass) => 
          scheduledClasses.some(sc => sc.id === cls.id)
        );
        
        if (studentUpcoming.length > 0) {
          setUpcomingClasses(studentUpcoming);
          setShowNotification(true);
        }
      }
    } catch (error) {
      console.error('Failed to check upcoming classes:', error);
    }
  };

  const handleJoinClass = async (scheduledClass: ScheduledClass) => {
    try {
      // Navigate to the live class page
      navigate(`/live/${scheduledClass.id}`);
      setShowNotification(false);
    } catch (error) {
      console.error('Failed to join class:', error);
      alert('Failed to join class. Please try again.');
    }
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return dateTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return `${date} ${time}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Class Notification */}
      {showNotification && upcomingClasses.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          {upcomingClasses.map((cls) => (
            <div key={cls.id} className="bg-white border-l-4 border-orange-500 rounded-lg shadow-lg p-4 mb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    <h4 className="font-semibold text-gray-900">Class Starting Soon!</h4>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{cls.title}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Starts in {cls.minutes_until_start} minutes
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleJoinClass(cls)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      Join Now
                    </button>
                    <button
                      onClick={() => setShowNotification(false)}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                    >
                      Later
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Classes List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Scheduled Classes
        </h3>
        
        {scheduledClasses.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No scheduled classes yet</p>
            <p className="text-sm text-gray-400 mt-1">Your teachers will schedule online classes here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledClasses.map((scheduledClass) => (
              <div key={scheduledClass.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{scheduledClass.title}</h4>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getStatusColor(scheduledClass.status)}`}>
                        {scheduledClass.status === 'live' ? 'Live Now' : 
                         scheduledClass.status === 'scheduled' ? 'Scheduled' :
                         scheduledClass.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{scheduledClass.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateTime(scheduledClass.scheduled_date, scheduledClass.scheduled_time)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{scheduledClass.duration} minutes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Teacher: {scheduledClass.teacher_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {scheduledClass.status === 'live' && (
                      <button
                        onClick={() => handleJoinClass(scheduledClass)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        Join Live
                      </button>
                    )}
                    
                    {scheduledClass.status === 'scheduled' && (
                      <button
                        onClick={() => {
                          // Add to calendar functionality could be added here
                          alert('Class reminder set! You will be notified before the class starts.');
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Bell className="w-4 h-4" />
                        Remind Me
                      </button>
                    )}
                  </div>
                </div>
                
                {scheduledClass.status === 'scheduled' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <p className="text-sm text-blue-800">
                      <strong>Meeting ID:</strong> {scheduledClass.meeting_id}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      You will be notified {scheduledClass.notify_before} minutes before the class starts
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduledClassNotifications;