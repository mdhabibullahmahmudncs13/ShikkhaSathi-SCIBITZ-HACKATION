import React, { useState } from 'react';
import { quizAPI } from '../../services/apiClient';

const APIDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSubjectsAPI = async () => {
    setLoading(true);
    try {
      console.log('🔍 Testing subjects API...');
      const response = await quizAPI.getSubjects();
      console.log('✅ Subjects API Response:', response);
      console.log('📊 Subjects array:', response.subjects);
      
      // Check ICT specifically
      const ictSubject = response.subjects?.find((s: any) => s.subject === 'ICT');
      console.log('🎯 ICT Subject:', ictSubject);
      
      setDebugInfo({
        fullResponse: response,
        subjectsArray: response.subjects,
        ictSubject: ictSubject,
        responseType: typeof response,
        subjectsType: typeof response.subjects
      });
    } catch (error) {
      console.error('❌ Subjects API Error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">API Debugger</h3>
      <button
        onClick={testSubjectsAPI}
        disabled={loading}
        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Subjects API'}
      </button>
      
      {debugInfo && (
        <div className="mt-3 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default APIDebugger;