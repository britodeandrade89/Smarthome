import React, { useEffect, useState, useRef } from 'react';
import { Bell, Newspaper } from 'lucide-react';
import { Reminder, NewsCategory } from '../types';

interface NewsSidebarProps {
  reminders: Reminder[];
}

const NEWS_DB = {
  [NewsCategory.POLITICS]: [
    "Lula liga para Trump, fala sobre tarifaço e defende cooperação.",
    "Câmara deve votar projeto de devedor contumaz na próxima semana.",
    "Senado aprova novo marco fiscal com ampla maioria.",
  ],
  [NewsCategory.SPORTS]: [
    "Flamengo rompe barreira dos R$ 2 bilhões e mira hegemonia.",
    "Brasil vence amistoso preparatório para a Copa com goleada.",
    "Vôlei: Seleção masculina garante vaga nas Olimpíadas.",
  ],
  [NewsCategory.CULTURE]: [
    "Ex-MasterChef revela diagnóstico de infecção rara.",
    "Novo filme brasileiro é aclamado em festival internacional.",
    "Rock in Rio anuncia line-up completo para a edição de 2026.",
  ]
};

const NewsSidebar: React.FC<NewsSidebarProps> = ({ reminders }) => {
  const [newsIndexP, setNewsIndexP] = useState(0);
  const [newsIndexS, setNewsIndexS] = useState(0);
  const [newsIndexC, setNewsIndexC] = useState(0);
  
  // Reminder Rotation State
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);

  // Resize State
  const [splitRatio, setSplitRatio] = useState(0.5); // Percentage of top section (0.2 to 0.8)
  const containerRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);

  // Reminder Rotation Effect
  useEffect(() => {
    if (reminders.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentReminderIndex(prev => (prev + 1) % reminders.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [reminders.length]);

  // Reset index if list changes drastically
  useEffect(() => {
    if (currentReminderIndex >= reminders.length) {
      setCurrentReminderIndex(0);
    }
  }, [reminders]);

  // News Rotation Effect
  useEffect(() => {
    const intervalP = setInterval(() => setNewsIndexP(i => (i + 1) % NEWS_DB[NewsCategory.POLITICS].length), 15000);
    const intervalS = setInterval(() => setNewsIndexS(i => (i + 1) % NEWS_DB[NewsCategory.SPORTS].length), 15000);
    const intervalC = setInterval(() => setNewsIndexC(i => (i + 1) % NEWS_DB[NewsCategory.CULTURE].length), 15000);
    
    // Offset starts slightly to avoid all changing at once
    const timeoutS = setTimeout(() => setNewsIndexS(i => (i + 1) % NEWS_DB[NewsCategory.SPORTS].length), 5000);
    const timeoutC = setTimeout(() => setNewsIndexC(i => (i + 1) % NEWS_DB[NewsCategory.CULTURE].length), 10000);

    return () => {
      clearInterval(intervalP); clearInterval(intervalS); clearInterval(intervalC);
      clearTimeout(timeoutS); clearTimeout(timeoutC);
    };
  }, []);

  // Resize Drag Effect
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      
      // Calculate percentage, clamped between 20% and 80%
      const newRatio = Math.min(0.8, Math.max(0.2, relativeY / rect.height));
      setSplitRatio(newRatio);
    };

    const handleUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on mobile while dragging
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const renderNewsItem = (category: NewsCategory, text: string, colorClass: string) => (
    <div className="flex gap-4 items-start group hover:bg-white/5 p-2 rounded-lg transition-colors">
      <div className={`mt-1.5 w-1.5 h-12 rounded-full ${colorClass} transition-all group-hover:h-full`} />
      <div className="flex-1">
        <span className={`text-xs uppercase font-bold tracking-widest mb-1 block opacity-80 ${colorClass.replace('bg-', 'text-')}`}>
          {category}
        </span>
        <p className="text-xl font-normal leading-snug text-gray-200 group-hover:text-white transition-colors">
          {text}
        </p>
      </div>
    </div>
  );

  // Get current reminder to display
  const activeReminder = reminders.length > 0 ? reminders[currentReminderIndex] : null;

  return (
    <aside ref={containerRef} className="w-full h-full flex flex-col overflow-hidden font-sans text-white">
      
      {/* Reminders Section */}
      <div 
        className="flex flex-col border-b border-white/10 overflow-hidden min-h-0"
        style={{ height: `${splitRatio * 100}%` }}
      >
        <div className="flex-none p-6 pb-4 flex items-center justify-between text-yellow-300 opacity-90">
          <div className="flex items-center gap-3">
            <Bell size={24} />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Lembretes</h3>
          </div>
          {reminders.length > 1 && (
            <div className="flex gap-1">
              {reminders.map((_, idx) => (
                 <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentReminderIndex ? 'bg-yellow-400 scale-125' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 px-6 pb-2 flex flex-col justify-center items-stretch relative">
          {activeReminder ? (
             <div 
               key={currentReminderIndex} // Force re-render for animation
               className={`p-6 rounded-2xl border backdrop-blur-sm transition-all duration-500 animate-fade-in shadow-lg ${
                 activeReminder.type === 'alert' ? 'bg-red-500/20 border-red-500/30 shadow-red-500/10' : 
                 activeReminder.type === 'action' ? 'bg-blue-500/20 border-blue-500/30 shadow-blue-500/10' : 
                 'bg-white/10 border-white/10'
               }`}
             >
              <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                  activeReminder.type === 'alert' ? 'bg-red-500/20 text-red-100' : 
                  activeReminder.type === 'action' ? 'bg-blue-500/20 text-blue-100' : 
                  'bg-white/10 text-gray-300'
                }`}>
                  {activeReminder.type === 'alert' ? 'Urgente' : activeReminder.type === 'action' ? 'Ação' : 'Info'}
                </span>
                <span className="text-sm opacity-60 tracking-wider font-light">{activeReminder.time}</span>
              </div>
              <p className="text-2xl font-light text-white leading-tight">{activeReminder.text}</p>
            </div>
          ) : (
             <div className="text-center text-white/30 text-xl font-light">Sem lembretes hoje</div>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="h-5 -my-2.5 z-40 cursor-row-resize flex items-center justify-center group relative hover:z-50"
      >
        <div className="w-16 h-1 rounded-full bg-white/10 group-hover:bg-yellow-400/80 transition-colors shadow-sm" />
      </div>

      {/* News Section */}
      <div className="flex-1 px-6 pt-4 pb-6 flex flex-col bg-gradient-to-t from-black/60 to-transparent overflow-hidden min-h-0">
        <div className="flex-none flex items-center gap-3 mb-4 text-blue-300 opacity-90">
          <Newspaper size={24} />
          <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Feed</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6 justify-start overflow-y-auto hide-scrollbar">
          {renderNewsItem(NewsCategory.POLITICS, NEWS_DB[NewsCategory.POLITICS][newsIndexP], 'bg-blue-500')}
          <div className="w-full h-px bg-white/5 flex-none" />
          {renderNewsItem(NewsCategory.SPORTS, NEWS_DB[NewsCategory.SPORTS][newsIndexS], 'bg-green-500')}
          <div className="w-full h-px bg-white/5 flex-none" />
          {renderNewsItem(NewsCategory.CULTURE, NEWS_DB[NewsCategory.CULTURE][newsIndexC], 'bg-purple-500')}
        </div>
      </div>
    </aside>
  );
};

export default NewsSidebar;