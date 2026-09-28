import React from 'react';
import { Sparkles, Globe, MessageSquare } from 'lucide-react';

interface GeminiChatLauncherProps {
  onClick: () => void;
  isOpen: boolean;
}

export const GeminiChatLauncher: React.FC<GeminiChatLauncherProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 animate-fade-in">
      <button
        onClick={onClick}
        className="group flex items-center gap-2.5 px-5 py-3 rounded-[32px] btn-unique-dark text-white shadow-2xl hover:shadow-emerald-900/30 border border-emerald-500/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
        title="Chat with FreshLane AI Produce Sommelier (Gemini 3 + Google Search)"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-[16px] btn-unique-emerald flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-emerald-100" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>

        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
            <span>Ask FreshLane AI</span>
            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[32px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Gemini
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 flex items-center gap-1">
            <Globe className="w-2.5 h-2.5 text-emerald-400" />
            <span>Search-Grounded Produce Advice</span>
          </p>
        </div>

        <div className="sm:hidden text-xs font-bold text-white">
          AI Chat
        </div>
      </button>
    </div>
  );
};
