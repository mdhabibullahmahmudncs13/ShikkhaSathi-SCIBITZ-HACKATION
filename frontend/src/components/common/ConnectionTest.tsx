import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ConnectionTestProps {
  onClose?: () => void;
}

const ConnectionTest: React.FC<ConnectionTestProps> = ({ onClose }) => {
  const [tests, setTests] = useState({
    backend: { status: 'testing', message: 'Testing backend connection...' },
    cors: { status: 'testing', message: 'Testing CORS configuration...' },
    api: { status: 'testing', message: 'Testing API endpoints...' }
  });

  const runTests = async () => {
    // Reset tests
    setTests({
      backend: { status: 'testing', message: 'Testing backend connection...' },
      cors: { status: 'testing', message: 'Testing CORS configuration...' },
      api: { status: 'testing', message: 'Testing API endpoints...' }
    });

    // Test 1: Backend Health Check
    try {
      const healthResponse = await fetch('http://localhost:8000/api/v1/health', {
        method: 'HEAD',
        mode: 'cors'
      });
      
      if (healthResponse.ok) {
        setTests(prev => ({
          ...prev,
          backend: { status: 'success', message: 'Backend server is running on port 8000' }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          backend: { status: 'error', message: `Backend responded with status: ${healthResponse.status}` }
        }));
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        backend: { status: 'error', message: 'Backend server is not running or blocked by ad blocker' }
      }));
    }

    // Test 2: CORS Check
    try {
      const corsResponse = await fetch('http://localhost:8000/api/v1/health', {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (corsResponse.ok) {
        setTests(prev => ({
          ...prev,
          cors: { status: 'success', message: 'CORS is properly configured' }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          cors: { status: 'error', message: 'CORS configuration issue' }
        }));
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        cors: { status: 'error', message: 'CORS blocked or network error' }
      }));
    }

    // Test 3: API Endpoint Test
    try {
      const apiResponse = await fetch('http://localhost:8000/api/v1/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setTests(prev => ({
          ...prev,
          api: { status: 'success', message: `API is working. Version: ${data.api_version}` }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          api: { status: 'error', message: `API error: ${apiResponse.status}` }
        }));
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        api: { status: 'error', message: 'API endpoint blocked or unavailable' }
      }));
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'testing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const allTestsPassed = Object.values(tests).every(test => test.status === 'success');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Connection Diagnostics</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-4">
          {Object.entries(tests).map(([key, test]) => (
            <div key={key} className="flex items-start gap-3">
              {getStatusIcon(test.status)}
              <div>
                <div className="font-medium capitalize">{key} Connection</div>
                <div className="text-sm text-gray-600">{test.message}</div>
              </div>
            </div>
          ))}
        </div>

        {!allTestsPassed && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 Troubleshooting Tips:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• <strong>Backend not running:</strong> Run <code>cd backend && python run_dev.py</code></li>
              <li>• <strong>Ad blocker issues:</strong> Disable uBlock Origin, AdBlock Plus, etc.</li>
              <li>• <strong>Browser extensions:</strong> Try incognito/private mode</li>
              <li>• <strong>Firewall:</strong> Allow localhost:8000 in firewall settings</li>
              <li>• <strong>Antivirus:</strong> Add localhost to antivirus whitelist</li>
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={runTests}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retest
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>

        {allTestsPassed && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-green-800 font-medium">✅ All tests passed!</div>
            <div className="text-sm text-green-600">Your connection should work now.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionTest;