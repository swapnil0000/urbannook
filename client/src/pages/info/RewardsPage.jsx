import React, { useState, useEffect } from 'react';

const RewardsPage = () => {
  const [userPoints] = useState(2450);
  const [rewardHistory] = useState([
    { date: '2024-01-20', action: 'Purchase', points: 245, description: 'Order #ORD-002' },
    { date: '2024-01-15', action: 'Purchase', points: 499, description: 'Order #ORD-001' },
    { date: '2024-01-10', action: 'Review', points: 50, description: 'Product review bonus' },
    { date: '2024-01-05', action: 'Signup', points: 100, description: 'Welcome bonus' }
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const rewards = [
    { id: 1, title: '₹100 Off', points: 500, description: 'On orders above ₹2000', type: 'discount' },
    { id: 2, title: '₹250 Off', points: 1000, description: 'On orders above ₹5000', type: 'discount' },
    { id: 3, title: 'Free Delivery', points: 200, description: 'Free delivery on any order', type: 'shipping' },
    { id: 4, title: '₹500 Off', points: 2000, description: 'On orders above ₹10000', type: 'discount' },
    { id: 5, title: 'Premium Support', points: 1500, description: '30 days priority support', type: 'service' },
    { id: 6, title: '₹1000 Off', points: 4000, description: 'On orders above ₹20000', type: 'discount' }
  ];

  const redeemReward = (reward) => {
    if (userPoints >= reward.points) {
      console.log('Redeeming reward:', reward);
      // Redeem reward logic
    }
  };

  const getRewardIcon = (type) => {
    switch (type) {
      case 'discount': return 'fa-percent';
      case 'shipping': return 'fa-truck';
      case 'service': return 'fa-crown';
      default: return 'fa-gift';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-gift text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Rewards Program</h1>
              <p className="text-amber-100">Earn points with every purchase</p>
            </div>
          </div>
        </div>

        {/* Points Summary */}
        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600 mb-2">{userPoints.toLocaleString()}</div>
              <div className="text-gray-600">Available Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 mb-2">₹{Math.floor(userPoints / 10)}</div>
              <div className="text-gray-600">Reward Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">Gold</div>
              <div className="text-gray-600">Member Status</div>
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6">Available Rewards</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {rewards.map((reward) => (
              <div key={reward.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    reward.type === 'discount' ? 'bg-green-100' :
                    reward.type === 'shipping' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <i className={`fa-solid ${getRewardIcon(reward.type)} ${
                      reward.type === 'discount' ? 'text-green-600' :
                      reward.type === 'shipping' ? 'text-blue-600' : 'text-purple-600'
                    }`}></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{reward.title}</h3>
                    <p className="text-sm text-gray-600">{reward.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-amber-600 font-semibold">
                    {reward.points.toLocaleString()} points
                  </div>
                  <button
                    onClick={() => redeemReward(reward)}
                    disabled={userPoints < reward.points}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      userPoints >= reward.points
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {userPoints >= reward.points ? 'Redeem' : 'Not Enough Points'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Points History */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Points History</h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-4">
                {rewardHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.action === 'Purchase' ? 'bg-green-100' :
                        item.action === 'Review' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        <i className={`fa-solid ${
                          item.action === 'Purchase' ? 'fa-shopping-cart text-green-600' :
                          item.action === 'Review' ? 'fa-star text-blue-600' : 'fa-user-plus text-purple-600'
                        } text-sm`}></i>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.description}</div>
                        <div className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-amber-600 font-semibold">+{item.points} pts</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How to Earn Points */}
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">How to Earn More Points</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-shopping-cart text-amber-600"></i>
                <span>Earn 1 point for every ₹10 spent</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-star text-amber-600"></i>
                <span>50 points for product reviews</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-birthday-cake text-amber-600"></i>
                <span>200 points on your birthday</span>
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-share text-amber-600"></i>
                <span>100 points for referrals</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;