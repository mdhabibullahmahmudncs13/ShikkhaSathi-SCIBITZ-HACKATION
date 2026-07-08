import React, { useState } from 'react';
import AIModeSelector from './AIModeSelector';

const TestAIModeSelector: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<string>('');

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI Mode Selector Test</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <AIModeSelector
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          disabled={false}
        />
        
        {selectedMode && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              <strong>Selected Mode:</strong> {selectedMode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAIModeSelector;