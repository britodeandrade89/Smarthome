import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, X, Send, Sparkles } from 'lucide-react';
import { getChefSuggestion } from '../services/geminiService';

interface ChefModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChefModal: React.FC<ChefModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setResponse('');
      setInput('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setResponse('');
    
    const result = await getChefSuggestion(input);
    
    setResponse(result);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-fade-in">
      <div className="bg-zinc-900/90 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col h-[80vh] md:h-[600px] relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
              <ChefHat size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white uppercase tracking-wide">Chef Gemini</h2>
              <p className="text-white/60 text-sm tracking-widest uppercase">Assistente Culinário</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto hide-scrollbar flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/50">
              <Sparkles className="animate-spin text-yellow-400" size={48} />
              <p className="animate-pulse text-xl tracking-wider">CRIANDO RECEITA...</p>
            </div>
          ) : response ? (
            <div className="prose prose-invert prose-lg max-w-none">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                 <p className="whitespace-pre-wrap leading-relaxed text-gray-100 font-light text-xl">{response}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-center">
              <ChefHat size={80} className="mb-6 opacity-20" />
              <p className="text-2xl font-light uppercase tracking-wide">Diga-me o que tem na geladeira</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white/5 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input 
              ref={inputRef}
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Ex: Ovos, queijo e tomate..." 
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all text-xl font-light tracking-wide" 
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading} 
              className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
              <Send size={28} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChefModal;