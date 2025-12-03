import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudLightning } from 'lucide-react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
  weather: WeatherData;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather }) => {
  const { temperature, weathercode, is_day } = weather;
  
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
      // Moving left (decreasing X) or down (increasing Y) should increase scale 
      // because origin is top-right and handle is bottom-left.
      const deltaX = startPos.current.x - clientX;
      const deltaY = clientY - startPos.current.y;
      
      // Average the movement for smooth scaling
      const delta = (deltaX + deltaY) / 2;
      const sensitivity = 0.003; // Adjust sensitivity
      
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
    e.stopPropagation();
    isDragging.current = true;
    startPos.current = {
      x: 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX,
      y: 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    };
    initialScale.current = scale;
    document.body.style.cursor = 'sw-resize';
    document.body.style.userSelect = 'none';
  };

  const getWeatherIcon = () => {
    if (weathercode >= 95) return <CloudLightning className="text-purple-300 w-12 h-12 md:w-16 md:h-16" />;
    if (weathercode >= 51) return <CloudRain className="text-blue-300 w-12 h-12 md:w-16 md:h-16" />;
    if (weathercode >= 2) return <Cloud className="text-gray-300 w-12 h-12 md:w-16 md:h-16" />;
    return is_day === 1 
      ? <Sun className="text-yellow-300 w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]" /> 
      : <Moon className="text-yellow-100 w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_15px_rgba(254,249,195,0.3)]" />;
  };

  return (
    <div className="relative group/widget" style={{ zIndex: 30 }}>
      {/* Widget Container with Scale */}
      <div 
        className="origin-top-right transition-transform duration-75 ease-out will-change-transform"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md p-4 md:p-6 rounded-3xl border border-white/10 shadow-lg animate-fade-in select-none">
          <div className="flex flex-col items-end">
            <span className="text-5xl md:text-7xl font-bold tracking-tight leading-none text-white">
              {temperature !== '--' ? `${Math.round(Number(temperature))}°` : '--'}
            </span>
            <span className="text-xs md:text-sm uppercase tracking-[0.2em] font-medium text-white/70 mt-1">
              Maricá, RJ
            </span>
          </div>
          <div className="drop-shadow-md">
            {getWeatherIcon()}
          </div>
        </div>
      </div>

      {/* Resize Handle (Bottom-Left Corner) */}
      <div 
        className="absolute -bottom-2 -left-2 w-8 h-8 cursor-sw-resize flex items-end justify-start p-1 opacity-0 group-hover/widget:opacity-100 transition-opacity"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title="Arraste para redimensionar"
      >
        <div className="w-4 h-4 border-b-2 border-l-2 border-white/30 rounded-bl-lg hover:border-yellow-400 hover:bg-white/5 transition-colors" />
      </div>
    </div>
  );
};

export default WeatherWidget;