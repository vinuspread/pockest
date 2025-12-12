import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    } else {
      setPosition(null);
    }
  }, [isVisible]);

  const tooltipContent = position && (
    <div 
      className="fixed z-[9999] max-w-xs px-3 py-2 text-xs text-white bg-slate-800 rounded shadow-lg animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
      style={{ top: position.top, left: position.left }}
    >
      <p className="font-normal leading-relaxed break-words whitespace-normal">
        {text}
      </p>
    </div>
  );

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
}

