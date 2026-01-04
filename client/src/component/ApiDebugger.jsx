import React, { useState } from 'react';
import { getCurrentConfig, API_CONFIG } from '../config/appUrls';

const ApiDebugger = () => {
  const [showDebug, setShowDebug] = useState(false);
  const config = getCurrentConfig();

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
        >
          API Info
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">API Configuration</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-semibold">Environment:</span>
          <span className={`ml-2 px-2 py-1 rounded ${
            config.environment === 'local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {config.environment}
          </span>
        </div>
        
        <div>
          <span className="font-semibold">API URL:</span>
          <div className="mt-1 p-2 bg-gray-100 rounded text-xs break-all">
            {config.apiUrl}
          </div>
        </div>
        
        <div>
          <span className="font-semibold">Hostname:</span> {config.hostname}
        </div>
        
        <div>
          <span className="font-semibold">Dev Mode:</span> {config.isDev ? 'Yes' : 'No'}
        </div>

        <div className="pt-2 border-t">
          <div className="font-semibold mb-1">Available URLs:</div>
          <div className="space-y-1">
            <div className="text-xs">
              <span className="text-green-600">Local:</span> {API_CONFIG.LOCAL}
            </div>
            <div className="text-xs">
              <span className="text-blue-600">Production:</span> {API_CONFIG.PRODUCTION}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDebugger;