import React, { useState } from 'react';
import { X, Mail, Search, UserPlus, Send } from 'lucide-react';

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChildAdded: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  medium: string;
}

export const AddChildModal: React.FC<AddChildModalProps> = ({
  isOpen,
  onClose,
  onChildAdded
}) => {
  const [activeTab, setActiveTab] = useState<'invite' | 'search'>('invite');
  const [isLoading, setIsLoading] = useState(false);
  
  // Invite by email state
  const [inviteForm, setInviteForm] = useState({
    childEmail: '',
    childName: '',
    relationshipType: 'guardian'
  });
  
  // Search state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/parent-child/invite-child', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          child_email: inviteForm.childEmail,
          child_name: inviteForm.childName || null,
          relationship_type: inviteForm.relationshipType
        })
      });
      
      if (response.ok) {
        alert('Invitation sent successfully! Your child will receive an email to accept the invitation.');
        setInviteForm({ childEmail: '', childName: '', relationshipType: 'guardian' });
        onChildAdded();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to send invitation'}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchEmail.length < 3) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/v1/parent-child/search-students?email=${encodeURIComponent(searchEmail)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data.students);
      } else {
        console.error('Search failed');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkStudent = async (studentId: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/parent-child/link-child', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          child_id: studentId,
          relationship_type: 'guardian'
        })
      });
      
      if (response.ok) {
        alert('Child linked successfully!');
        onChildAdded();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to link child'}`);
      }
    } catch (error) {
      console.error('Error linking child:', error);
      alert('Failed to link child. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add Child to Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('invite')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'invite'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Invite by Email
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Search & Link
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'invite' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Send Invitation</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send an email invitation to your child. They will need to accept the invitation to link their account.
                </p>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Child's Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.childEmail}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, childEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="child@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Child's Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteForm.childName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, childName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Child's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={inviteForm.relationshipType}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, relationshipType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="guardian">Guardian</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="stepmother">Stepmother</option>
                    <option value="stepfather">Stepfather</option>
                    <option value="grandmother">Grandmother</option>
                    <option value="grandfather">Grandfather</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !inviteForm.childEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search Students</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Search for your child by their email address and link them directly.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter child's email to search..."
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || searchEmail.length < 3}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSearching ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="border rounded-md">
                    <div className="p-3 bg-gray-50 border-b">
                      <h4 className="font-medium text-gray-900">Search Results</h4>
                    </div>
                    <div className="divide-y">
                      {searchResults.map((student) => (
                        <div key={student.id} className="p-4 flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">{student.name}</h5>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            <p className="text-sm text-gray-500">
                              Grade {student.grade} • {student.medium} Medium
                            </p>
                          </div>
                          <button
                            onClick={() => handleLinkStudent(student.id)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Link Child
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchEmail.length >= 3 && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No students found with that email address.</p>
                    <p className="text-sm mt-1">Try the "Invite by Email" option instead.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};