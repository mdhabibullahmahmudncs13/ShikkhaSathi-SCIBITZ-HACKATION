import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import EnhancedLiveClassInterface from '../components/teacher/EnhancedLiveClassInterface';
import StudentLiveClassInterface from '../components/student/StudentLiveClassInterface';
import { getApiBaseUrl } from '../utils/apiUrl';

interface LiveClassData {
  id: string;
  title: string;
  description?: string;
  teacher_name: string;
  status: 'scheduled' | 'live' | 'ended';
  started_at?: string;
  duration_minutes: number;
  max_participants: number;
  participants: any[];
  meeting_url: string;
  meeting_id: string;
}

const LiveClassPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [liveClass, setLiveClass] = useState<LiveClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiveClass = async () => {
      if (!classId) {
        setError('Invalid class ID');
        setLoading(false);
        return;
      }

      console.log('LiveClassPage: Fetching class with ID:', classId);

      try {
        // Try to fetch as a scheduled class first (since live classes are scheduled classes with status "live")
        const response = await fetch(`${getApiBaseUrl()}/api/v1/scheduled-classes/${classId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log('LiveClassPage: API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          const scheduledClass = data.scheduled_class;
          
          console.log('LiveClassPage: Received class data:', scheduledClass);
          
          // Convert scheduled class data to live class format
          const liveClassData: LiveClassData = {
            id: scheduledClass.id,
            title: scheduledClass.title,
            description: scheduledClass.description,
            teacher_name: scheduledClass.teacher_name,
            status: scheduledClass.status === 'live' ? 'live' : 'scheduled',
            started_at: scheduledClass.started_at,
            duration_minutes: scheduledClass.duration,
            max_participants: scheduledClass.max_participants,
            participants: scheduledClass.participants,
            meeting_url: scheduledClass.meeting_url,
            meeting_id: scheduledClass.meeting_id
          };
          
          setLiveClass(liveClassData);
          
          // If class is not live yet, show appropriate message
          if (scheduledClass.status !== 'live') {
            setError(`Class is ${scheduledClass.status}. Please wait for the teacher to start the class.`);
          }
        } else if (response.status === 404) {
          setError('Class not found');
        } else {
          setError('Failed to load class');
        }
      } catch (err) {
        console.error('LiveClassPage: Error fetching class:', err);
        setError('Network error occurred - likely blocked by ad blocker');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveClass();
  }, [classId]);

  const handleJoinClass = async () => {
    if (!classId || !user) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/scheduled-classes/${classId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          student_id: user.id,
          student_name: user.name || user.full_name || 'Student'
        })
      });

      if (response.ok) {
        // Refresh class data to show updated participant list
        const updatedResponse = await fetch(`${getApiBaseUrl()}/api/v1/scheduled-classes/${classId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          const scheduledClass = updatedData.scheduled_class;
          
          // Update live class data
          const updatedLiveClass: LiveClassData = {
            id: scheduledClass.id,
            title: scheduledClass.title,
            description: scheduledClass.description,
            teacher_name: scheduledClass.teacher_name,
            status: scheduledClass.status === 'live' ? 'live' : 'scheduled',
            started_at: scheduledClass.started_at,
            duration_minutes: scheduledClass.duration,
            max_participants: scheduledClass.max_participants,
            participants: scheduledClass.participants,
            meeting_url: scheduledClass.meeting_url,
            meeting_id: scheduledClass.meeting_id
          };
          
          setLiveClass(updatedLiveClass);
        }
      }
    } catch (err) {
      console.error('Error joining live class:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading live class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button 
              onClick={() => navigate(-1)} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!liveClass) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Live class not found</p>
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

  // Show appropriate interface based on user role
  if (user?.role === 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <h1 className="text-2xl font-bold text-gray-900">{liveClass.title}</h1>
            <p className="text-gray-600">Teaching Live Class</p>
          </div>
          
          <EnhancedLiveClassInterface 
            classInfo={{
              id: liveClass.id,
              name: liveClass.title,
              subject: 'Live Class',
              student_count: liveClass.participants.length
            }}
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <h1 className="text-2xl font-bold text-gray-900">{liveClass.title}</h1>
            <p className="text-gray-600">by {liveClass.teacher_name}</p>
          </div>

          <StudentLiveClassInterface 
            classInfo={{
              id: liveClass.id,
              title: liveClass.title,
              teacher_name: liveClass.teacher_name,
              status: liveClass.status,
              participants: liveClass.participants,
              meeting_url: liveClass.meeting_url,
              meeting_id: liveClass.meeting_id
            }}
            onJoin={handleJoinClass}
          />
        </div>
      </div>
    );
  }
};

export default LiveClassPage;