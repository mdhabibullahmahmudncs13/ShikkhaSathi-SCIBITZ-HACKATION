import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Clock, Zap, Brain, RefreshCw, AlertCircle, BookOpen, 
  Trophy, Users, UserPlus, TrendingUp, Calendar, Star, 
  PlayCircle, ChevronRight, Activity, Flame
} from 'lucide-react';
import SubjectCard from '../components/dashboard/SubjectCard';
import CodeInputModal from '../components/dashboard/CodeInputModal';
import StudentLiveClassInterface from '../components/student/StudentLiveClassInterface';
import ScheduledClassNotifications from '../components/student/ScheduledClassNotifications';
import { useDashboardData } from '../hooks/useDashboardData';
import { useUser } from '../contexts/UserContext';
import { codeConnectionService } from '../services/codeConnectionService';
import { getApiBaseUrl } from '../utils/apiUrl';

const StudentDashboardOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { studentProgress, loading, error, refetch } = useDashboardData();
  
  // Code input modal states
  const [showClassModal, setShowClassModal] = React.useState(false);
  const [showParentModal, setShowParentModal] = React.useState(false);
  const [codeLoading, setCodeLoading] = React.useState(false);

  const handleJoinClass = async (classCode: string) => {
    setCodeLoading(true);
    try {
      const result = await codeConnectionService.joinClassByCode(classCode);
      if (result.success) {
        refetch();
        window.location.reload();
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <RefreshCw className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-200 rounded-full animate-pulse mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your dashboard...</h2>
          <p className="text-gray-600">Getting your latest progress and updates</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !studentProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error || "We couldn't load your dashboard. Please try again."}</p>
          <button
            onClick={() => refetch()}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentTime = new Date().getHours();
  const getGreeting = () => {
    if (currentTime < 12) return 'Good morning';
    if (currentTime < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Enhanced Welcome Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                  {getGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
                </h1>
                <p className="text-gray-600 flex items-center gap-2">
                  {user?.grade ? `Grade ${user.grade} • ` : ''}
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    {studentProgress.currentStreak} day streak
                  </span>
                </p>
              </div>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => navigate('/chat')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Brain className="w-5 h-5" />
                AI Tutor
              </button>
              <button 
                onClick={() => navigate('/quiz')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Target className="w-5 h-5" />
                Take Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-200" />
            </div>
            <div className="space-y-1">
              <p className="text-blue-100 text-sm font-medium">Experience Points</p>
              <p className="text-3xl font-bold">{studentProgress.totalXP.toLocaleString()}</p>
              <p className="text-blue-200 text-sm">Level {studentProgress.currentLevel}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <Activity className="w-5 h-5 text-orange-200" />
            </div>
            <div className="space-y-1">
              <p className="text-orange-100 text-sm font-medium">Current Streak</p>
              <p className="text-3xl font-bold">{studentProgress.currentStreak}</p>
              <p className="text-orange-200 text-sm">days in a row</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-200" />
            </div>
            <div className="space-y-1">
              <p className="text-green-100 text-sm font-medium">Study Time</p>
              <p className="text-3xl font-bold">{Math.floor(studentProgress.subjectProgress.reduce((acc, s) => acc + s.timeSpent, 0) / 60)}h</p>
              <p className="text-green-200 text-sm">this week</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <Star className="w-5 h-5 text-purple-200" />
            </div>
            <div className="space-y-1">
              <p className="text-purple-100 text-sm font-medium">Achievements</p>
              <p className="text-3xl font-bold">{studentProgress.achievements.filter(a => a.unlockedAt).length}</p>
              <p className="text-purple-200 text-sm">unlocked</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Join Class Card */}
          <div 
            className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
            onClick={() => setShowClassModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-200">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Join Class</h3>
                  <p className="text-gray-600">Enter your teacher's class code</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200" />
            </div>
          </div>

          {/* Connect to Parent Card */}
          <div 
            className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
            onClick={() => setShowParentModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-200">
                  <UserPlus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Connect Parent</h3>
                  <p className="text-gray-600">Share your progress with family</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-green-600 transition-colors duration-200" />
            </div>
          </div>
        </div>

        {/* Continue Learning Hero - Enhanced */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">Continue Learning</span>
              </div>
              <h2 className="text-3xl font-bold mb-3">Ready for your next challenge?</h2>
              <p className="text-indigo-100 text-lg mb-6">
                {studentProgress.recommendedPath.currentTopic 
                  ? `Continue with ${studentProgress.recommendedPath.currentTopic}` 
                  : 'Start your learning journey today!'}
              </p>
              <button 
                onClick={() => navigate('/quiz')}
                className="px-8 py-4 bg-white text-indigo-600 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Continue Learning →
              </button>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-white/80" />
              </div>
            </div>
          </div>
        </div>

        {/* Learning Arena Entry Card - Enhanced */}
        <div 
          className="group bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-3xl p-8 text-white cursor-pointer hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          onClick={() => navigate('/learning')}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300 shadow-lg">
                <BookOpen className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">🎮 Gamified Learning</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Learning Arenas</h3>
                <p className="text-violet-100 text-lg">Explore interactive learning adventures and challenges</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-violet-200">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    Achievements
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Rewards
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Progress Tracking
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:block text-right">
                <div className="text-2xl font-bold">12+</div>
                <div className="text-violet-200 text-sm">Adventures</div>
              </div>
              <ChevronRight className="w-8 h-8 text-violet-200 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
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

        {/* Subject Progress Grid - Enhanced */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Subjects</h2>
              <p className="text-gray-600">Track your progress across all subjects</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{studentProgress.subjectProgress.length} subjects</span>
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
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No subjects yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Start learning to see your progress here! Take your first quiz to begin tracking your journey.</p>
              <button 
                onClick={() => navigate('/quiz')}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Learning
              </button>
            </div>
          )}
        </div>

        {/* Recommended Topics - Enhanced */}
        {studentProgress.recommendedPath.recommendedNextTopics.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
                <p className="text-gray-600 text-sm">Personalized learning suggestions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {studentProgress.recommendedPath.recommendedNextTopics.map((topic, index) => (
                <div key={index} className="group p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <h3 className="font-semibold text-gray-900 mb-1">{topic.topic}</h3>
                      <p className="text-sm text-gray-600 mb-2">{topic.subject} • {topic.estimatedTime} min</p>
                      <p className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block">{topic.reason}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/quiz')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-shrink-0 group-hover:shadow-md"
                    >
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas to Improve - Enhanced */}
        {studentProgress.weakAreas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Areas to Improve</h2>
                <p className="text-gray-600 text-sm">Focus on these topics to boost your performance</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentProgress.weakAreas.map((area, index) => (
                <div key={index} className="group p-5 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl hover:from-orange-100 hover:to-red-100 transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">{area.subject}</span>
                    <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-medium">
                      {area.successRate}%
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-4">{area.topic}</h3>
                  <button 
                    onClick={() => navigate('/quiz')}
                    className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium group-hover:shadow-md"
                  >
                    Practice Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Achievements - Enhanced */}
        {studentProgress.achievements.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Achievements</h2>
                <p className="text-gray-600 text-sm">Your learning milestones and rewards</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {studentProgress.achievements.map((achievement) => (
                <div 
                  key={achievement.id} 
                  className={`p-4 rounded-2xl text-center transition-all duration-200 hover:scale-105 cursor-pointer ${
                    achievement.unlockedAt 
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-lg hover:shadow-xl' 
                      : 'bg-gray-50 border border-gray-200 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="text-4xl mb-3">{achievement.icon}</div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">{achievement.name}</h3>
                  {achievement.progress !== undefined && achievement.target && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-600 mb-2">
                        {achievement.progress}/{achievement.target}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {achievement.unlockedAt && (
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                        ✨ Unlocked!
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

// Enhanced My Classes Section Component
const MyClassesSection: React.FC = () => {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const handleViewAssignments = (classItem: any) => {
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
        const response = await fetch(`${getApiBaseUrl()}/api/v1/connect/my-classes`, {
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
            <p className="text-gray-600 text-sm">Your enrolled classes and assignments</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-600">Loading classes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Classes</h2>
            <p className="text-gray-600 text-sm">Your enrolled classes and assignments</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{classes.length} classes</span>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No classes joined yet</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">Join a class using your teacher's class code to access assignments, live sessions, and collaborative learning!</p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 max-w-md mx-auto">
            <h4 className="text-blue-900 font-semibold mb-3">💡 How to join a class:</h4>
            <ol className="text-blue-800 space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                Get the 6-character class code from your teacher
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                Click "Join Class" button above
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                Enter the code and start learning together!
              </li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <div key={classItem.id} className="group border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{classItem.name}</h3>
                  <p className="text-gray-600 mb-1">{classItem.subject} • Grade {classItem.grade}</p>
                </div>
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                  Active
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Teacher:
                  </span>
                  <span className="text-gray-900 font-medium">{classItem.teacher_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Students:
                  </span>
                  <span className="text-gray-900">{classItem.students_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined:
                  </span>
                  <span className="text-gray-900">
                    {new Date(classItem.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => handleViewAssignments(classItem)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors font-medium group-hover:shadow-md"
                >
                  View Class
                </button>
                <button 
                  onClick={() => handleViewAssignments(classItem)}
                  className="px-4 py-3 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors font-medium"
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

// Enhanced Live Classes Section Component
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
      case 'live': return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return '🔴 Live Now';
      case 'scheduled': return '📅 Scheduled';
      case 'ended': return '⏹️ Ended';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            {liveClasses.filter(c => c.status === 'live').length} Live Now
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          <span className="ml-4 text-gray-600 font-medium">Loading live classes...</span>
        </div>
      ) : liveClasses.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No live classes available</h3>
          <p className="text-gray-600 max-w-md mx-auto">Check back later for scheduled classes from your teachers. You'll be notified when classes are about to start!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {liveClasses.map((classItem) => (
            <div key={classItem.id} className="group border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:border-red-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{classItem.name}</h3>
                  <p className="text-gray-600">{classItem.subject} • Grade {classItem.grade}</p>
                </div>
                <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium border ${getStatusColor(classItem.status)}`}>
                  {getStatusText(classItem.status)}
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Teacher:
                  </span>
                  <span className="text-gray-900 font-medium">{classItem.teacher_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Participants:
                  </span>
                  <span className="text-gray-900">{classItem.participants}/{classItem.max_participants}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {classItem.status === 'live' ? 'Started:' : 'Scheduled:'}
                  </span>
                  <span className="text-gray-900">
                    {new Date(classItem.status === 'live' ? classItem.started_at : classItem.scheduled_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                {classItem.status === 'live' ? (
                  <button 
                    onClick={() => handleJoinClass(classItem)}
                    className="flex-1 px-4 py-3 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium group-hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Now
                  </button>
                ) : (
                  <button 
                    onClick={() => handleJoinClass(classItem)}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Set Reminder
                  </button>
                )}
                <button className="px-4 py-3 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50 transition-colors font-medium">
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Join Class Modal */}
      {showJoinModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Join Live Class</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedClass.name}
                </h4>
                <p className="text-gray-600">
                  Teacher: {selectedClass.teacher_name} • {selectedClass.participants} participants
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="font-medium">Microphone</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">✓ Ready</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Camera</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">✓ Ready</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={joinLiveClass}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl"
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Live Class</h3>
                <p className="text-gray-600">{selectedClass.name}</p>
              </div>
              <button
                onClick={leaveLiveClass}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
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

export default StudentDashboardOptimized;