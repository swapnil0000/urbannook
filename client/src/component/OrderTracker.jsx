import React from 'react';
import { CheckCircle, Package, Truck, Home, XCircle } from 'lucide-react';

const OrderTracker = ({ status }) => {
  // Define order flow steps
  const steps = [
    { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
    { key: 'PROCESSING', label: 'Processing', icon: Package },
    { key: 'SHIPPED', label: 'Shipped', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: Home }
  ];

  // Handle special statuses
  if (status === 'CANCELLED' || status === 'FAILED') {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex flex-col items-center text-red-500">
          <XCircle className="w-12 h-12 mb-2" />
          <span className="text-sm font-medium">
            {status === 'CANCELLED' ? 'Order Cancelled' : 'Order Failed'}
          </span>
        </div>
      </div>
    );
  }

  // Handle CREATED and PAID statuses (before CONFIRMED)
  if (status === 'CREATED' || status === 'PAID') {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex flex-col items-center text-[#a89068]">
          <Package className="w-12 h-12 mb-2 animate-pulse" />
          <span className="text-sm font-medium">
            {status === 'CREATED' ? 'Order Created' : 'Payment Received'}
          </span>
          <span className="text-xs text-gray-500 mt-1">Awaiting confirmation</span>
        </div>
      </div>
    );
  }

  // Find current step index
  const currentStepIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 -z-10">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ 
              width: currentStepIndex >= 0 
                ? `${(currentStepIndex / (steps.length - 1)) * 100}%` 
                : '0%' 
            }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div 
              key={step.key} 
              className="flex flex-col items-center flex-1 relative"
            >
              {/* Icon circle */}
              <div 
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-300 z-10
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-400'
                  }
                  ${isCurrent ? 'ring-4 ring-green-200 scale-110' : ''}
                `}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Label */}
              <span 
                className={`
                  text-xs mt-2 font-medium text-center
                  ${isCompleted ? 'text-green-600' : 'text-gray-400'}
                  ${isCurrent ? 'font-bold' : ''}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTracker;
