"use client";

import { useEffect, useRef } from "react";

export default function ScrollIndicator() {
  const thumbRef = useRef(null);
  
  useEffect(() => {
    let targetTop = 0;
    let currentTop = 0;
    let targetHeight = 0;
    let currentHeight = 0;
    let isVisible = false;
    let animationFrameId;
    
    const getScrollContainer = () => {
      const mainEl = document.querySelector('main');
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) return mainEl;
      return document.documentElement;
    };

    const updateMeasurements = () => {
      const container = getScrollContainer();
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollTop = container === document.documentElement 
        ? (window.scrollY || document.documentElement.scrollTop) 
        : container.scrollTop;

      if (scrollHeight <= clientHeight) {
        if (isVisible && thumbRef.current) {
          thumbRef.current.style.opacity = '0';
          isVisible = false;
        }
        return;
      }

      if (!isVisible && thumbRef.current) {
        thumbRef.current.style.opacity = '1';
        isVisible = true;
      }

      const windowHeight = window.innerHeight;
      
      targetHeight = Math.max((clientHeight / scrollHeight) * windowHeight, 40);
      
      const maxScrollTop = scrollHeight - clientHeight;
      const scrollFraction = scrollTop / maxScrollTop;
      
      // Multiply by windowHeight to ensure it travels to the absolute bottom of the screen!
      targetTop = scrollFraction * (windowHeight - targetHeight);
    };

    const handleScroll = (e) => {
      const container = getScrollContainer();
      if (e && e.target && e.target !== document && e.target !== container) {
        return;
      }
      updateMeasurements();
    };

    const loop = () => {
      // Lerp (Linear Interpolation) gives it a buttery smooth, "fluid" physical feel
      currentTop += (targetTop - currentTop) * 0.18;
      currentHeight += (targetHeight - currentHeight) * 0.2;
      
      if (thumbRef.current && isVisible) {
        if (Math.abs(targetTop - currentTop) < 0.1) currentTop = targetTop;
        if (Math.abs(targetHeight - currentHeight) < 0.1) currentHeight = targetHeight;
        
        // Bypassing React state entirely for 60+ fps performance
        thumbRef.current.style.transform = `translateY(${currentTop}px)`;
        thumbRef.current.style.height = `${currentHeight}px`;
      }
      
      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateMeasurements);
    
    const observer = new MutationObserver(updateMeasurements);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    updateMeasurements();
    
    currentTop = targetTop;
    currentHeight = targetHeight;
    loop();

    const interval = setInterval(updateMeasurements, 500);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateMeasurements);
      observer.disconnect();
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed top-0 right-0 h-screen w-[3px] z-[9999] pointer-events-none overflow-hidden">
      <div 
        ref={thumbRef}
        className="w-full bg-black/60 dark:bg-white/60 backdrop-blur-md rounded-l-full transition-opacity duration-300"
        style={{ 
          opacity: 0,
          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}
      />
    </div>
  );
}
