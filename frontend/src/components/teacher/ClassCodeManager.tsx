import React, { useState } from 'react';
import { Copy, RefreshCw, Eye, EyeOff, Users, Settings, CheckCircle, AlertCircle } from 'lucide-react';

interface ClassCodeManagerProps {
  classId: string;
  className: string;
  classCode: string;
  codeEnabled: boolean;
  studentsCount: number;
  maxStudents: number;
  onRegenerateCode: (classId: string) => Promise<string>;
  onToggleCode: (classId: string, enabled: boolean) => Promise<void>;
}

const ClassCodeManager: React.FC<ClassCodeManagerProps> = ({
  classId,
  className,
  classCode,
  codeEnabled,
  studentsCount,
  maxStudents,
  onRegenerateCode,
  onToggleCode
}) => {
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentCode, setCurrentCode] = useState(classCode);
  const [currentEnabled, setCurrentEnabled] = useState(codeEnabled);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleRegenerateCode = async () => {
    setLoading(true);
    try {
      const newCode = await onRegenerateCode(classId);
      setCurrentCode(newCode);
      setCurrentEnabled(true);
    } catch (err) {
      console.error('Failed to regenerate code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCode = async () => {
    setLoading(true);
    try {
      const newEnabled = !currentEnabled;
      await onToggleCode(classId, newEnabled);
      setCurrentEnabled(newEnabled);
    } catch (err) {
      console.error('Failed to toggle code:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{className}</h3>
          <p className="text-sm text-gray-600">
            {studentsCount}/{maxStudents} students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">{studentsCount}</span>
        </div>
      </div>

      {/* Class Code Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Class Code</label>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              currentEnabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {currentEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Code Display */}
        <div className="relative">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <div className="font-mono text-lg font-bold text-gray-900 tracking-wider">
                {showCode ? currentCode : '•••••••'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Share this code with students to join your class
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCode(!showCode)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title={showCode ? 'Hide code' : 'Show code'}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              
              <button
                onClick={handleCopyCode}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="Copy code"
                disabled={!currentEnabled}
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleToggleCode}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            <Settings className="w-4 h-4" />
            {currentEnabled ? 'Disable Code' : 'Enable Code'}
          </button>
          
          <button
            onClick={handleRegenerateCode}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            New Code
          </button>
        </div>

        {/* Status Messages */}
        {!currentEnabled && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              Code is disabled. Students cannot join this class using the code.
            </p>
          </div>
        )}

        {studentsCount >= maxStudents && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">
              Class is full. No more students can join.
            </p>
          </div>
        )}

        {copied && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">
              Class code copied to clipboard!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassCodeManager;