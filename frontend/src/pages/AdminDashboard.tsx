import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Activity, 
  Settings, 
  Shield,
  BarChart3,
  UserCheck,
  AlertCircle,
  Database,
  Upload,
  FolderPlus,
  Map,
  PlayCircle,
  FileText,
  Image,
  Headphones,
  Video,
  Brain,
  Presentation
} from 'lucide-react';
import { AdminStats, AdminUser } from '../types/admin';
import { adminAPI } from '../services/adminAPI';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  
  // Content Management States
  const [arenas, setArenas] = useState<any[]>([]);
  const [adventures, setAdventures] = useState<any[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<any[]>([]);
  const [showCreateArenaModal, setShowCreateArenaModal] = useState(false);
  const [showCreateAdventureModal, setShowCreateAdventureModal] = useState(false);
  const [showUploadMaterialModal, setShowUploadMaterialModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const userRole = localStorage.getItem('user_role');
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }
    
    fetchDashboardStats();
  }, [navigate]);

  const fetchDashboardStats = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v1/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">ShikkhaSathi Platform Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">System Healthy</span>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Settings className="w-4 h-4 inline mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'users', name: 'Users', icon: Users },
              { id: 'content', name: 'Content', icon: BookOpen },
              { id: 'arenas', name: 'Arenas', icon: Map },
              { id: 'adventures', name: 'Adventures', icon: PlayCircle },
              { id: 'materials', name: 'Study Materials', icon: Upload },
              { id: 'analytics', name: 'Analytics', icon: TrendingUp },
              { id: 'system', name: 'System', icon: Database }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'arenas' && <ArenasTab />}
        {activeTab === 'adventures' && <AdventuresTab />}
        {activeTab === 'materials' && <StudyMaterialsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'system' && <SystemTab />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ stats: AdminStats | null }> = ({ stats }) => {
  if (!stats) return <div>Loading...</div>;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users.toLocaleString(),
      change: `+${stats.recent_registrations} this month`,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Students',
      value: stats.students_count.toLocaleString(),
      change: `${Math.round((stats.students_count / stats.total_users) * 100)}% of users`,
      icon: UserCheck,
      color: 'green'
    },
    {
      title: 'Learning Modules',
      value: stats.total_learning_modules.toLocaleString(),
      change: `${stats.total_textbooks} textbooks`,
      icon: BookOpen,
      color: 'purple'
    },
    {
      title: 'Quiz Attempts',
      value: stats.total_quiz_attempts.toLocaleString(),
      change: `${stats.completed_quizzes} completed`,
      icon: Activity,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Students */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Performing Students</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.top_students.map((student, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <span className="font-medium text-gray-900">{student.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{student.xp} XP</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((student.xp / 10000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage Users</h4>
            <p className="text-sm text-gray-500">Add, edit, or deactivate users</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <BookOpen className="w-6 h-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Content Management</h4>
            <p className="text-sm text-gray-500">Manage textbooks and learning materials</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Analytics</h4>
            <p className="text-sm text-gray-500">Detailed platform analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v1/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create user');
      }
      
      const newUser = await response.json();
      setUsers([...users, newUser]);
      setShowCreateModal(false);
      alert('User created successfully!');
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    }
  };

  const handleEditUser = async (userData: any) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/v1/admin/users/${selectedUser?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      const updatedUser = await response.json();
      const updatedUsers = users.map(user => 
        user.id === selectedUser?.id ? updatedUser : user
      );
      setUsers(updatedUsers);
      setShowEditModal(false);
      setSelectedUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        // TODO: Replace with actual API call
        const response = await fetch(`/api/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete user');
        }
        
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (confirm(`Are you sure you want to ${action} ${selectedUsers.length} users?`)) {
      try {
        // TODO: Replace with actual API call
        const response = await fetch('/api/v1/admin/users/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            action,
            userIds: selectedUsers
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to ${action} users`);
        }
        
        // Refresh user list
        await fetchUsers();
        setSelectedUsers([]);
        alert(`Bulk ${action} completed successfully!`);
      } catch (error) {
        console.error('Failed to perform bulk action:', error);
        alert('Failed to perform bulk action');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="parent">Parents</option>
              <option value="admin">Admins</option>
            </select>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add User
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedUsers.length} users selected
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Activate
                </button>
                <button 
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Deactivate
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Users ({filteredUsers.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(user => user.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'parent' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.school || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <UserModal
          title="Create New User"
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserModal
          title="Edit User"
          user={selectedUser}
          onSubmit={handleEditUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

// Content Tab Component
const ContentTab: React.FC = () => {
  const [contentStats, setContentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContentStats();
  }, []);

  const fetchContentStats = async () => {
    try {
      // Mock content statistics
      const mockStats = {
        total_textbooks: 6,
        total_chapters: 49,
        subjects: {
          'Mathematics': { textbooks: 1, chapters: 15 },
          'Physics': { textbooks: 1, chapters: 5 },
          'English': { textbooks: 1, chapters: 14 },
          'Bangla': { textbooks: 2, chapters: 10 },
          'ICT': { textbooks: 1, chapters: 3 },
          'Chemistry': { textbooks: 0, chapters: 0 },
          'Biology': { textbooks: 0, chapters: 0 }
        },
        textbook_details: [
          { filename: 'Math class 9-10 EV book full pdf.txt', subject: 'Mathematics', grade: '9-10', chapters: 15, total_pages: 250 },
          { filename: 'Physics 9-10 EV book full pdf_compressed.txt', subject: 'Physics', grade: '9-10', chapters: 5, total_pages: 180 },
          { filename: 'English Grammer pdf class 9-10 com_oc.txt', subject: 'English', grade: '9-10', chapters: 14, total_pages: 200 },
          { filename: 'Bangla Sahitto pdf class 9-10 com_oc.txt', subject: 'Bangla', grade: '9-10', chapters: 5, total_pages: 150 },
          { filename: 'বাংলা সহপাঠ-pdf 2025 com_oc.txt', subject: 'Bangla', grade: '9-10', chapters: 5, total_pages: 120 },
          { filename: 'ICT 9-10.txt', subject: 'ICT', grade: '9-10', chapters: 3, total_pages: 80 }
        ]
      };
      setContentStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch content stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Textbooks</p>
              <p className="text-2xl font-bold text-gray-900">{contentStats?.total_textbooks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Learning Modules</p>
              <p className="text-2xl font-bold text-gray-900">{contentStats?.total_chapters}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(contentStats?.subjects || {}).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Subject Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(contentStats?.subjects || {}).map(([subject, stats]: [string, any]) => (
              <div key={subject} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{subject}</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Textbooks: {stats.textbooks}</p>
                  <p className="text-sm text-gray-600">Chapters: {stats.chapters}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((stats.chapters / 15) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Textbook Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Textbook Library</h3>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Upload Textbook
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Textbook
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chapters
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pages
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contentStats?.textbook_details?.map((textbook: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {textbook.filename.replace('.txt', '').substring(0, 40)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {textbook.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {textbook.grade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {textbook.chapters}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {textbook.total_pages}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    <button className="text-green-600 hover:text-green-900 mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Mock analytics data
      const mockAnalytics = {
        userGrowth: [
          { date: '2024-12-01', registrations: 45 },
          { date: '2024-12-02', registrations: 52 },
          { date: '2024-12-03', registrations: 38 },
          { date: '2024-12-04', registrations: 61 },
          { date: '2024-12-05', registrations: 47 },
          { date: '2024-12-06', registrations: 55 },
          { date: '2024-12-07', registrations: 43 }
        ],
        learningActivity: [
          { date: '2024-12-01', quizAttempts: 234, completed: 187 },
          { date: '2024-12-02', quizAttempts: 267, completed: 201 },
          { date: '2024-12-03', quizAttempts: 198, completed: 156 },
          { date: '2024-12-04', quizAttempts: 289, completed: 234 },
          { date: '2024-12-05', quizAttempts: 245, completed: 198 },
          { date: '2024-12-06', quizAttempts: 278, completed: 223 },
          { date: '2024-12-07', quizAttempts: 201, completed: 167 }
        ],
        subjectPopularity: [
          { subject: 'Mathematics', attempts: 2456 },
          { subject: 'Physics', attempts: 1834 },
          { subject: 'English', attempts: 1567 },
          { subject: 'Bangla', attempts: 1234 },
          { subject: 'ICT', attempts: 987 }
        ],
        performanceMetrics: {
          averageScore: 78.5,
          completionRate: 82.3,
          averageTimeSpent: 24.7,
          topPerformingSubject: 'Mathematics'
        }
      };
      setAnalyticsData(mockAnalytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Platform Analytics</h3>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.performanceMetrics?.averageScore}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.performanceMetrics?.completionRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Time (min)</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData?.performanceMetrics?.averageTimeSpent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Top Subject</p>
              <p className="text-lg font-bold text-gray-900">{analyticsData?.performanceMetrics?.topPerformingSubject}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">User Registrations</h4>
          <div className="space-y-3">
            {analyticsData?.userGrowth?.map((day: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(day.registrations / 70) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{day.registrations}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Activity Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Quiz Activity</h4>
          <div className="space-y-3">
            {analyticsData?.learningActivity?.map((day: any, index: number) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                  <span className="text-gray-900">{day.quizAttempts} attempts</span>
                </div>
                <div className="flex space-x-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(day.completed / day.quizAttempts) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{Math.round((day.completed / day.quizAttempts) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Popularity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Subject Popularity</h4>
        <div className="space-y-4">
          {analyticsData?.subjectPopularity?.map((subject: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                </div>
                <span className="font-medium text-gray-900">{subject.subject}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-48 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full" 
                    style={{ width: `${(subject.attempts / 2500) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-16 text-right">{subject.attempts.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SystemTab: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      // Mock system health data
      const mockHealth = {
        database: {
          status: 'healthy',
          responseTime: '< 50ms',
          connections: 45,
          maxConnections: 100
        },
        contentService: {
          status: 'healthy',
          textbooksLoaded: 6,
          lastSync: '2024-12-28T10:30:00Z'
        },
        system: {
          uptime: '7 days, 14 hours',
          memoryUsage: 68,
          cpuUsage: 23,
          diskUsage: 45
        },
        services: [
          { name: 'API Server', status: 'running', port: 8000, uptime: '7d 14h' },
          { name: 'Database', status: 'running', port: 5432, uptime: '7d 14h' },
          { name: 'Redis Cache', status: 'running', port: 6379, uptime: '7d 14h' },
          { name: 'MongoDB', status: 'running', port: 27017, uptime: '7d 14h' }
        ],
        logs: [
          { timestamp: '2024-12-28T12:45:00Z', level: 'INFO', message: 'User authentication successful', service: 'API' },
          { timestamp: '2024-12-28T12:44:30Z', level: 'INFO', message: 'Quiz attempt completed', service: 'API' },
          { timestamp: '2024-12-28T12:44:15Z', level: 'INFO', message: 'Database backup completed', service: 'DB' },
          { timestamp: '2024-12-28T12:43:45Z', level: 'WARN', message: 'High memory usage detected', service: 'System' },
          { timestamp: '2024-12-28T12:43:20Z', level: 'INFO', message: 'Content sync completed', service: 'Content' }
        ]
      };
      setSystemHealth(mockHealth);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-blue-600 bg-blue-100';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-100';
      case 'ERROR':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Database</p>
              <p className="text-lg font-bold text-gray-900">{systemHealth?.database?.status}</p>
              <p className="text-sm text-gray-500">{systemHealth?.database?.responseTime}</p>
            </div>
            <div className={`p-3 rounded-full ${getStatusColor(systemHealth?.database?.status)}`}>
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Content Service</p>
              <p className="text-lg font-bold text-gray-900">{systemHealth?.contentService?.status}</p>
              <p className="text-sm text-gray-500">{systemHealth?.contentService?.textbooksLoaded} textbooks</p>
            </div>
            <div className={`p-3 rounded-full ${getStatusColor(systemHealth?.contentService?.status)}`}>
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Uptime</p>
              <p className="text-lg font-bold text-gray-900">{systemHealth?.system?.uptime}</p>
              <p className="text-sm text-gray-500">Running smoothly</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Memory Usage</span>
              <span className="text-sm text-gray-900">{systemHealth?.system?.memoryUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${systemHealth?.system?.memoryUsage > 80 ? 'bg-red-600' : systemHealth?.system?.memoryUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'}`}
                style={{ width: `${systemHealth?.system?.memoryUsage}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">CPU Usage</span>
              <span className="text-sm text-gray-900">{systemHealth?.system?.cpuUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${systemHealth?.system?.cpuUsage > 80 ? 'bg-red-600' : systemHealth?.system?.cpuUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'}`}
                style={{ width: `${systemHealth?.system?.cpuUsage}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Disk Usage</span>
              <span className="text-sm text-gray-900">{systemHealth?.system?.diskUsage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${systemHealth?.system?.diskUsage > 80 ? 'bg-red-600' : systemHealth?.system?.diskUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'}`}
                style={{ width: `${systemHealth?.system?.diskUsage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Services Status</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Port
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {systemHealth?.services?.map((service: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.port}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.uptime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Restart</button>
                    <button className="text-red-600 hover:text-red-900">Stop</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-lg font-medium text-gray-900">Recent System Logs</h4>
          <button className="text-blue-600 hover:text-blue-900 text-sm">View All Logs</button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {systemHealth?.logs?.map((log: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{log.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{log.service}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Arenas Tab Component
const ArenasTab: React.FC = () => {
  const [arenas, setArenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedArena, setSelectedArena] = useState<any>(null);

  useEffect(() => {
    fetchArenas();
  }, []);

  const fetchArenas = async () => {
    try {
      const response = await fetch('/api/v1/admin/arenas', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setArenas(data.arenas || []);
      }
    } catch (error) {
      console.error('Failed to fetch arenas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArena = async (arenaData: any) => {
    try {
      const response = await fetch('/api/v1/admin/arenas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(arenaData)
      });

      if (response.ok) {
        const newArena = await response.json();
        setArenas([...arenas, newArena]);
        setShowCreateModal(false);
        alert('Arena created successfully!');
      }
    } catch (error) {
      console.error('Failed to create arena:', error);
      alert('Failed to create arena');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading arenas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Learning Arenas</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create Arena</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {arenas.map((arena) => (
          <div key={arena.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Map className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{arena.name}</h3>
                <p className="text-sm text-gray-500">{arena.subject} • Grade {arena.grade}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">{arena.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{arena.adventures_count || 0} Adventures</span>
              <span>{arena.students_enrolled || 0} Students</span>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => setSelectedArena(arena)}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
              >
                Edit
              </button>
              <button className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200">
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateArenaModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateArena}
        />
      )}
    </div>
  );
};

// Adventures Tab Component
const AdventuresTab: React.FC = () => {
  const [adventures, setAdventures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAdventures();
  }, []);

  const fetchAdventures = async () => {
    try {
      const response = await fetch('/api/v1/admin/adventures', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdventures(data.adventures || []);
      }
    } catch (error) {
      console.error('Failed to fetch adventures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdventure = async (adventureData: any) => {
    try {
      const response = await fetch('/api/v1/admin/adventures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(adventureData)
      });

      if (response.ok) {
        const newAdventure = await response.json();
        setAdventures([...adventures, newAdventure]);
        setShowCreateModal(false);
        alert('Adventure created successfully!');
      }
    } catch (error) {
      console.error('Failed to create adventure:', error);
      alert('Failed to create adventure');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading adventures...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Learning Adventures</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Create Adventure</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adventures.map((adventure) => (
          <div key={adventure.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <PlayCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{adventure.name}</h3>
                <p className="text-sm text-gray-500">{adventure.arena_name}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">{adventure.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>{adventure.difficulty_level} Difficulty</span>
              <span>{adventure.estimated_duration} min</span>
            </div>
            <div className="flex space-x-2">
              <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                Edit
              </button>
              <button className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded text-sm hover:bg-green-200">
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateAdventureModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAdventure}
        />
      )}
    </div>
  );
};

// Study Materials Tab Component
const StudyMaterialsTab: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('');

  const materialTypes = [
    { id: 'audio', name: 'Audio', icon: Headphones, color: 'purple' },
    { id: 'video', name: 'Video', icon: Video, color: 'red' },
    { id: 'mindmap', name: 'Mind Map', icon: Brain, color: 'pink' },
    { id: 'report', name: 'Report', icon: FileText, color: 'blue' },
    { id: 'flashcard', name: 'Flashcards', icon: Image, color: 'yellow' },
    { id: 'infographic', name: 'Infographic', icon: Image, color: 'green' },
    { id: 'slides', name: 'Slide Deck', icon: Presentation, color: 'indigo' }
  ];

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/v1/admin/study-materials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMaterial = async (materialData: FormData) => {
    try {
      const response = await fetch('/api/v1/admin/study-materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: materialData
      });

      if (response.ok) {
        const newMaterial = await response.json();
        setMaterials([...materials, newMaterial]);
        setShowUploadModal(false);
        alert('Material uploaded successfully!');
      }
    } catch (error) {
      console.error('Failed to upload material:', error);
      alert('Failed to upload material');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading study materials...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Study Materials</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Material</span>
        </button>
      </div>

      {/* Material Type Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMaterialType('')}
          className={`px-3 py-1 rounded-full text-sm ${
            selectedMaterialType === '' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Types
        </button>
        {materialTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedMaterialType(type.id)}
            className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
              selectedMaterialType === type.id
                ? `bg-${type.color}-600 text-white`
                : `bg-${type.color}-100 text-${type.color}-700 hover:bg-${type.color}-200`
            }`}
          >
            <type.icon className="w-3 h-3" />
            <span>{type.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials
          .filter(material => !selectedMaterialType || material.type === selectedMaterialType)
          .map((material) => {
            const typeInfo = materialTypes.find(t => t.id === material.type);
            const IconComponent = typeInfo?.icon || FileText;
            
            return (
              <div key={material.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <IconComponent className={`w-8 h-8 text-${typeInfo?.color || 'gray'}-600`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{material.title}</h3>
                    <p className="text-sm text-gray-500">{typeInfo?.name} • {material.subject}</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{material.description}</p>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>Grade {material.grade}</span>
                  <span>{material.file_size}</span>
                </div>
                <div className="flex space-x-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                    Edit
                  </button>
                  <button className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200">
                    Download
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {showUploadModal && (
        <UploadMaterialModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUploadMaterial}
          materialTypes={materialTypes}
        />
      )}
    </div>
  );
};

export default AdminDashboard;

// User Modal Component for Create/Edit
interface UserModalProps {
  title: string;
  user?: AdminUser;
  onSubmit: (userData: any) => void;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ title, user, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    school: user?.school || '',
    district: user?.district || '',
    role: user?.role || 'student',
    is_active: user?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School
            </label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Active User
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Arena Modal Component
const CreateArenaModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    grade: '',
    difficulty_level: 'beginner',
    learning_objectives: '',
    prerequisites: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      grade: parseInt(formData.grade),
      learning_objectives: formData.learning_objectives.split('\n').filter(obj => obj.trim()),
      prerequisites: formData.prerequisites.split('\n').filter(req => req.trim())
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Create New Arena</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arena Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Physics Fundamentals"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Subject</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="mathematics">Mathematics</option>
                <option value="biology">Biology</option>
                <option value="english">English</option>
                <option value="bangla">Bangla</option>
                <option value="ict">ICT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade *
              </label>
              <select
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Grade</option>
                {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what students will learn in this arena..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Learning Objectives
            </label>
            <textarea
              value={formData.learning_objectives}
              onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter each objective on a new line..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prerequisites
            </label>
            <textarea
              value={formData.prerequisites}
              onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter each prerequisite on a new line..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Arena
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Adventure Modal Component
const CreateAdventureModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    arena_id: '',
    difficulty_level: 'beginner',
    estimated_duration: '',
    learning_objectives: '',
    content_type: 'interactive',
    bloom_levels: [] as number[]
  });

  const [arenas, setArenas] = useState<any[]>([]);

  useEffect(() => {
    // Fetch available arenas
    const fetchArenas = async () => {
      try {
        const response = await fetch('/api/v1/admin/arenas', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setArenas(data.arenas || []);
        }
      } catch (error) {
        console.error('Failed to fetch arenas:', error);
      }
    };
    fetchArenas();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      estimated_duration: parseInt(formData.estimated_duration),
      learning_objectives: formData.learning_objectives.split('\n').filter(obj => obj.trim())
    });
  };

  const handleBloomLevelChange = (level: number, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, bloom_levels: [...formData.bloom_levels, level] });
    } else {
      setFormData({ ...formData, bloom_levels: formData.bloom_levels.filter(l => l !== level) });
    }
  };

  const bloomLevels = [
    { level: 1, name: 'Remember', description: 'Recall facts and basic concepts' },
    { level: 2, name: 'Understand', description: 'Explain ideas or concepts' },
    { level: 3, name: 'Apply', description: 'Use information in new situations' },
    { level: 4, name: 'Analyze', description: 'Draw connections among ideas' },
    { level: 5, name: 'Evaluate', description: 'Justify a stand or decision' },
    { level: 6, name: 'Create', description: 'Produce new or original work' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Create New Adventure</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adventure Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Newton's Laws Explorer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arena *
              </label>
              <select
                required
                value={formData.arena_id}
                onChange={(e) => setFormData({ ...formData, arena_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Arena</option>
                {arenas.map(arena => (
                  <option key={arena.id} value={arena.id}>
                    {arena.name} ({arena.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (minutes) *
              </label>
              <input
                type="number"
                required
                min="5"
                max="180"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="interactive">Interactive</option>
                <option value="quiz">Quiz</option>
                <option value="simulation">Simulation</option>
                <option value="video">Video</option>
                <option value="reading">Reading</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Describe the adventure and what students will do..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Learning Objectives
            </label>
            <textarea
              value={formData.learning_objectives}
              onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter each objective on a new line..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Bloom's Taxonomy Levels
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bloomLevels.map((bloom) => (
                <label key={bloom.level} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.bloom_levels.includes(bloom.level)}
                    onChange={(e) => handleBloomLevelChange(bloom.level, e.target.checked)}
                    className="mt-1 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      Level {bloom.level}: {bloom.name}
                    </div>
                    <div className="text-sm text-gray-500">{bloom.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Adventure
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Upload Material Modal Component
const UploadMaterialModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  materialTypes: any[];
}> = ({ onClose, onSubmit, materialTypes }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
    type: '',
    tags: '',
    adventure_id: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    const formDataToSend = new FormData();
    
    // Add form fields
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });
    
    // Add file
    formDataToSend.append('file', file);
    
    // Add tags as array
    if (formData.tags) {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      formDataToSend.append('tags', JSON.stringify(tagsArray));
    }

    try {
      await onSubmit(formDataToSend);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const getAcceptedFileTypes = (type: string) => {
    switch (type) {
      case 'audio': return '.mp3,.wav,.ogg,.m4a';
      case 'video': return '.mp4,.webm,.ogg,.avi,.mov';
      case 'mindmap': return '.png,.jpg,.jpeg,.svg,.pdf';
      case 'report': return '.pdf,.doc,.docx';
      case 'flashcard': return '.png,.jpg,.jpeg,.svg';
      case 'infographic': return '.png,.jpg,.jpeg,.svg,.pdf';
      case 'slides': return '.pdf,.ppt,.pptx';
      default: return '*';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Upload Study Material</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Physics Formulas Flashcards"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Type</option>
                {materialTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <select
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Subject</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="mathematics">Mathematics</option>
                <option value="biology">Biology</option>
                <option value="english">English</option>
                <option value="bangla">Bangla</option>
                <option value="ict">ICT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade *
              </label>
              <select
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Grade</option>
                {[6, 7, 8, 9, 10, 11, 12].map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Describe the content and how it should be used..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter tags separated by commas (e.g., formulas, equations, reference)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File *
            </label>
            <input
              type="file"
              required
              onChange={handleFileChange}
              accept={formData.type ? getAcceptedFileTypes(formData.type) : '*'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {formData.type && (
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: {getAcceptedFileTypes(formData.type)}
              </p>
            )}
            {file && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{uploading ? 'Uploading...' : 'Upload Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};