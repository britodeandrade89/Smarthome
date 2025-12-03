import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Mic } from 'lucide-react';
import { WeatherData, Reminder } from './types';
import WeatherWidget from './components/WeatherWidget';
import ClockWidget from './components/ClockWidget';
import NewsSidebar from './components/NewsSidebar';
import ChefModal from './components/ChefModal';
import { subscribeToReminders } from './services/firebase';
import { processVoiceCommand } from './services/geminiService';

const App = () => {
  // --- STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>({
    temperature: '--',
    weathercode: 0,
    is_day: 1
  });
  
  // App Data
  const [firebaseReminders, setFirebaseReminders] = useState<Reminder[]>([]);
  
  // Voice & Interaction
  const [lastDetectedPerson, setLastDetectedPerson] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false); // Active listening state
  const [isProcessing, setIsProcessing] = useState(false); // AI Processing state
  const [greeting, setGreeting] = useState('');
  const [isChefOpen, setIsChefOpen] = useState(false);

  // Layout resizing state
  const [sidebarSize, setSidebarSize] = useState(340);
  const [isMd, setIsMd] = useState(true);
  const resizingRef = useRef(false);

  // Audio & Speech Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- CONFIG ---
  const LAT = -22.9194; // Maricá
  const LON = -42.8186;

  // --- INITIALIZATION ---
  
  // 1. Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToReminders((newReminders) => {
      setFirebaseReminders(newReminders);
    });
    return () => unsubscribe();
  }, []);

  // 2. Wake Word Detection (Voice Activation)
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    recognition.onresult = async (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript.toLowerCase().trim();
      
      console.log("Heard:", transcript);

      if (isListening || isProcessing) return; // Don't trigger if already busy

      // Wake Words logic
      const wakeWords = [
        "smart home", 
        "olá smart home", 
        "ok google", 
        "olá google", 
        "ola google"
      ];

      if (wakeWords.some(word => transcript.includes(word))) {
        console.log("Wake word detected!");
        activateAssistant();
      }
    };

    recognition.onerror = (e: any) => {
      console.warn("Recognition error:", e.error);
    };

    recognition.onend = () => {
      // Auto-restart for "Always On" feel
      if (!isListening) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) { console.warn("Could not start recognition", e); }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isListening, isProcessing]);

  // --- HELPER FUNCTIONS ---

  const activateAssistant = () => {
    setIsListening(true);
    // Play subtle wake sound could go here
    
    // Switch to command recognition mode (single shot)
    if (recognitionRef.current) recognitionRef.current.stop();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const commandRecognition = new SpeechRecognition();
    commandRecognition.continuous = false;
    commandRecognition.lang = 'pt-BR';

    commandRecognition.onstart = () => { console.log("Listening for command..."); };

    commandRecognition.onresult = async (event: any) => {
      const command = event.results[0][0].transcript;
      setIsListening(false);
      setIsProcessing(true);
      
      // Process with Gemini
      const response = await processVoiceCommand(command);
      
      // Play Audio Response
      if (response.audioData) {
         playAudioResponse(response.audioData);
      }
      
      setIsProcessing(false);
      
      // Restart wake word listener
      if (recognitionRef.current) {
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch {}
        }, 1000); // Small delay to avoid hearing self
      }
    };

    commandRecognition.onerror = () => {
      setIsListening(false);
      setIsProcessing(false);
      if (recognitionRef.current) try { recognitionRef.current.start(); } catch {}
    };

    commandRecognition.start();
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioCtx = audioContextRef.current;
      
      // Base64 to ArrayBuffer
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  // --- STANDARD EFFECTS ---

  // Handle Resize Logic
  useEffect(() => {
    const checkBreakpoint = () => setIsMd(window.innerWidth >= 768);
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!resizingRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      if (isMd) {
        const newWidth = window.innerWidth - clientX;
        setSidebarSize(Math.max(250, Math.min(600, newWidth)));
      } else {
        const newHeight = window.innerHeight - clientY;
        setSidebarSize(Math.max(200, Math.min(window.innerHeight * 0.8, newHeight)));
      }
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('resize', checkBreakpoint);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isMd]);

  const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); 
    resizingRef.current = true;
    document.body.style.cursor = isMd ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const hour = now.getHours();
      let timeGreeting = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
      
      if (lastDetectedPerson === 'andre') setGreeting(`${timeGreeting}, André!`);
      else if (lastDetectedPerson === 'female') setGreeting(`${timeGreeting}, senhora!`);
      else setGreeting(timeGreeting);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lastDetectedPerson]);

  // Weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&timezone=America/Sao_Paulo`
        );
        if (!response.ok) throw new Error('Network failure');
        const data = await response.json();
        if (data && data.current_weather) {
          setWeather(data.current_weather);
        }
      } catch (error) {
        console.warn("Weather fetch failed, using fallback.");
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); 
    return () => clearInterval(interval);
  }, []);

  // --- HELPERS ---

  const getBackgroundStyle = () => {
    // High Quality 4k/HD Unsplash Images mapping
    const imageUrls = {
      // Clear
      dayClear: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=2560&auto=format&fit=crop', // Bright Blue Sky
      nightClear: 'https://images.unsplash.com/photo-1506318137071-a8bcbf67cc77?q=80&w=2560&auto=format&fit=crop', // Starry Night
      
      // Clouds
      dayCloudy: 'https://images.unsplash.com/photo-1595867865334-7290000e395a?q=80&w=2560&auto=format&fit=crop', // Fluffy White Clouds
      nightCloudy: 'https://images.unsplash.com/photo-1536746803623-cef8708094dd?q=80&w=2560&auto=format&fit=crop', // Dark Clouds/Moon
      
      // Fog
      dayFog: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=2560&auto=format&fit=crop', // Misty Forest
      nightFog: 'https://images.unsplash.com/photo-1517544845501-bb782da759d3?q=80&w=2560&auto=format&fit=crop', // Spooky Night Fog
      
      // Rain
      dayRain: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2560&auto=format&fit=crop', // Rain drops on glass (Day)
      nightRain: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=2560&auto=format&fit=crop', // Rain on window with city lights
      
      // Storm
      storm: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=2560&auto=format&fit=crop', // Lightning
      
      // Snow (Just in case)
      daySnow: 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?q=80&w=2560&auto=format&fit=crop',
      nightSnow: 'https://images.unsplash.com/photo-1483104879057-3331608b60c8?q=80&w=2560&auto=format&fit=crop'
    };

    let bgImage = imageUrls.dayClear;
    const isNight = weather.is_day === 0;
    const code = weather.weathercode;

    // WMO Weather Code Interpretation
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog and depositing rime fog
    // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
    // 56, 57: Freezing Drizzle: Light and dense intensity
    // 61, 63, 65: Rain: Slight, moderate and heavy intensity
    // 66, 67: Freezing Rain: Light and heavy intensity
    // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
    // 77: Snow grains
    // 80, 81, 82: Rain showers: Slight, moderate, and violent
    // 85, 86: Snow showers slight and heavy
    // 95: Thunderstorm: Slight or moderate
    // 96, 99: Thunderstorm with slight and heavy hail

    if (code === 0 || code === 1) {
      // Clear
      bgImage = isNight ? imageUrls.nightClear : imageUrls.dayClear;
    } else if (code === 2 || code === 3) {
      // Cloudy
      bgImage = isNight ? imageUrls.nightCloudy : imageUrls.dayCloudy;
    } else if (code === 45 || code === 48) {
      // Fog
      bgImage = isNight ? imageUrls.nightFog : imageUrls.dayFog;
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      // Rain / Drizzle
      bgImage = isNight ? imageUrls.nightRain : imageUrls.dayRain;
    } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      // Snow
      bgImage = isNight ? imageUrls.nightSnow : imageUrls.daySnow;
    } else if (code >= 95) {
      // Storm
      bgImage = imageUrls.storm;
    } else {
      // Fallback
      bgImage = isNight ? imageUrls.nightClear : imageUrls.dayClear;
    }

    return { 
      backgroundImage: `url("${bgImage}")`, 
      backgroundSize: 'cover', 
      backgroundPosition: 'center',
      transition: 'background-image 1.5s ease-in-out' // Smooth fade
    };
  };

  const getDateInfo = (offset = 0) => {
    const d = new Date(currentTime);
    d.setDate(d.getDate() + offset);
    return {
      day: d.getDate(),
      weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d),
      month: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d),
    };
  };

  // Static (Cyclical) Reminders Generation
  const getStaticReminders = (): Reminder[] => {
    const day = currentTime.getDay(); // 0 = Sunday, 1 = Monday...
    const hour = currentTime.getHours();
    const staticList: Reminder[] = [];

    // Monday (1)
    if (day === 1 && hour >= 19) {
      staticList.push({ type: 'alert', text: 'Marmitas: André não tem aula amanhã.', time: '19:00' });
    }
    
    // Tuesday (2)
    if (day === 2) {
      staticList.push({ type: 'info', text: 'André não vai à escola.', time: 'Dia todo' });
      staticList.push({ type: 'action', text: 'Vôlei: Sair com Iago.', time: '16:40' });
    }
    
    // Thursday (4)
    if (day === 4) {
      staticList.push({ type: 'action', text: 'Vôlei: Sair de bicicleta.', time: '16:30' });
    }

    return staticList;
  };

  const today = getDateInfo(0);
  const yesterday = getDateInfo(-1);
  const tomorrow = getDateInfo(1);

  // Combine Static and Firebase Reminders
  const allReminders = [...getStaticReminders(), ...firebaseReminders];

  return (
    <main 
      className="w-full h-screen relative overflow-hidden flex flex-col md:flex-row transition-all duration-100 ease-in-out"
      style={getBackgroundStyle()}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0 pointer-events-none" />

      {/* Main Content Area */}
      <section className="relative z-10 flex-1 flex flex-col justify-between p-6 md:p-12 h-full overflow-hidden">
        
        {/* Top Header: Clock & Weather */}
        <div className="flex justify-between items-start">
          <ClockWidget 
            currentTime={currentTime} 
            greeting={greeting} 
            isListening={isListening || isProcessing} 
            onInteraction={() => activateAssistant()} 
          />
          <WeatherWidget weather={weather} />
        </div>

        {/* Center: Big Date */}
        <div className="flex flex-col items-center justify-center transform hover:scale-105 transition-all duration-700 select-none">
           <span className="text-xl md:text-3xl uppercase tracking-[0.4em] font-medium text-yellow-300 mb-2 drop-shadow-lg">Hoje</span>
           <span className="text-[10rem] md:text-[16rem] leading-none font-bold tracking-tight text-white drop-shadow-2xl mix-blend-overlay opacity-90">
             {today.day}
           </span>
           <div className="flex flex-col items-center -mt-4 md:-mt-8">
              <span className="text-4xl md:text-6xl font-light capitalize text-white drop-shadow-md tracking-wide">{today.weekday}</span>
              <span className="text-xl md:text-2xl font-normal text-white/70 uppercase tracking-[0.2em] mt-2">{today.month}</span>
           </div>
        </div>

        {/* Bottom: Date Navigation */}
        <div className="flex justify-between w-full max-w-4xl mx-auto mt-4 md:mt-0">
           <div className="flex items-center gap-4 group cursor-pointer opacity-60 hover:opacity-100 transition-all">
             <div className="p-3 bg-white/5 rounded-full border border-white/10 group-hover:bg-white/10">
               <ArrowLeft size={24} className="text-white" />
             </div>
             <div className="text-left hidden md:block">
               <div className="text-xs uppercase tracking-widest text-white/50">Ontem</div>
               <div className="text-2xl font-bold text-white">{yesterday.day} <span className="text-base font-normal opacity-70 capitalize">{yesterday.weekday.split('-')[0]}</span></div>
             </div>
           </div>
           
           <div className="flex items-center gap-4 group cursor-pointer opacity-60 hover:opacity-100 transition-all">
             <div className="text-right hidden md:block">
               <div className="text-xs uppercase tracking-widest text-white/50">Amanhã</div>
               <div className="text-2xl font-bold text-white">{tomorrow.day} <span className="text-base font-normal opacity-70 capitalize">{tomorrow.weekday.split('-')[0]}</span></div>
             </div>
             <div className="p-3 bg-white/5 rounded-full border border-white/10 group-hover:bg-white/10">
                <ArrowRight size={24} className="text-white" />
             </div>
           </div>
        </div>

        {/* Voice Indicator (When Active) */}
        {(isListening || isProcessing) && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 animate-fade-in">
             <div className={`p-3 rounded-full ${isProcessing ? 'bg-purple-500 animate-pulse' : 'bg-red-500 animate-bounce'}`}>
               <Mic size={24} className="text-white" />
             </div>
             <span className="text-xl font-bold uppercase tracking-widest text-white">
               {isProcessing ? 'Processando...' : 'Ouvindo...'}
             </span>
          </div>
        )}

        {/* Floating Chef Action Button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 md:z-50">
          <button 
            onClick={() => setIsChefOpen(true)} 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 text-white p-4 rounded-full shadow-[0_0_40px_rgba(251,191,36,0.4)] flex items-center gap-2 transition-all hover:scale-110 active:scale-95 group animate-bounce"
            style={{ animationDuration: '3s' }}
          >
            <Sparkles className="animate-pulse" />
            <span className="font-bold text-xl hidden md:block w-0 overflow-hidden group-hover:w-auto group-hover:ml-2 transition-all duration-300 whitespace-nowrap tracking-wide">
              CHEF IA
            </span>
          </button>
        </div>
      </section>

      {/* Resize Handle */}
      <div 
        className="relative z-50 flex items-center justify-center transition-colors hover:bg-white/10 active:bg-yellow-400/20 md:w-4 md:h-full w-full h-5 cursor-row-resize md:cursor-col-resize group"
        onMouseDown={startResizing}
        onTouchStart={startResizing}
      >
         <div className="bg-white/30 rounded-full md:w-1 md:h-16 w-16 h-1 group-hover:bg-yellow-400/80 transition-colors shadow-lg" />
      </div>

      {/* Sidebar: News & Reminders */}
      <section 
        className="relative z-20 flex-none bg-black/40 backdrop-blur-2xl md:border-l border-t md:border-t-0 border-white/10 shadow-2xl"
        style={{
          width: isMd ? `${sidebarSize}px` : '100%',
          height: isMd ? '100%' : `${sidebarSize}px`
        }}
      >
        <NewsSidebar reminders={allReminders} />
      </section>

      {/* Chef Modal */}
      <ChefModal isOpen={isChefOpen} onClose={() => setIsChefOpen(false)} />
    </main>
  );
};

export default App;