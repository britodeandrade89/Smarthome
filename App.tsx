import React, { useState, useEffect, useRef } from 'react';
import { 
  CloudRain, Sun, Cloud, ArrowRight, ArrowLeft, Bell, Sparkles, ChefHat, X, Send, Newspaper, Moon, Plus, Clock, MapPin, 
  MoveDiagonal, GripVertical, GripHorizontal, ZoomIn, ZoomOut, Settings, Mic, User, Calendar, Download, Lock, Unlock,
  Thermometer, Droplets
} from 'lucide-react';

// --- IMPORTAÇÕES FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDrwC791rplIiqOeXKZTlCaacM8YhKkQdw",
  authDomain: "lista-de-compras-4420b.firebaseapp.com",
  projectId: "lista-de-compras-4420b",
  storageBucket: "lista-de-compras-4420b.firebasestorage.app",
  messagingSenderId: "457388372289",
  appId: "1:457388372289:web:f210e74b357e03ca5b71c0",
  measurementId: "G-DRMYGDKDDE"
};

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

// --- UTILITÁRIO DE FALA (TTS) ---
const speak = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; 
    window.speechSynthesis.speak(utterance);
  }
};

// --- COMPONENTE AUXILIAR: WIDGET REDIMENSIONÁVEL ---
interface ResizableWidgetProps {
  children: React.ReactNode;
  scale: number;
  onScaleChange: (scale: number) => void;
  origin?: string;
  className?: string;
}

