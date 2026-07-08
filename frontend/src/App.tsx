import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Landing from './pages/Landing'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import StudentDashboardOptimized from './pages/StudentDashboardOptimized'
import ParentDashboard from './pages/ParentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherAssessmentsPage from './pages/TeacherAssessmentsPage'
import TeacherStudentsPage from './pages/TeacherStudentsPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminLoginPage from './pages/AdminLoginPage'
import QuizPage from './pages/QuizPage'
import AITutorChat from './pages/AITutorChat'
import AITutorChatMinimal from './pages/AITutorChatMinimal'
import UserProfile from './pages/UserProfile'
import LearningModules from './pages/LearningModules'
import ArenaDetail from './pages/ArenaDetail'
import AdventureDetail from './pages/AdventureDetail'
import TopicLearning from './pages/TopicLearning'
import AssignmentsPage from './pages/AssignmentsPage'
import LiveClassPage from './pages/LiveClassPage'
import ScheduledClassPage from './pages/ScheduledClassPage'
import { SyncProgressModal, ConflictResolutionModal } from './components/sync'
import ErrorBoundary from './components/common/ErrorBoundary'
import { GlobalLoadingBar } from './components/common/LoadingIndicator'
import { ErrorNotificationManager } from './components/common/ErrorNotification'
import UnauthorizedPage from './pages/UnauthorizedPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import { UserProvider, useUser } from './contexts/UserContext'

