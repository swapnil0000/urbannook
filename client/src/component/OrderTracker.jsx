import React from 'react';

const OrderTracker = ({ status }) => {
  // Define order flow steps with FontAwesome icons
  const steps = [
    { key: 'CONFIRMED', label: 'Confirmed', icon: 'fas fa-check-circle' },
    { key: 'PROCESSING', label: 'Processing', icon: 'fas fa-box' },
    { key: 'SHIPPED', label: 'Shipped', icon: 'fas fa-truck' },
    { key: 'DELIVERED', label: 'Delivered', icon: 'fas fa-home' }
  ];

  // Handle special statuses
  if (status === 'CANCELLED' || status === 'FAILED') {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex flex-col items-center text-red-500">
          <i className="fas fa-times-circle text-5xl mb-2"></i>
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
          <i className="fas fa-box text-5xl mb-2 animate-pulse"></i>
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
                <i className={`${step.icon} text-xl`}></i>
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