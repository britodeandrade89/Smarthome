import React, { useEffect, useState, useRef } from 'react';
import { Bell, Newspaper } from 'lucide-react';
import { Reminder, NewsCategory } from '../types';

interface NewsSidebarProps {
  reminders: Reminder[];
}

interface NewsArticle {
  title: string;
  image: string;
}

const NEWS_DB: Record<NewsCategory, NewsArticle[]> = {
  [NewsCategory.POLITICS]: [
    { 
      title: "Lula liga para Trump, fala sobre tarifaço e defende cooperação bilateral.", 
      image: "https://images.unsplash.com/photo-1541872703-74c5963631df?q=80&w=600&auto=format&fit=crop" 
    },
    { 
      title: "Câmara deve votar projeto de devedor contumaz na próxima semana.", 
      image: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=600&auto=format&fit=crop" 
    },
    { 
      title: "Senado aprova novo marco fiscal com ampla maioria.", 
      image: "https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=600&auto=format&fit=crop" 
    },
  ],
  [NewsCategory.SPORTS]: [
    { 
      title: "Flamengo rompe barreira dos R$ 2 bilhões e mira hegemonia.", 
      image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop" 
    },
    { 
      title: "Brasil vence amistoso preparatório para a Copa com goleada.", 
      image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=600&auto=format&fit=crop" 
    },
    { 
      title: "Vôlei: Seleção masculina garante vaga nas Olimpíadas.", 
      image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=600&auto=format&fit=crop" 
    },
  ],
  [NewsCategory.CULTURE]: [
    { 
      title: "Novo filme brasileiro é aclamado em festival internacional.", 
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop" 
    },
    { 
      title: "Rock in Rio anuncia line-up completo para a edição de 2026.", 
      image: "https://images.unsplash.com/photo-1459749411177-d4a414c9ff5f?q=80&w=600&auto=format&fit=crop" 
    },
    { 
      title: "Exposição imersiva de Van Gogh chega ao Rio de Janeiro.", 
      image: "https://images.unsplash.com/photo-1578301978693-85ea9ec2a20c?q=80&w=600&auto=format&fit=crop" 
    },
  ]
};

const NewsSidebar: React.FC<NewsSidebarProps> = ({ reminders }) => {
  const [newsIndexP, setNewsIndexP] = useState(0);
  const [newsIndexS, setNewsIndexS] = useState(0);
  const [newsIndexC, setNewsIndexC] = useState(0);
  
  // Reminder Rotation State
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);

  // Resize State
  const [splitRatio, setSplitRatio] = useState(0.4); 
  const containerRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);

  // Reminder Rotation Effect
  useEffect(() => {
    if (reminders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentReminderIndex(prev => (prev + 1) % reminders.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [reminders.length]);

  useEffect(() => {
    if (currentReminderIndex >= reminders.length) setCurrentReminderIndex(0);
  }, [reminders]);

  // News Rotation Effect
  useEffect(() => {
    const intervalP = setInterval(() => setNewsIndexP(i => (i + 1) % NEWS_DB[NewsCategory.POLITICS].length), 15000);
    const intervalS = setInterval(() => setNewsIndexS(i => (i + 1) % NEWS_DB[NewsCategory.SPORTS].length), 15000);
    const intervalC = setInterval(() => setNewsIndexC(i => (i + 1) % NEWS_DB[NewsCategory.CULTURE].length), 15000);
    
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
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const renderNewsCard = (category: NewsCategory, article: NewsArticle, colorClass: string) => (
    <div className="group relative w-full h-36 md:h-44 rounded-2xl overflow-hidden border border-white/10 shadow-lg shrink-0 transition-transform hover:scale-[1.02] bg-zinc-900">
      <img 
        src={article.image} 
        alt={category} 
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none'; // Fallback to background if image fails
        }}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100"
      />
      
      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 p-4 w-full z-10">
        <span className={`inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md mb-2 bg-black/50 backdrop-blur-md border border-white/10 ${colorClass.replace('bg-', 'text-')}`}>
          {category}
        </span>
        <p className="text-lg md:text-xl font-normal leading-tight text-white drop-shadow-md line-clamp-2">
          {article.title}
        </p>
      </div>
      <div className={`absolute top-0 left-0 w-full h-1 ${colorClass} z-10`} />
    </div>
  );

  const activeReminder = reminders.length > 0 ? reminders[currentReminderIndex] : null;

  return (
    <aside ref={containerRef} className="w-full h-full flex flex-col overflow-hidden font-sans text-white">
      
      {/* Reminders Section */}
      <div 
        className="flex flex-col border-b border-white/10 overflow-hidden min-h-0 relative bg-black/20"
        style={{ height: `${splitRatio * 100}%` }}
      >
        <div className="flex-none p-6 pb-2 flex items-center justify-between text-yellow-300 opacity-90 z-10">
          <div className="flex items-center gap-3">
            <Bell size={20} />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Lembretes</h3>
          </div>
          {reminders.length > 1 && (
            <div className="flex gap-1.5">
              {reminders.map((_, idx) => (
                 <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentReminderIndex ? 'bg-yellow-400 w-3' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 px-6 pb-4 flex flex-col justify-center items-stretch relative">
          {activeReminder ? (
             <div 
               key={currentReminderIndex} 
               className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-500 animate-fade-in shadow-xl flex flex-col gap-2 ${
                 activeReminder.type === 'alert' ? 'bg-gradient-to-br from-red-900/40 to-red-600/10 border-red-500/30' : 
                 activeReminder.type === 'action' ? 'bg-gradient-to-br from-blue-900/40 to-blue-600/10 border-blue-500/30' : 
                 'bg-white/5 border-white/10'
               }`}
             >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                  activeReminder.type === 'alert' ? 'bg-red-500/20 text-red-100 border-red-500/30' : 
                  activeReminder.type === 'action' ? 'bg-blue-500/20 text-blue-100 border-blue-500/30' : 
                  'bg-white/10 text-gray-300 border-white/10'
                }`}>
                  {activeReminder.type === 'alert' ? 'Urgente' : activeReminder.type === 'action' ? 'Ação' : 'Info'}
                </span>
                <span className="text-sm font-medium opacity-60 font-mono bg-black/20 px-2 rounded">{activeReminder.time}</span>
              </div>
              <p className="text-2xl font-light text-white leading-tight mt-1">{activeReminder.text}</p>
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
        className="h-4 -my-2 z-50 cursor-row-resize flex items-center justify-center group relative w-full"
      >
        <div className="w-12 h-1.5 rounded-full bg-white/20 group-hover:bg-yellow-400 transition-colors shadow-lg backdrop-blur-sm" />
      </div>

      {/* News Section */}
      <div className="flex-1 px-6 pt-4 pb-6 flex flex-col bg-gradient-to-t from-black/80 to-transparent overflow-hidden min-h-0">
        <div className="flex-none flex items-center gap-3 mb-4 text-blue-300 opacity-90">
          <Newspaper size={20} />
          <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Feed de Notícias</h3>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-4 pb-20 md:pb-0">
          {renderNewsCard(NewsCategory.POLITICS, NEWS_DB[NewsCategory.POLITICS][newsIndexP], 'bg-blue-500')}
          {renderNewsCard(NewsCategory.SPORTS, NEWS_DB[NewsCategory.SPORTS][newsIndexS], 'bg-green-500')}
          {renderNewsCard(NewsCategory.CULTURE, NEWS_DB[NewsCategory.CULTURE][newsIndexC], 'bg-purple-500')}
        </div>
      </div>
    </aside>
  );
};

export default NewsSidebar;