const ResizableWidget = ({ children, scale, onScaleChange, origin = "top left", className = "" }: ResizableWidgetProps) => {
  const [isSelected, setIsSelected] = useState(false);
  const widgetRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScale = useRef(1);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setIsSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleMouseDown = (e) => {
    e.stopPropagation(); 
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY || e.touches[0].clientY;
    startScale.current = scale;
    
    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current) return;
      const currentY = moveEvent.clientY || moveEvent.touches[0].clientY;
      const deltaY = currentY - startY.current;
      const newScale = Math.max(0.5, Math.min(2.0, startScale.current + (deltaY * 0.005)));
      onScaleChange(newScale);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);
  };

  return (
    <div 
      ref={widgetRef}
      className={`relative group transition-all duration-200 ${isSelected ? 'z-50' : 'z-auto'} ${className}`}
      onClick={(e) => { e.stopPropagation(); setIsSelected(true); }}
      style={{ transformOrigin: origin }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: origin }} className="transition-transform duration-75 ease-out">
        {children}
      </div>
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-yellow-400/50 rounded-xl">
          <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-yellow-400 rounded-full shadow-lg flex items-center justify-center cursor-nwse-resize pointer-events-auto hover:scale-110 transition-transform active:bg-yellow-300" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>
            <MoveDiagonal size={16} className="text-black" />
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  // --- ESTADOS ---
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const getInitialWeather = () => {
    const h = new Date().getHours();
    const isNight = h >= 18 || h < 6;
    return { temperature: '--', weathercode: 0, is_day: isNight ? 0 : 1, apparent_temperature: '--', precipitation_probability: 0 };
  };
  const [weather, setWeather] = useState(getInitialWeather());
  const [coords, setCoords] = useState({ lat: -22.9194, lon: -42.8186 });
  const [locationName, setLocationName] = useState('Maricá, RJ');
  const [gpsActive, setGpsActive] = useState(false);
  
  // Voice & Interaction
  const [isListening, setIsListening] = useState(false); 
  const [isCommandMode, setIsCommandMode] = useState(false); 
  const [isActiveProcessing, setIsActiveProcessing] = useState(false); 
  const [greeting, setGreeting] = useState('');
  const [lastDetectedPerson, setLastDetectedPerson] = useState(null); 
  const [wakeLockActive, setWakeLockActive] = useState(false);
  
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [trainingStep, setTrainingStep] = useState(0); 
  
  // Gemini Chef
  const [isChefOpen, setIsChefOpen] = useState(false);
  const [chefInput, setChefInput] = useState('');
  const [chefResponse, setChefResponse] = useState('');
  const [isChefLoading, setIsChefLoading] = useState(false);

  // Lembretes
  const [reminders, setReminders] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderText, setNewReminderText] = useState('');

  // Notícias
  const [newsIndexP, setNewsIndexP] = useState(0); 
  const [newsIndexE, setNewsIndexE] = useState(0); 
  const [newsIndexC, setNewsIndexC] = useState(0); 
  const [newsData, setNewsData] = useState({ politica: [], esportes: [], cultura: [] });

  // Layout - Escalas
  const [scaleTL, setScaleTL] = useState(1); 
  const [scaleTR, setScaleTR] = useState(1); 
  const [scaleCenter, setScaleCenter] = useState(1);
  const [scaleBL, setScaleBL] = useState(1); 
  const [scaleBR, setScaleBR] = useState(1); 
  
  const [sidebarWidth, setSidebarWidth] = useState(300); 
  const [sidebarSplit, setSidebarSplit] = useState(0.5); 
  const [mainScale, setMainScale] = useState(1); 
  
  const sidebarRef = useRef(null);
  const appRef = useRef(null);
  const isResizingWidth = useRef(false);
  const isResizingHeight = useRef(false);
  
  const wakeWordRecognitionRef = useRef(null);
  const commandRecognitionRef = useRef(null);

  const apiKey = "gen-lang-client-0108694645"; 

  // --- LÓGICA DE RESIZE (HANDLERS) ---
  const handleMove = (e) => {
    if (!isResizingWidth.current && !isResizingHeight.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (isResizingWidth.current && appRef.current) {
      const appRect = appRef.current.getBoundingClientRect();
      const newWidth = appRect.right - clientX;
      setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
    }

    if (isResizingHeight.current && sidebarRef.current) {
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const relativeY = clientY - sidebarRect.top;
      const newSplit = relativeY / sidebarRect.height;
      setSidebarSplit(Math.max(0.2, Math.min(0.8, newSplit)));
    }
  };

  const stopResize = () => {
    isResizingWidth.current = false;
    isResizingHeight.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const startWidthResize = (e) => { 
    e.preventDefault(); 
    isResizingWidth.current = true; 
    document.body.style.cursor = 'col-resize'; 
    document.body.style.userSelect = 'none'; 
  };

  const startHeightResize = (e) => { 
    e.preventDefault(); 
    isResizingHeight.current = true; 
    document.body.style.cursor = 'row-resize'; 
    document.body.style.userSelect = 'none'; 
  };

  const handleZoom = (direction) => { 
    setMainScale(prev => { 
      const newVal = direction === 'in' ? prev + 0.1 : prev - 0.1; 
      return Math.max(0.5, Math.min(1.5, newVal)); 
    }); 
  };

  // --- LÓGICA DE INTELIGÊNCIA ARTIFICIAL (GEMINI) ---
  const processVoiceCommand = async (commandText) => {
    setIsActiveProcessing(true);
    const systemPrompt = `Você é o assistente "Smart Home". Analise: "${commandText}". Se for lembrete: {"action": "add_reminder", "text": "...", "type": "info"}. Se for conversa: {"action": "chat", "response": "..."}. Retorne JSON.`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
      });
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.action === 'add_reminder') { await addReminderToDB(result.text, result.type || 'info'); speak(`Adicionei ${result.text} aos lembretes.`); } 
        else if (result.action === 'chat') { speak(result.response); }
      } else { speak("Desculpe, não entendi."); }
    } catch (e) { console.error("Erro IA:", e); speak("Erro ao processar."); } 
    finally { setIsActiveProcessing(false); startWakeWordListening(); }
  };

  const startWakeWordListening = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    if (commandRecognitionRef.current) commandRecognitionRef.current.stop();
    if (wakeWordRecognitionRef.current) wakeWordRecognitionRef.current.stop();
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'pt-BR';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ').toLowerCase();
      if (transcript.slice(-30).includes("smart home") || transcript.slice(-30).includes("ok smart")) {
        console.log("Wake Word!"); recognition.stop(); startCommandListening();
      }
    };
    recognition.onend = () => { if (!isCommandMode && !isTrainingOpen) try { recognition.start(); } catch (e) {} };
    wakeWordRecognitionRef.current = recognition;
    try { recognition.start(); setIsListening(true); } catch (e) {}
  };

  const startCommandListening = () => {
    setIsListening(false); setIsCommandMode(true); speak("Estou ouvindo.");
    setTimeout(() => {
      const cmd = new (window as any).webkitSpeechRecognition();
      cmd.continuous = false; cmd.interimResults = false; cmd.lang = 'pt-BR';
      cmd.onresult = (e) => processVoiceCommand(e.results[0][0].transcript);
      cmd.onerror = () => { speak("Não ouvi."); setIsCommandMode(false); startWakeWordListening(); };
      cmd.onend = () => setIsCommandMode(false);
      commandRecognitionRef.current = cmd; cmd.start();
    }, 1000);
  };

  useEffect(() => { startWakeWordListening(); return () => { if (wakeWordRecognitionRef.current) wakeWordRecognitionRef.current.stop(); if (commandRecognitionRef.current) commandRecognitionRef.current.stop(); }; }, []);

  const addReminderToDB = async (text, type = 'info') => {
    if (!db) return;
    try { await addDoc(collection(db, "smart_home_reminders"), { text, type, createdAt: serverTimestamp(), time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }); } catch (error) { console.error("Erro BD:", error); }
  };

  const getCyclicalReminders = () => {
    const day = currentTime.getDay(); 
    const hour = currentTime.getHours();
    const cycleList = [];

    if (day === 1 && hour >= 19) cycleList.push({ id: 'cyc-seg-1', text: "Marmitas: André não tem aula amanhã.", type: 'alert', time: "19:00" });
    if (day === 2) {
      cycleList.push({ id: 'cyc-ter-1', text: "Terapia da Marcelly", type: 'action', time: "Dia" });
      cycleList.push({ id: 'cyc-ter-2', text: "Terapia do André", type: 'action', time: "Dia" });
      cycleList.push({ id: 'cyc-ter-3', text: "Terapia da Família (Marcelly)", type: 'info', time: "Dia" });
      cycleList.push({ id: 'cyc-ter-4', text: "André: Cozinhar (Marcelly na terapia)", type: 'alert', time: "Noite" });
    }
    if (day === 3) {
      cycleList.push({ id: 'cyc-qua-1', text: "Organizar tarefas da semana", type: 'info', time: "09:00" });
      cycleList.push({ id: 'cyc-qua-2', text: "Regar as plantas", type: 'action', time: "17:00" });
    }
    if (day === 4) cycleList.push({ id: 'cyc-qui-1', text: "Vôlei do André (Bicicleta)", type: 'action', time: "16:30" });
    if (day === 5) cycleList.push({ id: 'cyc-sex-1', text: "Revisão da semana", type: 'info', time: "18:00" });

    return cycleList;
  };
  const allReminders = [...getCyclicalReminders(), ...reminders];

  const rawNewsDatabase = {
    politica: [
      { text: "Lula liga para Trump e defende cooperação bilateral.", img: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=150&h=150&fit=crop" },
      { text: "Câmara vota projeto de devedor contumaz na próxima semana.", img: "https://images.unsplash.com/photo-1575320181282-9afab399332c?w=150&h=150&fit=crop" },
      { text: "Senado aprova novo marco fiscal com ampla maioria.", img: "https://images.unsplash.com/photo-1541872703-74c5963631df?w=150&h=150&fit=crop" }
    ],
    esportes: [
      { text: "Flamengo rompe barreira dos R$ 2 bilhões.", img: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=150&h=150&fit=crop" },
      { text: "Brasil vence amistoso preparatório com goleada.", img: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150&h=150&fit=crop" }
    ],
    cultura: [
      { text: "Novo filme brasileiro aclamado internacionalmente.", img: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=150&h=150&fit=crop" },
      { text: "Rock in Rio anuncia line-up para 2026.", img: "https://images.unsplash.com/photo-1459749411177-d4a414c9ff5f?w=150&h=150&fit=crop" }
    ]
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
          setGpsActive(true);
          setLocationName("Localização Exata");
        },
        () => setGpsActive(false)
      );
    }
    const getRandomTime = () => ["Agora", "Há 5 min", "Há 12 min", "Há 30 min", "Há 1h"].sort(() => Math.random() - 0.5)[0];
    const processNews = (array) => [...array].sort(() => Math.random() - 0.5).map(item => ({ ...item, time: getRandomTime() }));
    setNewsData({ politica: processNews(rawNewsDatabase.politica), esportes: processNews(rawNewsDatabase.esportes), cultura: processNews(rawNewsDatabase.cultura) });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const h = now.getHours();
      const g = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
      if (lastDetectedPerson === 'André') setGreeting(`${g}, André!`);
      else if (lastDetectedPerson === 'Marcelly') setGreeting(`${g}, Marcelly!`);
      else setGreeting(g);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastDetectedPerson]);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
        } catch (err) {
          setWakeLockActive(false);
        }
      }
    };
    requestWakeLock();
    const handleInteraction = () => requestWakeLock();
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWakeLock(); });
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "smart_home_reminders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), time: doc.data().time || '--:--', type: doc.data().type || 'info' })));
    });
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,is_day,weather_code&hourly=precipitation_probability&timezone=America/Sao_Paulo`);
        const data = await res.json();
        if (data?.current) {
          const currentHour = new Date().getHours();
          const precipProb = data.hourly?.precipitation_probability ? data.hourly.precipitation_probability[currentHour] : 0;
          setWeather({
            temperature: data.current.temperature_2m,
            apparent_temperature: data.current.apparent_temperature,
            weathercode: data.current.weather_code,
            is_day: data.current.is_day,
            precipitation_probability: precipProb
          });
        }
      } catch (e) { }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); 
    return () => clearInterval(interval);
  }, [coords]);

  useEffect(() => {
    if (!newsData.politica.length) return;
    const intervalP = setInterval(() => setNewsIndexP(p => (p + 1) % newsData.politica.length), 15000);
    const tE = setTimeout(() => {
        const iE = setInterval(() => setNewsIndexE(p => (p + 1) % newsData.esportes.length), 15000);
        return () => clearInterval(iE);
    }, 5000);
    const tC = setTimeout(() => {
        const iC = setInterval(() => setNewsIndexC(p => (p + 1) % newsData.cultura.length), 15000);
        return () => clearInterval(iC);
    }, 10000);
    return () => { clearInterval(intervalP); clearTimeout(tE); clearTimeout(tC); };
  }, [newsData]); 

  const handleAddReminderManual = async (e) => {
    e.preventDefault();
    if (!newReminderText.trim() || !db) return;
    await addDoc(collection(db, "smart_home_reminders"), { text: newReminderText, type: 'info', createdAt: serverTimestamp(), time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
    setNewReminderText(''); setShowAddReminder(false);
  };

  const handleAskChef = async (e) => {
    e.preventDefault();
    if (!chefInput.trim()) return;
    setIsChefLoading(true); setChefResponse('');
    const context = `Você é o SMART HOME, um assistente doméstico para a família (André e Marcelly). Seja útil, educado e conciso.`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${context} Pergunta do usuário sobre culinária: ${chefInput}` }] }] })
      });
      const data = await res.json();
      setChefResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem ideias.");
    } catch (e) { setChefResponse("Erro ao conectar."); } 
    finally { setIsChefLoading(false); }
  };

  const getBackgroundStyle = () => {
    const imgs = {
      clearDay: 'https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?q=80&w=1920&auto=format&fit=crop',
      clearNight: 'https://images.unsplash.com/photo-1472552944129-b035e9ea43cc?q=80&w=1920&auto=format&fit=crop',
      cloudyDay: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1920&auto=format&fit=crop',
      cloudyNight: 'https://images.unsplash.com/photo-1536746803623-cef8708094dd?q=80&w=1920&auto=format&fit=crop',
      rainDay: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1920&auto=format&fit=crop',
      rainNight: 'https://images.unsplash.com/photo-1508624217470-5ef0f947d8be?q=80&w=1920&auto=format&fit=crop',
      storm: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1920&auto=format&fit=crop'
    };
    let bg = imgs.clearDay;
    if (weather) {
      const isN = weather.is_day === 0;
      if (isN) bg = (weather.weathercode >= 51) ? imgs.rainNight : imgs.clearNight;
      else bg = (weather.weathercode >= 51) ? imgs.rainDay : imgs.clearDay;
    }
    return { backgroundImage: `url("${bg}")`, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'background-image 1.5s ease-in-out' };
  };

  const getDateInfo = (d) => ({
    day: d.getDate(),
    weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d),
  });

  const toggleUserSimulation = () => {
    setIsListening(true);
    setTimeout(() => { setIsListening(false); setLastDetectedPerson(p => (p === null ? 'andre' : p === 'andre' ? 'female' : null)); }, 500);
  };

  const today = getDateInfo(currentTime);
  const yesterday = getDateInfo(new Date(new Date().setDate(currentTime.getDate() - 1)));
  const tomorrow = getDateInfo(new Date(new Date().setDate(currentTime.getDate() + 1)));

  const WeatherIcon = () => {
    if (!weather) return <Sun />;
    const { is_day, weathercode } = weather;
    if (weathercode >= 95) return <CloudRain className="text-gray-300" />;
    if (weathercode >= 51) return <CloudRain className="text-blue-300" />;
    if (weathercode >= 2) return <Cloud className="text-gray-300" />;
    return is_day === 1 ? <Sun className="text-yellow-300" /> : <Moon className="text-yellow-100" />;
  };

  const handleVoiceTraining = () => {
    if (trainingStep === 0) return; 
    setTrainingStep(2); 
    setTimeout(() => {
      setTrainingStep(3); 
      setLastDetectedPerson(trainingStep === 1.1 ? 'André' : 'Marcelly');
      setTimeout(() => { setIsTrainingOpen(false); setTrainingStep(0); }, 2000);
    }, 3000);
  };

  const NewsWidget = ({ category, color, data, index }) => (
    <div className="flex gap-3 items-center animate-fade-in transition-all duration-700 h-[70px] group">
      <div className={`w-1 h-full rounded-full ${color} opacity-80 flex-shrink-0`} />
      <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-sm relative bg-white/10">
        <img 
          src={data[index]?.img || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&h=150&fit=crop"} 
          alt="" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
          onError={(e) => e.target.style.display = 'none'}
        />
        <div className="absolute inset-0 flex items-center justify-center -z-10"><Newspaper size={16} className="text-white/30" /></div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-0.5">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${color.replace('bg-', 'text-')}`}>{category}</span>
          <span className="text-[9px] text-white/40 flex items-center gap-1"><Clock size={8} /> {data[index]?.time || 'Agora'}</span>
        </div>
        <p className="text-xs font-light leading-snug text-gray-200 line-clamp-2">{data[index]?.text || "Carregando..."}</p>
      </div>
    </div>
  );

  return (
    <div 
      ref={appRef} 
      style={getBackgroundStyle()} 
      className="w-full h-screen relative overflow-hidden bg-black text-white selection:bg-none cursor-default flex transition-all duration-1000 ease-in-out font-sans"
      onMouseMove={handleMove} onMouseUp={stopResize} onTouchMove={handleMove} onTouchEnd={stopResize}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&display=swap');
        body, .font-sans { font-family: 'Oswald', sans-serif !important; letter-spacing: 0.02em; }
        .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        
        /* ANIMAÇÃO ESCADA ROLANTE (MARQUEE VERTICAL) */
        @keyframes scroll-vertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-vertical-scroll {
          animation: scroll-vertical 40s linear infinite; /* Velocidade ajustável */
        }
        /* Pausa ao passar o rato (para ler com calma) */
        .pause-on-hover:hover .animate-vertical-scroll {
          animation-play-state: paused;
        }

        input, button { font-family: 'Oswald', sans-serif; }
      `}</style>

      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />

      {/* Voice Status */}
      {isCommandMode && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 animate-fade-in"><div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]"><div className="w-3 h-3 bg-green-500 rounded-full animate-ping" /><span className="text-lg font-bold uppercase tracking-widest text-green-400">Estou ouvindo...</span></div></div>}
      {isActiveProcessing && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pulse"><Sparkles className="w-5 h-5 text-blue-400 animate-spin" /><span className="text-lg font-bold uppercase tracking-widest text-blue-400">Processando...</span></div>}

      {/* Settings & Wake Lock */}
      <div className="absolute bottom-6 left-6 z-50 flex items-center gap-2">
        <button onClick={() => setIsTrainingOpen(true)} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-transform hover:rotate-90"><Settings size={20} /></button>
        <div className="p-3 bg-white/5 rounded-full border border-white/5 text-white/50" title={wakeLockActive ? "Ecrã sempre ligado" : "Toque para manter ligado"}>{wakeLockActive ? <Lock size={16} className="text-green-400" /> : <Unlock size={16} className="text-yellow-400 animate-pulse" />}</div>
      </div>

      {/* Modais */}
      {isTrainingOpen && <div className="absolute inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in"><div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative text-center"><button onClick={() => { setIsTrainingOpen(false); setTrainingStep(0); }} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20} /></button><div className="flex justify-center mb-6"><div className="p-4 bg-blue-500/20 rounded-full text-blue-400"><Mic size={40} /></div></div>{trainingStep === 0 && <><h2 className="text-2xl font-bold mb-2">Quem está a falar?</h2><div className="flex gap-4 justify-center mt-6"><button onClick={() => setTrainingStep(1.1)} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 w-32"><User size={32} className="text-blue-400" /> <span>André</span></button><button onClick={() => setTrainingStep(1.2)} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 w-32"><User size={32} className="text-pink-400" /> <span>Marcelly</span></button></div></>}{(trainingStep === 1.1 || trainingStep === 1.2) && <><h2 className="text-2xl font-bold mb-2">Diga: "Olá, Smart Home"</h2><button onClick={handleVoiceTraining} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full animate-pulse mt-6">Gravar</button></>}{trainingStep === 2 && <h2 className="text-2xl font-bold mb-2 text-green-400">A processar...</h2>}{trainingStep === 3 && <h2 className="text-2xl font-bold mb-2 text-green-400">Sucesso!</h2>}</div></div>}
      {isChefOpen && <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in"><div className="bg-white/10 border border-white/20 rounded-3xl p-8 w-full max-w-2xl shadow-2xl flex flex-col h-[80%] relative"><button onClick={() => setIsChefOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={24} /></button><div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl"><ChefHat size={32} className="text-white" /></div><div><h2 className="text-2xl font-bold">Chef Smart Home</h2><p className="text-white/60 font-light">O que vamos cozinhar?</p></div></div><div className="flex-1 bg-black/20 rounded-xl p-6 mb-4 overflow-y-auto border border-white/5 hide-scrollbar">{isChefLoading ? <div className="flex flex-col items-center justify-center h-full text-white/50"><Sparkles className="animate-spin text-yellow-400" size={40} /><p>A pensar...</p></div> : chefResponse ? <div className="prose prose-invert max-w-none"><p className="text-lg font-light leading-relaxed">{chefResponse}</p></div> : <div className="flex flex-col items-center justify-center h-full text-white/30 text-center"><ChefHat size={48} className="mb-4 opacity-50" /><p>Diga os ingredientes!</p></div>}</div><form onSubmit={handleAskChef} className="flex gap-2"><input type="text" value={chefInput} onChange={(e) => setChefInput(e.target.value)} placeholder="Ex: Ovos e queijo..." className="flex-1 bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white text-lg font-light" /><button type="submit" disabled={!chefInput.trim() || isChefLoading} className="bg-yellow-500 text-black font-bold p-4 rounded-xl"><Send size={24} /></button></form></div></div>}

      {/* MAIN AREA */}
      <section className="relative z-10 flex-1 flex flex-col justify-between p-8 md:p-12 h-full overflow-hidden">
        <div className="flex justify-between items-start">
          <ResizableWidget scale={scaleTL} onScaleChange={setScaleTL} origin="top left" className="flex flex-col items-start cursor-pointer active:scale-95 transition-transform">
            <div className="text-3xl font-light tracking-wide opacity-90 drop-shadow-md flex items-center gap-2">
               {greeting}
            </div>
            <div className="text-[7rem] md:text-[9rem] font-medium tracking-tighter opacity-90 leading-none">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm opacity-60 uppercase tracking-widest mt-1 ml-2 font-medium">Brasília</div>
          </ResizableWidget>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {installPrompt && <button onClick={() => { if(installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(c => c.outcome === 'accepted' && setInstallPrompt(null)); } }} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-transform active:scale-95 flex items-center gap-2"><Download size={20} /><span className="text-xs font-bold uppercase hidden md:block">App</span></button>}
              <button onClick={() => setIsChefOpen(true)} className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 text-white p-3 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 group"><Sparkles size={20} className="group-hover:animate-spin" /><span className="text-xs font-bold uppercase hidden group-hover:block">Chef</span></button>
            </div>
            
            {/* WIDGET TEMPO */}
            <ResizableWidget scale={scaleTR} onScaleChange={setScaleTR} origin="top right" className="flex items-center gap-3 mt-2">
              <div className="flex flex-col items-end drop-shadow-lg text-white">
                <span className="text-6xl font-medium tracking-tight leading-none">{weather && weather.temperature !== '--' ? `${Math.round(weather.temperature)}°` : '--'}</span>
                <span className="text-xs uppercase tracking-widest opacity-90 mt-1 font-medium flex items-center gap-1">{gpsActive && <MapPin size={10} className="text-green-400" />} {locationName}</span>
                <div className="flex gap-3 mt-2 text-sm font-light opacity-80"><span className="flex items-center gap-1" title="Sensação Térmica"><Thermometer size={14} /> {weather.apparent_temperature !== '--' ? `${Math.round(weather.apparent_temperature)}°` : '--'}</span><span className="flex items-center gap-1" title="Chuva"><Droplets size={14} className={weather.precipitation_probability > 0 ? "text-blue-300" : ""} /> {weather.precipitation_probability}%</span></div>
              </div>
              <div className="text-6xl drop-shadow-xl"><WeatherIcon /></div>
            </ResizableWidget>
          </div>
        </div>

        {/* DATA CENTRAL */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
           <ResizableWidget scale={scaleCenter} onScaleChange={setScaleCenter} origin="center" className="flex flex-col items-center">
             <span className="text-2xl uppercase tracking-[0.4em] font-bold text-yellow-300 mb-2">Hoje</span>
             <span className="text-[12rem] md:text-[16rem] leading-none font-bold tracking-tighter text-white drop-shadow-2xl">{today.day}</span>
             <div className="flex flex-col items-center mt-4">
                <span className="text-4xl font-light capitalize">{today.weekday}</span>
                <span className="text-xl font-medium text-white/60 uppercase tracking-widest">{today.month}</span>
             </div>
           </ResizableWidget>
        </div>

        {/* FOOTER NAVEGAÇÃO */}
        <div className="flex justify-between w-full max-w-4xl mx-auto">
           {/* Ontem */}
           <ResizableWidget scale={scaleBL} onScaleChange={setScaleBL} origin="bottom left" className="flex items-center gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
             <ArrowLeft size={24} className="text-white/50" />
             <div className="text-left"><div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Ontem</div><div className="text-2xl font-medium">{yesterday.day} <span className="text-sm font-light opacity-70 capitalize">{yesterday.weekday.split('-')[0]}</span></div></div>
           </ResizableWidget>
           {/* Amanhã */}
           <ResizableWidget scale={scaleBR} onScaleChange={setScaleBR} origin="bottom right" className="flex items-center gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
             <div className="text-right"><div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Amanhã</div><div className="text-2xl font-medium">{tomorrow.day} <span className="text-sm font-light opacity-70 capitalize">{tomorrow.weekday.split('-')[0]}</span></div></div>
             <ArrowRight size={24} className="text-white/50" />
           </ResizableWidget>
        </div>
      </section>

      <div className="relative z-50 flex items-center justify-center transition-colors hover:bg-white/10 active:bg-yellow-400/20 w-5 cursor-col-resize group h-full flex-shrink-0" onMouseDown={startWidthResize} onTouchStart={startWidthResize}>
        <div className="bg-white/30 rounded-full w-1 h-16 group-hover:bg-yellow-400/80 transition-colors shadow-lg flex items-center justify-center"><GripVertical size={12} className="text-black opacity-0 group-hover:opacity-100" /></div>
      </div>

      <aside ref={sidebarRef} className="relative z-20 h-full bg-black/40 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl flex-shrink-0" style={{ width: `${sidebarWidth}px` }}>
        {/* Lembretes (Escada Rolante) */}
        <div className="flex flex-col border-b border-white/10 overflow-hidden min-h-[100px]" style={{ height: `${sidebarSplit * 100}%` }}>
          <div className="p-6 flex-1 flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 text-yellow-300 flex-shrink-0 z-10 relative bg-transparent"><div className="flex items-center gap-2"><Bell size={24} /><h3 className="text-sm font-bold uppercase tracking-widest">Lembretes</h3></div><button onClick={() => setShowAddReminder(!showAddReminder)} className="p-1 hover:bg-white/10 rounded-full"><Plus size={18} /></button></div>
            {showAddReminder && <form onSubmit={handleAddReminderManual} className="mb-4 animate-fade-in flex gap-1 flex-shrink-0 z-10"><input type="text" value={newReminderText} onChange={(e) => setNewReminderText(e.target.value)} placeholder="Novo..." className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white font-light" autoFocus /><button type="submit" className="bg-yellow-500 text-black rounded px-2 text-xs font-bold">→</button></form>}
            
            <div className="flex-1 overflow-hidden relative mask-gradient-y pause-on-hover">
              {allReminders.length === 0 ? (
                <p className="text-white/30 text-xs font-light text-center mt-4">Nenhum lembrete para hoje.</p>
              ) : (
                <div className="flex flex-col gap-3 animate-vertical-scroll absolute top-0 left-0 w-full">
                  {/* Lista Original */}
                  {allReminders.map((r, i) => (
                    <div key={`orig-${i}`} className={`p-4 rounded-xl border border-white/5 ${r.type === 'alert' ? 'bg-red-500/20' : r.type === 'action' ? 'bg-blue-500/20' : 'bg-white/5'} flex-shrink-0`}>
                      <div className="flex justify-between items-start mb-1"><span className={`text-[10px] font-bold uppercase tracking-wider ${r.type === 'alert' ? 'text-red-300' : 'text-blue-300'}`}>{r.type === 'action' ? 'Ação' : r.type === 'alert' ? 'Urgente' : 'Info'}</span><span className="text-[10px] opacity-50 font-light">{r.time}</span></div>
                      <p className="text-lg font-light leading-tight">{r.text}</p>
                    </div>
                  ))}
                  {/* Lista Duplicada para Loop Perfeito */}
                  {allReminders.map((r, i) => (
                    <div key={`dup-${i}`} className={`p-4 rounded-xl border border-white/5 ${r.type === 'alert' ? 'bg-red-500/20' : r.type === 'action' ? 'bg-blue-500/20' : 'bg-white/5'} flex-shrink-0`}>
                      <div className="flex justify-between items-start mb-1"><span className={`text-[10px] font-bold uppercase tracking-wider ${r.type === 'alert' ? 'text-red-300' : 'text-blue-300'}`}>{r.type === 'action' ? 'Ação' : r.type === 'alert' ? 'Urgente' : 'Info'}</span><span className="text-[10px] opacity-50 font-light">{r.time}</span></div>
                      <p className="text-lg font-light leading-tight">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-4 bg-transparent cursor-row-resize flex items-center justify-center hover:bg-white/5 active:bg-yellow-400/20 transition-colors group z-50 flex-shrink-0 -mt-2 -mb-2" onMouseDown={startHeightResize} onTouchStart={startHeightResize}>
           <div className="w-16 h-1 rounded-full bg-white/20 group-hover:bg-yellow-400 shadow-md flex items-center justify-center"><GripHorizontal size={12} className="text-black opacity-0 group-hover:opacity-100" /></div>
        </div>

        <div className="flex-1 p-6 flex flex-col overflow-hidden min-h-[100px]">
          <div className="flex items-center gap-2 mb-4 text-blue-300 flex-shrink-0"><Newspaper size={24} /><h3 className="text-sm font-bold uppercase tracking-widest">Notícias</h3></div>
          <div className="flex-1 flex flex-col justify-start gap-4 overflow-y-auto hide-scrollbar">
            <NewsWidget category="Política" color="bg-blue-500" data={newsData.politica} index={newsIndexP} />
            <div className="w-full h-px bg-white/10 flex-shrink-0" />
            <NewsWidget category="Esportes" color="bg-green-500" data={newsData.esportes} index={newsIndexE} />
            <div className="w-full h-px bg-white/10 flex-shrink-0" />
            <NewsWidget category="Cultura" color="bg-purple-500" data={newsData.cultura} index={newsIndexC} />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default App;