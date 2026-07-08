import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Award, Settings, Camera, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useProfile } from '../hooks/useProfile';
import { useDashboardData } from '../hooks/useDashboardData';

const UserProfile: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const { studentProgress, loading: progressLoading } = useDashboardData();
  const { updating, error, updateProfile, clearError } = useProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    full_name: '',
    email: '',
    grade: 6,
    medium: 'bangla' as 'bangla' | 'english'
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setEditedData({
        full_name: user.full_name || '',
        email: user.email || '',
        grade: user.grade || 6,
        medium: user.medium || 'bangla'
      });
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
    clearError();
    setSuccessMessage('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    clearError();
    setSuccessMessage('');
    // Reset to original user data
    if (user) {
      setEditedData({
        full_name: user.full_name || '',
        email: user.email || '',
        grade: user.grade || 6,
        medium: user.medium || 'bangla'
      });
    }
  };

  const handleSave = async () => {
    clearError();
    setSuccessMessage('');
    
    const success = await updateProfile(editedData);
    if (success) {
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleChange = (field: keyof typeof editedData, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-neutral-600">Unable to load profile. Please try again.</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">User Profile</h1>
              <p className="text-neutral-700 mt-1">ব্যবহারকারী প্রোফাইল</p>
            </div>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 font-medium rounded-lg transition-all shadow-sm"
              >
                <Settings className="h-5 w-5" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 font-medium rounded-lg transition-all shadow-sm disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-all shadow-sm disabled:opacity-50"
                >
                  {updating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl font-bold text-neutral-900 shadow-lg">
                    {getInitials(user?.full_name)}
                  </div>
                </div>
                <h2 className="mt-4 text-xl font-bold text-neutral-900 text-center">
                  {user?.full_name || 'User'}
                </h2>
                <p className="text-sm text-neutral-600 capitalize">{user?.role || 'Student'}</p>
              </div>

              {/* Stats */}
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                {studentProgress && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="text-sm">Level</span>
                      </div>
                      <span className="font-bold text-neutral-900">{studentProgress.currentLevel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Award className="h-5 w-5 text-secondary" />
                        <span className="text-sm">Total XP</span>
                      </div>
                      <span className="font-bold text-neutral-900">{studentProgress.totalXP.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Award className="h-5 w-5 text-accent" />
                        <span className="text-sm">Current Streak</span>
                      </div>
                      <span className="font-bold text-neutral-900">{studentProgress.currentStreak} days 🔥</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Calendar className="h-5 w-5 text-neutral-500" />
                    <span className="text-sm">Joined</span>
                  </div>
                  <span className="text-sm text-neutral-900">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <p className="text-neutral-900">{user?.full_name || 'User'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <p className="text-neutral-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-neutral-500" />
                      {user?.email || 'No email'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Information (for students) */}
            {user?.role === 'student' && (
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Grade/Class
                    </label>
                    {isEditing ? (
                      <select
                        value={editedData.grade}
                        onChange={(e) => handleChange('grade', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                          <option key={grade} value={grade}>Class {grade}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-neutral-900">Class {user?.grade || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Medium
                    </label>
                    {isEditing ? (
                      <select
                        value={editedData.medium}
                        onChange={(e) => handleChange('medium', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="bangla">Bangla Medium</option>
                        <option value="english">English Medium</option>
                      </select>
                    ) : (
                      <p className="text-neutral-900 capitalize">{user?.medium || 'bangla'} Medium</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Account Security */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">
                Account Security
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-900">Password</p>
                    <p className="text-sm text-neutral-600">Keep your account secure</p>
                  </div>
                  <button className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-all">
                    Change Password
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-900">Account Status</p>
                    <p className="text-sm text-neutral-600">
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user?.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
