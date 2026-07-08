import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Award, Clock, Zap, Brain, RefreshCw, AlertCircle, BookOpen, Trophy, Users, UserPlus, Plus } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import SubjectCard from '../components/dashboard/SubjectCard';
import ContinueLearningHero from '../components/dashboard/ContinueLearningHero';
import CodeInputModal from '../components/dashboard/CodeInputModal';
import StudentLiveClassInterface from '../components/student/StudentLiveClassInterface';
import ScheduledClassNotifications from '../components/student/ScheduledClassNotifications';
import { useDashboardData } from '../hooks/useDashboardData';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../hooks/useNotifications';
import { codeConnectionService } from '../services/codeConnectionService';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { studentProgress, loading, error, refetch } = useDashboardData();
  const { notifications, markAsRead } = useNotifications(10); // Get 10 most recent notifications
  
  // Code input modal states
  const [showClassModal, setShowClassModal] = React.useState(false);
  const [showParentModal, setShowParentModal] = React.useState(false);
  const [codeLoading, setCodeLoading] = React.useState(false);

  const handleNotificationRead = (id: string) => {
    markAsRead(id);
  };

  const handleJoinClass = async (classCode: string) => {
    setCodeLoading(true);
    try {
      const result = await codeConnectionService.joinClassByCode(classCode);
      if (result.success) {
        // Refresh dashboard data to show new class
        refetch();
        // Also refresh the classes in MyClassesSection by triggering a re-render
        window.location.reload(); // Simple way to refresh the entire dashboard
      }
    } catch (error: any) {
      throw error;
    } finally {
      setCodeLoading(false);
    }
  };

  const handleConnectParent = async (parentCode: string) => {
    setCodeLoading(true);
    try {
      const result = await codeConnectionService.connectToParentByCode(parentCode);
      if (result.success) {
        // Could refresh connections data here if needed
      }
    } catch (error: any) {
      throw error;
    } finally {
      setCodeLoading(false);
    }
  };

  const emptyProgress = {
    userId: '',
    totalXP: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    subjectProgress: [],
    achievements: [],
    weakAreas: [],
    recommendedPath: { currentTopic: '', recommendedNextTopics: [], completedTopics: [] }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !studentProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error || 'An unexpected error occurred'}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-gray-600">
              {user?.grade ? `Grade ${user.grade} • ` : ''}Ready to continue your learning journey?
            </p>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Brain className="w-4 h-4" />
              AI Tutor
            </button>
            <button 
              onClick={() => navigate('/quiz')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Target className="w-4 h-4" />
              Take Quiz
            </button>
          </div>
        </div>

        {/* Code Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Join Class Card */}
          <div 
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg"
            onClick={() => setShowClassModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Join Class</h3>
                  <p className="text-blue-100">Enter your teacher's class code</p>
                </div>
              </div>
              <Plus className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          {/* Connect to Parent Card */}
          <div 
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg"
            onClick={() => setShowParentModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Connect Parent</h3>
                  <p className="text-green-100">Enter your parent's connection code</p>
                </div>
              </div>
              <Plus className="w-8 h-8 text-green-200" />
            </div>
          </div>
        </div>

        {/* My Classes Section */}
        <MyClassesSection />

        {/* Live Classes Section */}
        <LiveClassesSection />

        {/* Scheduled Classes Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <ScheduledClassNotifications studentId={user?.id || "1"} />
        </div>

        {/* Continue Learning Hero Section */}
        <ContinueLearningHero 
          studentProgress={studentProgress}
          onContinue={() => navigate('/quiz')}
        />

        {/* Learning Arenas Entry Card */}
        <div 
          className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg"
          onClick={() => navigate('/learning')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Learning Arenas</h3>
                <p className="text-violet-100">Explore gamified learning adventures</p>
              </div>
            </div>
            <Trophy className="w-8 h-8 text-violet-200" />
          </div>
        </div>

        {/* Gamification Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Experience Points"
            value={studentProgress.totalXP.toLocaleString()}
            subtitle={`Level ${studentProgress.currentLevel}`}
            icon={Zap}
            progress={studentProgress.totalXP % 100}
            maxProgress={100}
            color="blue"
            trend="up"
            trendValue="+125 XP"
          />
          
          <StatCard
            title="Current Streak"
            value={`${studentProgress.currentStreak} days`}
            subtitle={`Best: ${studentProgress.longestStreak} days`}
            icon={Award}
            progress={studentProgress.currentStreak}
            maxProgress={studentProgress.longestStreak || studentProgress.currentStreak}
            color="orange"
            trend={studentProgress.currentStreak > 0 ? "up" : "neutral"}
            trendValue={studentProgress.currentStreak > 0 ? "Active" : "Start today"}
          />
          
          <StatCard
            title="Study Time"
            value={`${Math.floor(studentProgress.subjectProgress.reduce((acc, s) => acc + s.timeSpent, 0) / 60)}h`}
            subtitle="This week"
            icon={Clock}
            color="green"
            trend="up"
            trendValue="+2.5h"
          />
          
          <StatCard
            title="Achievements"
            value={studentProgress.achievements.filter(a => a.unlockedAt).length}
            subtitle={`of ${studentProgress.achievements.length} total`}
            icon={Trophy}
            progress={studentProgress.achievements.filter(a => a.unlockedAt).length}
            maxProgress={studentProgress.achievements.length}
            color="purple"
          />
        </div>

        {/* Subject Progress Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Subjects</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="w-4 h-4" />
              <span>{studentProgress.subjectProgress.length} subjects</span>
            </div>
          </div>
          
          {studentProgress.subjectProgress.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentProgress.subjectProgress.map((subject) => (
                <SubjectCard
                  key={subject.subject}
                  subject={subject}
                  onClick={() => navigate('/quiz')}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects yet</h3>
              <p className="text-gray-500 mb-6">Start learning to see your progress here!</p>
              <button 
                onClick={() => navigate('/quiz')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Learning
              </button>
            </div>
          )}
        </div>

        {/* Recommended Topics */}
        {studentProgress.recommendedPath.recommendedNextTopics.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {studentProgress.recommendedPath.recommendedNextTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-semibold text-gray-900 truncate">{topic.topic}</h3>
                    <p className="text-sm text-gray-600 truncate">{topic.subject} • {topic.estimatedTime} min</p>
                    <p className="text-xs text-blue-600 mt-1">{topic.reason}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/quiz')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-shrink-0"
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas to Improve */}
        {studentProgress.weakAreas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Areas to Improve</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentProgress.weakAreas.map((area, index) => (
                <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 truncate">{area.subject}</span>
                    <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded-full flex-shrink-0 ml-2">
                      {area.successRate}%
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-3 truncate">{area.topic}</h3>
                  <button 
                    onClick={() => navigate('/quiz')}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    Practice Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {studentProgress.achievements.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {studentProgress.achievements.map((achievement) => (
                <div 
                  key={achievement.id} 
                  className={`p-4 rounded-xl text-center transition-all duration-200 hover:scale-105 ${
                    achievement.unlockedAt 
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-md' 
                      : 'bg-gray-50 border border-gray-200 opacity-60'
                  }`}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">{achievement.name}</h3>
                  {achievement.progress !== undefined && achievement.target && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">
                        {achievement.progress}/{achievement.target}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {achievement.unlockedAt && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                        Unlocked!
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code Input Modals */}
      <CodeInputModal
        isOpen={showClassModal}
        onClose={() => setShowClassModal(false)}
        type="class"
        onSubmit={handleJoinClass}
        loading={codeLoading}
      />

      <CodeInputModal
        isOpen={showParentModal}
        onClose={() => setShowParentModal(false)}
        type="parent"
        onSubmit={handleConnectParent}
        loading={codeLoading}
      />
    </div>
  );
};

// My Classes Section Component
const MyClassesSection: React.FC = () => {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const handleViewAssignments = (classItem: any) => {
    // Navigate to assignments page with class info
    navigate('/assignments', { 
      state: { 
        classId: classItem.id, 
        className: classItem.name,
        subject: classItem.subject 
      } 
    });
  };

  React.useEffect(() => {
    const fetchMyClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/v1/connect/my-classes', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyClasses();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">Loading classes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
        </div>
        <span className="text-sm text-gray-500">{classes.length} classes</span>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes joined yet</h3>
          <p className="text-gray-500 mb-6">Join a class using your teacher's class code to get started!</p>
          <div className="flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
              <p className="text-sm text-blue-800 font-medium mb-2">💡 How to join a class:</p>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Get the class code from your teacher</li>
                <li>2. Click "Join Class" button above</li>
                <li>3. Enter the 6-character code</li>
                <li>4. Start learning together!</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classItem) => (
            <div key={classItem.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{classItem.name}</h3>
                  <p className="text-sm text-gray-600">{classItem.subject} • Grade {classItem.grade}</p>
                </div>
                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Active
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Teacher:</span>
                  <span className="text-gray-900 font-medium">{classItem.teacher_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Students:</span>
                  <span className="text-gray-900">{classItem.students_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Joined:</span>
                  <span className="text-gray-900">
                    {new Date(classItem.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleViewAssignments(classItem)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  View Class
                </button>
                <button 
                  onClick={() => handleViewAssignments(classItem)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Assignments
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Live Classes Section Component
const LiveClassesSection: React.FC = () => {
  const [liveClasses, setLiveClasses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showLiveClassInterface, setShowLiveClassInterface] = React.useState(false);
  const [selectedClass, setSelectedClass] = React.useState<any>(null);

  React.useEffect(() => {
    fetchLiveClasses();
  }, []);

  const fetchLiveClasses = async () => {
    try {
      setLoading(true);
      // Mock data for live classes - using dynamic URLs to maintain current protocol
      const currentProtocol = window.location.protocol;
      const currentHostname = window.location.hostname;
      const currentPort = window.location.port;
      
      const mockLiveClasses = [
        {
          id: '1',
          name: 'Mathematics - Quadratic Equations',
          subject: 'Mathematics',
          teacher_name: 'Teacher One',
          grade: 10,
          status: 'live',
          participants: 15,
          max_participants: 30,
          started_at: '2025-01-10T14:30:00Z',
          meeting_url: `${currentProtocol}//${currentHostname}:${currentPort}/live/1`,
          class_code: 'MATH101'
        },
        {
          id: '2',
          name: 'Physics - Motion and Forces',
          subject: 'Physics',
          teacher_name: 'Teacher Two',
          grade: 10,
          status: 'scheduled',
          participants: 0,
          max_participants: 25,
          scheduled_at: '2025-01-10T16:00:00Z',
          meeting_url: `${currentProtocol}//${currentHostname}:${currentPort}/live/2`,
          class_code: 'PHY101'
        }
      ];
      
      setLiveClasses(mockLiveClasses);
    } catch (error) {
      console.error('Failed to fetch live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = (classItem: any) => {
    setSelectedClass(classItem);
    setShowJoinModal(true);
  };

  const joinLiveClass = () => {
    if (selectedClass) {
      // Show the live class interface instead of opening external URL
      setShowJoinModal(false);
      setShowLiveClassInterface(true);
    }
  };

  const leaveLiveClass = () => {
    setShowLiveClassInterface(false);
    setSelectedClass(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'Live Now';
      case 'scheduled': return 'Scheduled';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Classes</h2>
            <p className="text-gray-600 text-sm">Join ongoing and scheduled classes</p>
          </div>
        </div>
        
        {liveClasses.filter(c => c.status === 'live').length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            {liveClasses.filter(c => c.status === 'live').length} Live Now
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading live classes...</span>
        </div>
      ) : liveClasses.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No live classes available</h3>
          <p className="text-gray-500">Check back later for scheduled classes from your teachers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveClasses.map((classItem) => (
            <div key={classItem.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{classItem.name}</h3>
                  <p className="text-sm text-gray-600">{classItem.subject} • Grade {classItem.grade}</p>
                </div>
                <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(classItem.status)}`}>
                  {getStatusText(classItem.status)}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Teacher:</span>
                  <span className="text-gray-900 font-medium">{classItem.teacher_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Participants:</span>
                  <span className="text-gray-900">{classItem.participants}/{classItem.max_participants}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {classItem.status === 'live' ? 'Started:' : 'Scheduled:'}
                  </span>
                  <span className="text-gray-900">
                    {new Date(classItem.status === 'live' ? classItem.started_at : classItem.scheduled_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {classItem.status === 'live' ? (
                  <button 
                    onClick={() => handleJoinClass(classItem)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Now
                  </button>
                ) : (
                  <button 
                    onClick={() => handleJoinClass(classItem)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Set Reminder
                  </button>
                )}
                <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Join Live Class</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedClass.name}
                </h4>
                <p className="text-gray-600">
                  Teacher: {selectedClass.teacher_name} • {selectedClass.participants} participants
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-sm font-medium">Microphone</span>
                  </div>
                  <span className="text-xs text-green-600">Ready</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Camera</span>
                  </div>
                  <span className="text-xs text-green-600">Ready</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={joinLiveClass}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Class Interface */}
      {showLiveClassInterface && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Live Class</h3>
                <p className="text-gray-600">{selectedClass.name}</p>
              </div>
              <button
                onClick={leaveLiveClass}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              <StudentLiveClassInterface 
                classInfo={{
                  id: selectedClass.id,
                  name: selectedClass.name,
                  subject: selectedClass.subject,
                  teacher_name: selectedClass.teacher_name
                }}
                onLeave={leaveLiveClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
