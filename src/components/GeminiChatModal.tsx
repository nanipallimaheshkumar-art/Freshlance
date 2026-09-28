import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  ExternalLink,
  Globe,
  Zap,
  Microscope,
  Compass,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Info,
  ChevronDown,
  MapPin,
  Navigation
} from 'lucide-react';
import Markdown from 'react-markdown';
import { ChatMessage, ChatRoleType, WebSource, MapSource, ProduceItem } from '../types';

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (item: ProduceItem, qty?: number) => void;
  onInspectProduct?: (item: ProduceItem) => void;
  availableProducts?: ProduceItem[];
}

const STORAGE_KEY = 'freshlane_gemini_chat_history_v2';

const ROLE_CONFIGS: Record<
  ChatRoleType,
  {
    title: string;
    model: string;
    badge: string;
    icon: React.FC<{ className?: string }>;
    description: string;
    placeholder: string;
    starterPrompts: string[];
  }
> = {
  general: {
    title: 'Market & Seasonal Advisor',
    model: 'gemini-3.5-flash',
    badge: 'Live Search Grounded',
    icon: Globe,
    description: 'Real-time seasonal arrivals, Andhra mandi trends, ripeness indicators & culinary advice.',
    placeholder: 'Ask about current harvest seasons, ripeness tips, or mandi market prices...',
    starterPrompts: [
      'What mangoes and fruits are in peak season right now in Andhra Pradesh?',
      'How do I test if an Alphonso mango is naturally tree-ripened vs carbide-ripened?',
      'What are the best seasonal vegetables for a traditional Andhra Pappu right now?',
      'How do I store fresh leafy greens like palakura and methi for 10+ days?'
    ]
  },
  maps: {
    title: 'Farm & Mandi Locator',
    model: 'gemini-3.5-flash',
    badge: 'Google Maps Grounded',
    icon: MapPin,
    description: 'Locate verified wholesale agricultural mandis, Rythu Bazars & organic hubs with Google Maps.',
    placeholder: 'Find wholesale mandis, Rythu Bazars, or farm collection centers near Tadepalligudem...',
    starterPrompts: [
      'Where is the closest wholesale vegetable mandi and APMC market to Tadepalligudem?',
      'Find the nearest Rythu Bazar for morning farm-fresh greens in West Godavari.',
      'Which fruit mandis near Tanuku or Bhimavaram have the best sweet lime and banana auctions?',
      'Locate certified organic farmer producer company (FPO) hubs in the Godavari belt.'
    ]
  },
  fast: {
    title: 'Quick Kitchen & Prep Tips',
    model: 'gemini-3.1-flash-lite',
    badge: 'Fast Response',
    icon: Zap,
    description: 'Instant 10-15 minute recipes, prep hacks, ingredient swaps & storage life.',
    placeholder: 'Ask for a quick 10-minute recipe, produce prep shortcut, or quick substitute...',
    starterPrompts: [
      'Give me a 10-minute quick saute using fresh spinach and vine tomatoes.',
      'Quickest way to peel and store fresh ginger and garlic for the week.',
      'Fast substitute if I don’t have lemons for a fresh salad dressing.',
      'How many days will fresh broccoli and carrots keep in the crisper?'
    ]
  },
  complex: {
    title: 'Agronomy & Biochemistry',
    model: 'gemini-3.1-pro-preview',
    badge: 'Deep Analysis',
    icon: Microscope,
    description: 'In-depth scientific breakdown of soil microbiomes, certifications, pesticide kinetics & nutrient bioavailability.',
    placeholder: 'Ask about post-harvest biochemistry, antioxidant kinetics, or organic standards...',
    starterPrompts: [
      'Explain the enzymatic respiration and ethylene kinetics of climacteric fruits during storage.',
      'Compare pesticide breakdown half-lives between conventional and Jaivik Bharat organic farming.',
      'What factors maximize sulforaphane bioavailability when prepping fresh broccoli?',
      'How does hyper-local 30-minute farm-to-table delivery preserve vitamin C vs cold-chain transport?'
    ]
  }
};

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  onInspectProduct,
  availableProducts = []
}) => {
  const [selectedRole, setSelectedRole] = useState<ChatRoleType>('general');
  const [useSearch, setUseSearch] = useState<boolean>(true);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 16.8142, // Tadepalligudem agricultural hub
    longitude: 81.5273
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    return [
      {
        id: 'welcome-init',
        role: 'model',
        content: `### 🌿 Welcome to FreshLane AI Produce Sommelier!

I'm your dedicated agricultural, culinary, and produce assistant powered by **Gemini**.

- **Farm & Mandi Locator** (*gemini-3.5-flash* + **Google Maps Grounded**): Discover verified wholesale vegetable mandis, Rythu Bazars, and organic farm hubs around Tadepalligudem & West Godavari.
- **Market & Seasonal Advisor** (*gemini-3.5-flash* + **Google Search**): Ask for live harvest arrivals, mandi trends, and Andhra seasonal crops.
- **Quick Kitchen Assistant** (*gemini-3.1-flash-lite*): Rapid 10-minute healthy recipes and produce prep shortcuts.
- **Deep Agronomy & Science** (*gemini-3.1-pro-preview*): Deep biochemical, nutritional, and organic soil analysis.

How can I assist you with your fresh produce today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        botRole: 'general',
        modelUsed: 'gemini-3.5-flash',
        webSources: [
          {
            uri: 'https://freshlane.market/guides/ap-agriculture',
            title: 'Andhra Pradesh Daily Farm Harvest Index'
          }
        ]
      }
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Request browser location for accurate Google Maps Grounding
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {
          // Keep default Tadepalligudem hub
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 200);
    }
  }, [isOpen, messages]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to persist chat messages:', e);
    }
  }, [messages]);

  const handleClearHistory = () => {
    if (window.confirm('Clear your conversation history with FreshLane AI?')) {
      const initMessage: ChatMessage = {
        id: 'welcome-reset',
        role: 'model',
        content: `Conversation history cleared. Ready for new produce questions, ripeness checks, or recipes!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        botRole: selectedRole,
        modelUsed: ROLE_CONFIGS[selectedRole].model
      };
      setMessages([initMessage]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      // Format messages payload for server-side multi-turn chat
      // Omit initial welcome message if it's generic, send conversation turns
      const apiPayloadMessages = newHistory
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      const isMaps = selectedRole === 'maps';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiPayloadMessages,
          role: selectedRole,
          model: ROLE_CONFIGS[selectedRole].model,
          useMaps: isMaps,
          useSearch: isMaps ? false : selectedRole === 'general' ? useSearch : selectedRole === 'complex' ? useSearch : false,
          userLocation: userCoords
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      const botResponse: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.text || 'I apologize, but I could not formulate a response. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        botRole: data.role || selectedRole,
        modelUsed: data.modelUsed || ROLE_CONFIGS[selectedRole].model,
        webSources: data.webSources || [],
        mapSources: data.mapSources || [],
        searchQueries: data.searchQueries || []
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (err: any) {
      console.warn('Gemini chat request notice:', err?.message || err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Could not connect to Gemini:** ${err?.message || 'Network error'}\n\nPlease check your internet connection or verify GEMINI_API_KEY settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        botRole: selectedRole,
        modelUsed: ROLE_CONFIGS[selectedRole].model,
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const currentRoleConfig = ROLE_CONFIGS[selectedRole];
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="bg-white/95 backdrop-blur-2xl w-full max-w-3xl h-[92vh] max-h-[760px] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-emerald-900/15 animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0b241c] to-[#040f0b] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-emerald-900/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[18px] btn-unique-emerald flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  FreshLane AI Produce Sommelier
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-[32px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini 3
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                Multi-turn conversation with live Google Search grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-2 rounded-[32px] text-slate-300 hover:text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-[32px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Persona / Role Selector Tabs */}
        <div className="bg-slate-50/80 border-b border-slate-200/80 px-3 sm:px-6 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
              {(['general', 'maps', 'fast', 'complex'] as ChatRoleType[]).map((roleKey) => {
                const config = ROLE_CONFIGS[roleKey];
                const Icon = config.icon;
                const isSelected = selectedRole === roleKey;
                const isMapsRole = roleKey === 'maps';
                return (
                  <button
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`px-3 py-1.5 rounded-[32px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? isMapsRole
                          ? 'btn-unique-emerald text-white shadow-xs'
                          : 'btn-unique-dark text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isMapsRole ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span>{config.title}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-[32px] font-mono ${
                        isSelected ? 'bg-black/30 text-slate-100' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {config.model}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grounding Status Indicator */}
            {selectedRole === 'maps' && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-[32px] border border-emerald-200 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Google Maps Grounded</span>
                <span className="sm:hidden">Maps</span>
              </div>
            )}

            {/* Google Search Grounding toggle (shown for general & complex) */}
            {selectedRole === 'general' && (
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none shrink-0 bg-white px-3 py-1 rounded-[32px] border border-slate-200">
                <input
                  type="checkbox"
                  checked={useSearch}
                  onChange={(e) => setUseSearch(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
                <Globe className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">Google Search Grounding</span>
                <span className="sm:hidden">Search</span>
              </label>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{currentRoleConfig.description}</span>
          </p>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 bg-white/50">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const roleMeta = msg.botRole ? ROLE_CONFIGS[msg.botRole] : null;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm ${
                  isUser ? 'justify-end' : 'justify-start'
                } animate-fade-in`}
              >
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 shadow-xs mt-0.5">
                    ✦
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 leading-relaxed ${
                    isUser
                      ? 'bg-emerald-700 text-white rounded-tr-xs shadow-xs'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {/* Model header info */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/70 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{roleMeta?.title || 'FreshLane Sommelier'}</span>
                        {msg.modelUsed && (
                          <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            {msg.modelUsed}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Message body with Markdown */}
                  <div className={`prose-sm max-w-none text-xs sm:text-sm ${isUser ? 'text-white' : 'text-slate-800'}`}>
                    <Markdown
                      components={{
                        h1: ({ children }) => <h1 className="text-base font-bold my-2 text-slate-900">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold my-1.5 text-slate-900">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-bold my-1 text-slate-900">{children}</h3>,
                        p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-snug">{children}</li>,
                        strong: ({ children }) => (
                          <strong className={isUser ? 'font-bold text-white' : 'font-bold text-slate-950'}>
                            {children}
                          </strong>
                        ),
                        code: ({ children }) => (
                          <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-900">
                            {children}
                          </code>
                        )
                      }}
                    >
                      {msg.content}
                    </Markdown>
                  </div>

                  {/* Google Search Grounding Sources & Queries */}
                  {!isUser && msg.webSources && msg.webSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mb-1.5">
                        <Globe className="w-3 h-3 text-emerald-600" />
                        <span>Grounded with Google Search:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.webSources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-emerald-400 text-[10px] font-medium text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs"
                            title={source.uri}
                          >
                            <span className="max-w-[170px] truncate">{source.title || source.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                        ))}
                      </div>

                      {msg.searchQueries && msg.searchQueries.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-500">Searched: </span>
                          <span>{msg.searchQueries.join(' · ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Google Maps Grounding Sources & Places */}
                  {!isUser && msg.mapSources && msg.mapSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Grounded with Google Maps:</span>
                        <span className="ml-auto text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          {msg.mapSources.length} {msg.mapSources.length === 1 ? 'place' : 'places'} verified
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.mapSources.map((place, idx) => (
                          <a
                            key={idx}
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col p-2.5 rounded-lg bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 hover:border-blue-400 transition-all text-left shadow-2xs"
                            title={place.title}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 leading-tight">
                                {place.title}
                              </span>
                              <ExternalLink className="w-3 h-3 text-blue-500 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                            {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic">
                                "{place.reviewSnippets[0]}"
                              </p>
                            )}
                            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 group-hover:underline">
                              Open in Google Maps ↗
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp for user message */}
                  {isUser && (
                    <div className="text-[10px] text-emerald-200/80 text-right mt-1.5 font-medium">
                      {msg.timestamp}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                    You
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                ✦
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-600 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>
                  Consulting <strong>{currentRoleConfig.model}</strong>
                  {selectedRole === 'maps'
                    ? ' with Google Maps Grounding...'
                    : selectedRole === 'general' && useSearch
                    ? ' with Google Search...'
                    : '...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts chips (if messages are short) */}
        {messages.length <= 2 && (
          <div className="px-3 sm:px-6 py-2 bg-slate-50/80 border-t border-slate-200 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Suggested Questions:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {currentRoleConfig.starterPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="text-left text-[11px] px-3.5 py-1.5 rounded-[32px] bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 transition-all cursor-pointer shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentRoleConfig.placeholder}
                rows={2}
                disabled={isLoading}
                className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-[24px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400 resize-none transition-all disabled:opacity-60 shadow-inner"
              />
              <div className="text-[10px] text-slate-400 px-1 mt-0.5 flex items-center justify-between">
                <span>Press Enter to send · Shift+Enter for new line</span>
                <span className="font-mono text-[9px]">{currentRoleConfig.model}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="h-12 px-5 rounded-[32px] btn-unique-emerald text-white disabled:bg-slate-200 disabled:text-slate-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed shrink-0 hover:scale-[1.01] active:scale-95"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
