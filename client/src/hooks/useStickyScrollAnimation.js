import { useEffect, useRef, useState } from 'react';

export const useStickyScrollAnimation = (items) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef();
  const itemRefs = useRef([]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerHeight = containerRect.height;
      const viewportHeight = window.innerHeight;

      // Calculate progress through the container
      const scrollProgress = Math.max(0, Math.min(1, 
        (viewportHeight / 2 - containerTop) / (containerHeight - viewportHeight / 2)
      ));

      // Determine which item should be active based on scroll progress
      const newActiveIndex = Math.floor(scrollProgress * items * 2) - 1;
      
      if (newActiveIndex !== activeIndex && newActiveIndex >= -1 && newActiveIndex < items) {
        setActiveIndex(newActiveIndex);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [items, activeIndex]);

  return [containerRef, activeIndex, itemRefs];
};