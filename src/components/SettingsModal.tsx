import React, { useEffect, useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Check,
  X,
  Volume2,
  VolumeX,
  MapPin,
  Sparkles,
  RefreshCw,
  Bell,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../utils/themeStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearCart?: () => void;
  onShowToast?: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onClearCart,
  onShowToast,
}) => {
  const { mode, effectiveTheme, systemTheme, setThemeMode } = useTheme();

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('freshlane_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const [orderAlerts, setOrderAlerts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('freshlane_order_alerts') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectMode = (newMode: ThemeMode) => {
    setThemeMode(newMode);
    const labels: Record<ThemeMode, string> = {
      light: 'Light Mode activated ☀️',
      dark: 'Dark Mode activated 🌙',
      system: `System Mode activated (currently ${systemTheme === 'dark' ? 'Dark 🌙' : 'Light ☀️'})`,
    };
    if (onShowToast) {
      onShowToast(labels[newMode]);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('freshlane_sound_enabled', String(next));
    } catch {}
    if (onShowToast) {
      onShowToast(next ? 'Sound effects enabled 🔔' : 'Sound effects muted 🔕');
    }
  };

  const handleToggleAlerts = () => {
    const next = !orderAlerts;
    setOrderAlerts(next);
    try {
      localStorage.setItem('freshlane_order_alerts', String(next));
    } catch {}
    if (onShowToast) {
      onShowToast(next ? 'Order notifications enabled ⚡' : 'Order notifications paused');
    }
  };

  const modeOptions: Array<{
    id: ThemeMode;
    title: string;
    description: string;
    icon: React.ReactNode;
    previewBg: string;
  }> = [
    {
      id: 'light',
      title: 'Light Mode',
      description: 'Crisp, high-contrast daylight view with fresh farm greens',
      icon: <Sun className="w-5 h-5 text-amber-500" />,
      previewBg: 'bg-white border-slate-200 text-slate-800',
    },
    {
      id: 'dark',
      title: 'Dark Mode',
      description: 'Deep emerald slate theme, easy on eyes for evening shopping',
      icon: <Moon className="w-5 h-5 text-emerald-400" />,
      previewBg: 'bg-[#091b15] border-emerald-800/60 text-emerald-200',
    },
    {
      id: 'system',
      title: 'System Default',
      description: `Automatically syncs with your device settings (currently ${
        systemTheme === 'dark' ? 'Dark' : 'Light'
      })`,
      icon: <Laptop className="w-5 h-5 text-sky-400" />,
      previewBg: 'bg-gradient-to-r from-white via-slate-100 to-[#091b15] border-emerald-700/40 text-slate-700',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#081813] text-slate-900 dark:text-slate-100 rounded-[32px] border border-emerald-900/15 dark:border-emerald-700/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-emerald-900/40 flex items-center justify-between bg-slate-50/70 dark:bg-[#061410]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[32px] btn-unique-emerald text-white flex items-center justify-center shadow-sm">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base sm:text-lg font-bold tracking-tight">
                Settings &amp; Preferences
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-emerald-400/80">
                Display modes, alerts &amp; local app settings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-[32px] bg-slate-200/70 dark:bg-emerald-900/40 hover:bg-slate-300 dark:hover:bg-emerald-800/60 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SECTION 1: Appearance & Theme Modes (3 options: Light, Dark, System) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Appearance Mode
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose between Light, Dark, or System automatic sync
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-[32px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 font-semibold">
                Active: {effectiveTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </span>
            </div>

            {/* 3 Mode Option Cards */}
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {modeOptions.map((opt) => {
                const isSelected = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectMode(opt.id)}
                    className={`w-full p-3 sm:p-3.5 rounded-[24px] border text-left transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-[#0f2c22] shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-emerald-900/40 bg-white/60 dark:bg-[#0a1e17]/60 hover:bg-slate-50 dark:hover:bg-[#0d251d]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-[20px] flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-white dark:bg-[#071912] border-emerald-400 dark:border-emerald-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-[#071a13] border-slate-200 dark:border-emerald-900/50'
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {opt.title}
                          </span>
                          {opt.id === 'system' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-emerald-950 text-slate-700 dark:text-emerald-300 font-medium">
                              Auto
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'border-2 border-slate-300 dark:border-emerald-800 text-transparent group-hover:border-emerald-400'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Notification & Audio Preferences */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-emerald-900/40 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Sound &amp; Notifications
            </h3>

            <div className="space-y-2">
              {/* Sound toggle */}
              <div className="p-3 rounded-[24px] bg-slate-50 dark:bg-[#0a1e17]/60 border border-slate-200/80 dark:border-emerald-900/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[16px] bg-white dark:bg-[#071912] border border-slate-200 dark:border-emerald-800/40 flex items-center justify-center text-slate-700 dark:text-emerald-300">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      In-App Sound Effects
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chime audio when adding harvest items or placing orders
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle in-app sound effects"
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Order alerts toggle */}
              <div className="p-3 rounded-[24px] bg-slate-50 dark:bg-[#0a1e17]/60 border border-slate-200/80 dark:border-emerald-900/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[16px] bg-white dark:bg-[#071912] border border-slate-200 dark:border-emerald-800/40 flex items-center justify-center text-slate-700 dark:text-emerald-300">
                    <Bell className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Live Delivery Alerts
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Real-time updates when driver leaves hub &amp; arrives
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAlerts}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    orderAlerts ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle live delivery alerts"
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      orderAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: Delivery Hub Information */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-emerald-900/40 space-y-2">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Fulfillment Hub
            </h3>
            <div className="p-3 rounded-[24px] bg-slate-50 dark:bg-[#0a1e17]/60 border border-slate-200/80 dark:border-emerald-900/40 flex items-start gap-3">
              <div className="w-8 h-8 rounded-[16px] bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Tadepalligudem Express Hub</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                    534102
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Strict 15 km express delivery radius · Average speed: 24–30 min
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: Data & Cart Reset */}
          {onClearCart && (
            <div className="pt-2 border-t border-slate-200/70 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Clear Shopping Bag</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Reset all items currently in your fresh bag</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClearCart();
                  if (onShowToast) onShowToast('Shopping bag cleared.');
                }}
                className="px-3 py-1.5 rounded-[32px] text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Bag</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-emerald-900/40 bg-slate-50/80 dark:bg-[#061410]/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            FreshLane v2.4 · Auto Saved
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-[32px] btn-unique-emerald text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
