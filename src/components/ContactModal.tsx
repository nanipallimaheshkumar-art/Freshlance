import React from 'react';
import { X, MapPin, Phone, Mail, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-emerald-400">
              📞
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Contact FreshLane Support</h3>
              <p className="text-[11px] text-emerald-300">Tadepalligudem Produce Hub · 30-Min Delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-xs">FreshLane Fulfilment Hub</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                KN Road, Near Subba Rao Peta, Pentapadu Junction, Tadepalligudem, West Godavari, Andhra Pradesh 534102.
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                15 km Strict Express Delivery Corridor
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-2 mb-1 text-slate-900 font-bold">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Phone &amp; WhatsApp</span>
              </div>
              <p className="font-mono text-slate-800 font-bold text-xs">+91 99001 12233</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Toll-free customer hotline</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-2 mb-1 text-slate-900 font-bold">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>Email Support</span>
              </div>
              <p className="font-mono text-slate-800 font-bold text-xs">support@freshlane.com</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Instant reply within 15 mins</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-900 text-xs">Operating Hours</p>
              <p className="text-[11px] text-slate-600">6:00 AM – 10:30 PM IST (All 7 Days a week)</p>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-2xl flex items-center gap-2 text-emerald-800 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Quality &amp; Freshness Guarantee: Instant refunds on damaged produce.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