// Main App Content Component (needs to be inside UserProvider)
function AppContent() {
  // Enable sync hooks for proper offline functionality
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [conflicts] = useState<any[]>([]);
  const [errors] = useState<any[]>([]);
  
  // Use unified authentication from UserContext
  const { user, logout } = useUser();
  const isAuthenticated = !!user;
  
  // Type guard for user object
  const typedUser = user as { full_name?: string; role?: string } | null;

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 relative overflow-hidden">
        {/* Soft Background Blobs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-pink-200 rounded-full blur-3xl opacity-25 -z-10"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10"></div>
        
        {/* Global Loading Bar */}
        <GlobalLoadingBar />
        
        {/* Navigation */}
        <nav className="bg-white/90 backdrop-blur-md border-b border-white/50 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Logo and Brand */}
              <div className="flex items-center gap-8">
                <a href="/" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                    <span className="text-white font-bold text-lg">শ</span>
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-purple-800 bg-clip-text text-transparent font-['Hind_Siliguri']">
                    শিক্ষাসাথী
                  </span>
                </a>
                
                {/* Public Navigation */}
                {!isAuthenticated && (
                  <div className="hidden md:flex items-center space-x-2">
                    <a href="/#features" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-blue-50/80 rounded-xl transition-all duration-200">
                      বৈশিষ্ট্য
                    </a>
                    <a href="/#about" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-purple-50/80 rounded-xl transition-all duration-200">
                      সম্পর্কে
                    </a>
                    <a href="/#pricing" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-pink-50/80 rounded-xl transition-all duration-200">
                      মূল্য
                    </a>
                    <a href="/#contact" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-green-50/80 rounded-xl transition-all duration-200">
                      যোগাযোগ
                    </a>
                  </div>
                )}
                
                {/* Authenticated Navigation - Dashboard Friendly */}
                {isAuthenticated && (
                  <div className="hidden md:flex items-center space-x-1">
                    <a href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                      </svg>
                      ড্যাশবোর্ড
                    </a>
                    {typedUser?.role === 'student' && (
                      <>
                        <a href="/learning" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          শেখার অ্যারেনা
                        </a>
                        <a href="/chat" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          AI টিউটর
                        </a>
                        <a href="/quiz" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-green-50 hover:to-cyan-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          কুইজ
                        </a>
                      </>
                    )}
                    {typedUser?.role === 'parent' && (
                      <a href="/parent" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        অভিভাবক পোর্টাল
                      </a>
                    )}
                    {typedUser?.role === 'teacher' && (
                      <>
                        <a href="/teacher" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          শিক্ষক ড্যাশবোর্ড
                        </a>
                        <a href="/teacher/assessments" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          মূল্যায়ন
                        </a>
                        <a href="/teacher/students" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 rounded-xl transition-all duration-200 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          শিক্ষার্থী
                        </a>
                      </>
                    )}
                    {typedUser?.role === 'admin' && (
                      <a href="/admin" className="px-4 py-2 text-sm font-medium text-red-700 hover:text-red-900 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 rounded-xl transition-all duration-200 font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin Panel
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              {/* Right Side Actions */}
              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <>
                    {/* Quick Actions for Dashboard */}
                    <div className="hidden lg:flex items-center gap-2">
                      {typedUser?.role === 'student' && (
                        <>
                          <a href="/quiz" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="Quick Quiz">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </a>
                          <a href="/chat" className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200" title="AI Tutor">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </a>
                        </>
                      )}
                    </div>

                    {/* Notifications */}
                    <button className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-white/80 backdrop-blur-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        3
                      </span>
                    </button>
                    
                    {/* User Menu */}
                    <div className="relative group">
                      <button className="flex items-center gap-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 backdrop-blur-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-sm font-bold text-white">
                            {typedUser?.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        {typedUser && (
                          <div className="hidden sm:block text-left">
                            <div className="text-sm font-medium text-gray-900">
                              {typedUser.full_name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {typedUser.role}
                            </div>
                          </div>
                        )}
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 py-3 transition-all duration-200 transform scale-95 group-hover:scale-100">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{typedUser?.full_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{typedUser?.role}</p>
                        </div>
                        <a href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          প্রোফাইল সেটিংস
                        </a>
                        <a href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          অ্যাকাউন্ট সেটিংস
                        </a>
                        <div className="border-t border-gray-100 my-2"></div>
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          সাইন আউট
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <a href="/login" className="hidden sm:block px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/80 backdrop-blur-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                      লগ ইন
                    </a>
                    <a href="/signup" className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-['Hind_Siliguri']">
                      শুরু করুন →
                    </a>
                  </>
                )}
                
                {/* Mobile Menu Button */}
                <button className="md:hidden p-3 text-gray-600 hover:text-gray-900 hover:bg-white/80 backdrop-blur-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<StudentDashboardOptimized />} />
              <Route path="/student" element={<StudentDashboardOptimized />} />
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/teacher" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/teacher/assessments" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherAssessmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/teacher/students" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherStudentsPage />
                </ProtectedRoute>
              } />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/chat" element={<AITutorChatMinimal />} />
              <Route path="/chat/full" element={<AITutorChat />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<UserProfile />} />
              
              {/* Learning Module Routes */}
              <Route path="/learning" element={<LearningModules />} />
              <Route path="/learning/arena/:arenaId" element={<ArenaDetail />} />
              <Route path="/learning/adventure/:adventureId" element={<AdventureDetail />} />
              <Route path="/learning/topic/:topicId" element={<TopicLearning />} />
              
              {/* Live Class Routes */}
              <Route path="/live/:classId" element={<LiveClassPage />} />
              <Route path="/live-class/:classId" element={<LiveClassPage />} />
              <Route path="/scheduled/:classId" element={<ScheduledClassPage />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Global Error Notifications */}
        <ErrorNotificationManager />

        {/* Sync Management Modals */}
        <SyncProgressModal
          isOpen={showSyncProgress}
          onClose={() => setShowSyncProgress(false)}
        />
        
        <ConflictResolutionModal
          isOpen={showConflictResolution}
          onClose={() => setShowConflictResolution(false)}
        />

        {/* Conflict Notification */}
        {conflicts.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-lg z-40">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm">
                {conflicts.length} টি ডেটা দ্বন্দ্ব সমাধান প্রয়োজন
              </span>
              <button
                onClick={() => setShowConflictResolution(true)}
                className="ml-3 text-yellow-800 hover:text-yellow-900 underline text-sm"
              >
                সমাধান করুন
              </button>
            </div>
          </div>
        )}

        {/* Sync Error Notification */}
        {errors.length > 0 && (
          <div className="fixed bottom-4 left-4 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-lg shadow-lg z-40">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {errors.length} টি সিঙ্ক ত্রুটি
              </span>
              <button
                onClick={() => setShowSyncProgress(true)}
                className="ml-3 text-red-800 hover:text-red-900 underline text-sm"
              >
                দেখুন
              </button>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ErrorBoundary>
  )
}

export default App