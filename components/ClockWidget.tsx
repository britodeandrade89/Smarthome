import React, { useState, useEffect, useRef } from 'react';

interface ClockWidgetProps {
  currentTime: Date;
  greeting: string;
  isListening: boolean;
  onInteraction: () => void;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ currentTime, greeting, isListening, onInteraction }) => {
  // State for scaling
  const [scale, setScale] = useState(1);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const initialScale = useRef(1);

  // Drag Logic
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      // Calculate distance moved. 
      // For Clock (Top-Left origin), dragging the handle (Bottom-Right) 
      // towards Right (Increasing X) or Down (Increasing Y) increases scale.
      const deltaX = clientX - startPos.current.x;
      const deltaY = clientY - startPos.current.y;
      
      // Average the movement for smooth scaling
      const delta = (deltaX + deltaY) / 2;
      const sensitivity = 0.003; 
      
      // Limit scale between 0.6x and 1.5x
      const newScale = Math.min(1.5, Math.max(0.6, initialScale.current + delta * sensitivity));
      setScale(newScale);
    };

    const handleUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchend', handleUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop click propagation to the main container
    isDragging.current = true;
    startPos.current = {
      x: 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX,
      y: 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    };
    initialScale.current = scale;
    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="relative group/widget" style={{ zIndex: 30 }}>
      {/* Scalable Container */}
      <div 
        className="origin-top-left transition-transform duration-75 ease-out will-change-transform"
        style={{ transform: `scale(${scale})` }}
      >
        <div 
          className="flex flex-col items-start cursor-pointer active:scale-95 transition-transform select-none group" 
          onClick={onInteraction}
        >
          <div className="text-3xl md:text-5xl font-light tracking-wide text-white/90 drop-shadow-md flex items-center gap-3 uppercase">
             {greeting} 
             {isListening && (
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
             )}
          </div>
          <div className="text-8xl md:text-[9rem] font-medium tracking-tight text-white opacity-90 leading-[0.85] mt-2 group-hover:opacity-100 transition-opacity">
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Resize Handle (Bottom-Right Corner) */}
      <div 
        className="absolute -bottom-4 -right-4 w-10 h-10 cursor-se-resize flex items-end justify-end p-2 opacity-0 group-hover/widget:opacity-100 transition-opacity z-40"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title="Arraste para redimensionar"
      >
        <div className="w-4 h-4 border-b-2 border-r-2 border-white/30 rounded-br-lg hover:border-yellow-400 hover:bg-white/5 transition-colors" />
      </div>
    </div>
  );
};

export default ClockWidget;