import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { Calendar, Clock, Users, Video, AlertCircle } from 'lucide-react';
import ConnectionTest from '../components/common/ConnectionTest';

interface ScheduledClassData {
  id: string;
  class_id: string;
  title: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  notify_before: number;
  is_recurring: boolean;
  recurring_pattern?: string;
  max_participants: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  participants: any[];
  meeting_url: string;
  meeting_id: string;
  created_at: string;
  notifications_sent: boolean;
}

const ScheduledClassPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [scheduledClass, setScheduledClass] = useState<ScheduledClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [showConnectionTest, setShowConnectionTest] = useState(false);

  useEffect(() => {
    const fetchScheduledClass = async () => {
      if (!classId) {
        setError('Invalid class ID');
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching scheduled class: ${classId}`);
        
        // First check if backend is running
        try {
          await fetch(`http://localhost:8000/api/v1/health`, {
            method: 'HEAD',
            mode: 'no-cors'
          });
        } catch (healthError) {
          throw new Error('Backend server is not running. Please start the backend server on port 8000.');
        }

        // Fetch scheduled class data
        const response = await fetch(`http://localhost:8000/api/v1/scheduled-classes/${classId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Scheduled class data:', data);
          setScheduledClass(data.scheduled_class);
        } else if (response.status === 404) {
          setError('Scheduled class not found');
        } else {
          setError(`Failed to load scheduled class (Status: ${response.status})`);
        }
      } catch (err) {
        console.error('Error fetching scheduled class:', err);
        
        // Provide more specific error messages
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          if (err.message.includes('Backend server is not running')) {
            setError('Backend server is not running. Please start the backend server:\n\n1. Open terminal in project root\n2. Run: cd backend\n3. Run: python run_dev.py\n4. Wait for "Server running on http://localhost:8000"\n5. Refresh this page');
          } else {
            setError('Connection blocked. This is usually caused by:\n\n• Ad blockers (uBlock Origin, AdBlock Plus, etc.)\n• Browser security extensions\n• Antivirus software blocking localhost\n• Firewall settings\n\nSolutions:\n• Disable ad blockers temporarily\n• Try incognito/private browsing mode\n• Add localhost:8000 to ad blocker whitelist\n• Check if backend is running on port 8000');
          }
        } else {
          setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledClass();
  }, [classId]);

  // Update time until start every minute
  useEffect(() => {
    if (!scheduledClass) return;

    const updateTimeUntilStart = () => {
      const now = new Date();
      const scheduledDateTime = new Date(`${scheduledClass.scheduled_date}T${scheduledClass.scheduled_time}`);
      const diffMs = scheduledDateTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeUntilStart('Class time has passed');
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
          setTimeUntilStart(`${diffDays} day${diffDays > 1 ? 's' : ''} remaining`);
        } else if (diffHours > 0) {
          setTimeUntilStart(`${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`);
        } else {
          setTimeUntilStart(`${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`);
        }
      }
    };

    updateTimeUntilStart();
    const interval = setInterval(updateTimeUntilStart, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [scheduledClass]);

  const handleJoinClass = async () => {
    if (!scheduledClass || !user) return;

    try {
      console.log('Attempting to join scheduled class:', scheduledClass.id);
      
      const response = await fetch(`http://localhost:8000/api/v1/scheduled-classes/${scheduledClass.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          student_id: user.id,
          student_name: user.name || user.full_name || 'Student'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Join response:', data);
        
        // Check if we got a meeting URL
        if (data.meeting_url) {
          console.log('Original meeting URL:', data.meeting_url);
          
          // Convert meeting URL to use current protocol and port
          const currentProtocol = window.location.protocol;
          const currentHostname = window.location.hostname;
          const currentPort = window.location.port;
          
          // Extract the path from the meeting URL (e.g., "/live/58535")
          let meetingPath;
          try {
            const url = new URL(data.meeting_url);
            meetingPath = url.pathname;
          } catch {
            // If URL parsing fails, assume it's a path
            meetingPath = data.meeting_url.includes('/live/') ? 
              data.meeting_url.substring(data.meeting_url.indexOf('/live/')) : 
              `/live/${scheduledClass.id}`;
          }
          
          // Construct the URL using current protocol and port
          const dynamicMeetingUrl = `${currentProtocol}//${currentHostname}:${currentPort}${meetingPath}`;
          console.log('Dynamic meeting URL:', dynamicMeetingUrl);
          
          // If class is live, redirect to live class page
          if (data.class_status === 'live' || meetingPath.includes('/live/')) {
            window.location.href = dynamicMeetingUrl;
          } else {
            // If still scheduled, show message
            alert('Class is scheduled but not yet started. Please wait for the teacher to start the class.');
          }
        } else {
          alert('No meeting URL received. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('Join failed:', errorData);
        alert(errorData.detail || 'Failed to join class');
      }
    } catch (err) {
      console.error('Error joining scheduled class:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        // Provide fallback option when API is blocked
        const fallbackUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/live/${scheduledClass.id}`;
        const shouldTryFallback = confirm(
          'Connection error: API call was blocked (likely by ad blocker).\n\n' +
          'Would you like to try accessing the live class directly?\n\n' +
          'Note: This will only work if the teacher has already started the class.'
        );
        
        if (shouldTryFallback) {
          console.log('Using fallback URL:', fallbackUrl);
          window.location.href = fallbackUrl;
        } else {
          alert('Please disable your ad blocker and try again, or ask your teacher to provide the direct class link.');
        }
      } else {
        alert('Failed to join class. Please try again.');
      }
    }
  };

  const handleStartClass = async () => {
    if (!scheduledClass || user?.role !== 'teacher') return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/scheduled-classes/${scheduledClass.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to live class using dynamic URL
        if (data.meeting_url) {
          // Convert meeting URL to use current protocol and port
          const currentProtocol = window.location.protocol;
          const currentHostname = window.location.hostname;
          const currentPort = window.location.port;
          
          // Extract the path from the meeting URL
          let meetingPath;
          try {
            const url = new URL(data.meeting_url);
            meetingPath = url.pathname;
          } catch {
            // If URL parsing fails, assume it's a path
            meetingPath = data.meeting_url.includes('/live/') ? 
              data.meeting_url.substring(data.meeting_url.indexOf('/live/')) : 
              `/live/${scheduledClass.id}`;
          }
          
          // Construct the URL using current protocol and port
          const dynamicMeetingUrl = `${currentProtocol}//${currentHostname}:${currentPort}${meetingPath}`;
          console.log('Teacher starting class, redirecting to:', dynamicMeetingUrl);
          window.location.href = dynamicMeetingUrl;
        }
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to start class');
      }
    } catch (err) {
      console.error('Error starting scheduled class:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        alert('Connection error: Please check if the backend server is running and ad blockers are disabled.');
      } else {
        alert('Failed to start class. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scheduled class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-xl mb-4">⚠️ Connection Error</div>
          <div className="text-gray-600 mb-4 whitespace-pre-line text-left bg-gray-100 p-4 rounded-lg">
            {error}
          </div>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button 
              onClick={() => setShowConnectionTest(true)} 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Connection
            </button>
            <button 
              onClick={() => navigate(-1)} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Go Back
            </button>
          </div>
          
          {/* Troubleshooting tips */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 Troubleshooting Tips:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Disable ad blockers (uBlock Origin, AdBlock Plus)</li>
              <li>• Disable browser security extensions</li>
              <li>• Try opening in incognito/private mode</li>
              <li>• Check if backend is running on port 8000</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!scheduledClass) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Scheduled class not found</p>
          <button 
            onClick={() => navigate(-1)} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const scheduledDateTime = new Date(`${scheduledClass.scheduled_date}T${scheduledClass.scheduled_time}`);
  const isClassTime = new Date() >= scheduledDateTime;
  const canJoin = scheduledClass.status === 'live' || (isClassTime && scheduledClass.status === 'scheduled');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Class Info */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{scheduledClass.title}</h1>
            <p className="text-gray-600 mb-4">{scheduledClass.description}</p>
            <p className="text-sm text-gray-500">by {scheduledClass.teacher_name}</p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
              scheduledClass.status === 'live' ? 'bg-green-100 text-green-800' :
              scheduledClass.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
              scheduledClass.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {scheduledClass.status === 'live' ? '🔴 Live Now' : 
               scheduledClass.status === 'scheduled' ? '📅 Scheduled' :
               scheduledClass.status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
            </span>
          </div>

          {/* Class Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Date & Time</h3>
              <p className="text-gray-600">{scheduledDateTime.toLocaleDateString()}</p>
              <p className="text-gray-600">{scheduledDateTime.toLocaleTimeString()}</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Duration</h3>
              <p className="text-gray-600">{scheduledClass.duration} minutes</p>
              <p className="text-sm text-gray-500">{timeUntilStart}</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Participants</h3>
              <p className="text-gray-600">{scheduledClass.participants.length} joined</p>
              <p className="text-sm text-gray-500">Max: {scheduledClass.max_participants}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            {user?.role === 'teacher' && scheduledClass.teacher_id === user.id ? (
              // Teacher view
              <div className="space-y-3">
                {scheduledClass.status === 'scheduled' && (
                  <button
                    onClick={handleStartClass}
                    className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <Video className="w-5 h-5" />
                    Start Class Now
                  </button>
                )}
                
                {scheduledClass.status === 'live' && (
                  <button
                    onClick={() => {
                      // Use dynamic URL for live class
                      const currentProtocol = window.location.protocol;
                      const currentHostname = window.location.hostname;
                      const currentPort = window.location.port;
                      const dynamicUrl = `${currentProtocol}//${currentHostname}:${currentPort}/live/${scheduledClass.id}`;
                      window.open(dynamicUrl, '_blank');
                    }}
                    className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <Video className="w-5 h-5" />
                    Join Live Class
                  </button>
                )}
              </div>
            ) : (
              // Student view
              <div className="space-y-3">
                {canJoin ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleJoinClass}
                      className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                      <Video className="w-5 h-5" />
                      Join Class
                    </button>
                    
                    {/* Fallback button for when API is blocked */}
                    {scheduledClass.status === 'live' && (
                      <button
                        onClick={() => window.location.href = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/live/${scheduledClass.id}`}
                        className="w-full md:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mx-auto text-sm"
                      >
                        <Video className="w-4 h-4" />
                        Direct Link (if blocked)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                      {scheduledClass.status === 'completed' ? 'Class has ended' :
                       scheduledClass.status === 'cancelled' ? 'Class was cancelled' :
                       'Class not started yet'}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {!isClassTime && `Class starts ${timeUntilStart.toLowerCase()}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Meeting ID */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Meeting Information</h4>
              <p className="text-sm text-blue-800">
                <strong>Meeting ID:</strong> {scheduledClass.meeting_id}
              </p>
              {scheduledClass.is_recurring && (
                <p className="text-sm text-blue-800">
                  <strong>Recurring:</strong> {scheduledClass.recurring_pattern}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Test Modal */}
      {showConnectionTest && (
        <ConnectionTest onClose={() => setShowConnectionTest(false)} />
      )}
    </div>
  );
};

export default ScheduledClassPage;