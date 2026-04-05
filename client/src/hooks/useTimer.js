import { useState, useEffect } from 'react';

const useTimer = (targetDateString) => {
  const [timeLeft, setTimeLeft] = useState({ 
    hours: '00', 
    minutes: '00', 
    seconds: '00',
    isExpired: false 
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const targetDate = new Date(targetDateString);
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({
          hours: hours.toString().padStart(2, '0'),
          minutes: minutes.toString().padStart(2, '0'),
          seconds: seconds.toString().padStart(2, '0'),
          isExpired: false
        });
      } else {
        setTimeLeft({
          hours: '00',
          minutes: '00',
          seconds: '00',
          isExpired: true
        });
      }
    };

    const timerInterval = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timerInterval);
  }, [targetDateString]);

  return timeLeft;
};

export default useTimer;
