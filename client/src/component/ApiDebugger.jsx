import React, { useState } from 'react';
import { getCurrentConfig, API_CONFIG } from '../config/appUrls';
import { useGetProductsQuery, useGetProductByIdQuery } from '../store/api/productsApi';

const ApiDebugger = () => {
  const [showDebug, setShowDebug] = useState(false);
  const [testProductId, setTestProductId] = useState('UN-PROD-102');
  const config = getCurrentConfig();

  // Test API calls
  const { data: productsData, isLoading: productsLoading, error: productsError } = useGetProductsQuery({
    page: 1,
    limit: 3
  });

  const { data: productData, isLoading: productLoading, error: productError } = useGetProductByIdQuery(testProductId, {
    skip: !testProductId
  });

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
        >
          API Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">API Debugger</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3 text-xs">
        {/* Configuration */}
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

        {/* Products API Test */}
        <div className="border-t pt-2">
          <div className="font-semibold mb-2">Products API Test</div>
          
          <div className="mb-2">
            <div className="font-medium">GET /products (limit: 3)</div>
            <div className={`p-2 rounded text-xs ${
              productsLoading ? 'bg-yellow-100' : 
              productsError ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {productsLoading ? 'Loading...' : 
               productsError ? `Error: ${productsError.message || 'Failed to fetch'}` :
               `Success: ${productsData?.data?.listOfProducts?.listOfProducts?.length || 0} products`}
            </div>
            {productsData && (
              <details className="mt-1">
                <summary className="cursor-pointer text-blue-600">View Response</summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(productsData, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <div className="mb-2">
            <div className="font-medium">GET /products/{testProductId}</div>
            <input
              type="text"
              value={testProductId}
              onChange={(e) => setTestProductId(e.target.value)}
              className="w-full p-1 border rounded text-xs mb-1"
              placeholder="Product ID"
            />
            <div className={`p-2 rounded text-xs ${
              productLoading ? 'bg-yellow-100' : 
              productError ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {productLoading ? 'Loading...' : 
               productError ? `Error: ${productError.message || 'Failed to fetch'}` :
               productData ? `Success: ${productData.data?.productName || 'Product found'}` : 'No data'}
            </div>
            {productData && (
              <details className="mt-1">
                <summary className="cursor-pointer text-blue-600">View Response</summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(productData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Manual Test URLs */}
        <div className="border-t pt-2">
          <div className="font-semibold mb-1">Test URLs:</div>
          <div className="space-y-1">
            <div className="text-xs">
              <a 
                href={`${config.apiUrl}/products`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {config.apiUrl}/products
              </a>
            </div>
            <div className="text-xs">
              <a 
                href={`${config.apiUrl}/products/${testProductId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {config.apiUrl}/products/{testProductId}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDebugger;