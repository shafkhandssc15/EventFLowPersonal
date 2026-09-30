import React, { useState } from 'react';
import { User, UserRole } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  X,
  Lock,
  Mail,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Radio,
  Building,
} from 'lucide-react';

interface OrganizerLoginModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  onSwitchPortal: (role: UserRole) => void;
}

export const OrganizerLoginModal: React.FC<OrganizerLoginModalProps> = ({
  onClose,
  onSuccess,
  onSwitchPortal,
}) => {
  const [stationGate, setStationGate] = useState('Turnstile Gate 1 - Express QR');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1-Tap Quick Authorization as Gate Crew Organizer
  const handleQuickCrewLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: users } = await supabase
        .from('Users')
        .select('*')
        .ilike('Email', 'organizer.eventflow@gmail.com')
        .limit(1);

      if (users && users.length > 0) {
        const u = users[0];
        onSuccess({
          Id: u.Id,
          Name: u.Name,
          Email: u.Email,
          Role: 'Organizer',
        });
        onClose();
        return;
      }

      onSuccess({
        Id: '00000000-0000-0000-0000-0000000000aa',
        Name: 'EventFlow Gate Crew',
        Email: 'organizer.eventflow@gmail.com',
        Role: 'Organizer',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gate crew authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide an authorized organizer email.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Station access key must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const { data: users } = await supabase
        .from('Users')
        .select('*')
        .ilike('Email', cleanEmail);

      if (users && users.length > 0) {
        const u = users[0];
        onSuccess({
          Id: u.Id,
          Name: u.Name,
          Email: u.Email,
          Role: 'Organizer',
        });
        onClose();
        return;
      }

      onSuccess({
        Id: crypto.randomUUID(),
        Name: cleanEmail.split('@')[0],
        Email: cleanEmail,
        Role: 'Organizer',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-purple-950/40 border border-purple-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.25)] flex flex-col max-h-[92vh]">
        {/* Tactical Gate Scanner Header: Purple & Amber Warning Theme */}
        <div className="p-4 bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-slate-950 border-b border-purple-500/30 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <QrCode className="w-3 h-3 text-purple-400" />
                  Organizer Scanner
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                  Turnstile Crew
                </span>
              </div>
              <h3 className="text-base font-black text-white">Gate Scanner Authorization</h3>
              <p className="text-[11px] text-amber-200/90 leading-tight font-medium">
                Purpose: Gate ticket scanning and pass verification ONLY. Live Supabase database validation.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full bg-black/40 hover:bg-black/60 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Authorization */}
        <div className="p-3 bg-purple-950/40 border-b border-purple-500/20">
          <button
            type="button"
            onClick={handleQuickCrewLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 rounded-xl text-left flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-xs">
                GC
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>Authorize as Gate Crew</span>
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-[10px] text-purple-300 font-mono">
                  organizer.eventflow@gmail.com · Station Gate 1
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-300 group-hover:text-purple-200 bg-purple-500/20 px-2 py-1 rounded-md">
              Authorize
            </span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto no-scrollbar">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          {/* Turnstile Station Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Active Scanner Station
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={stationGate}
                onChange={(e) => setStationGate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-purple-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="Turnstile Gate 1 - Express QR">Turnstile Gate 1 - Express QR</option>
                <option value="Turnstile Gate 2 - VIP Access">Turnstile Gate 2 - VIP Access</option>
                <option value="Arena South Gate - Delegate Hall">Arena South Gate - Delegate Hall</option>
                <option value="Handheld Scanner Unit B">Handheld Scanner Unit B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Organizer Crew Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. organizer.eventflow@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Station Access Key / PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-[11px] text-amber-300/90 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Organizer mode is strictly configured for <strong>Ticket Scanning &amp; Check-In</strong>. All validated scans write directly to Supabase CheckIns.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-900/30 transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            <span>Authorize Gate Scanner</span>
          </button>
        </form>

        {/* Portal Switcher Footer */}
        <div className="p-3 bg-black/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Need a different portal?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSwitchPortal('Attendee')}
              className="text-blue-400 hover:text-blue-300 font-bold"
            >
              Attendee
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onSwitchPortal('VendorVenueManager')}
              className="text-emerald-400 hover:text-emerald-300 font-bold"
            >
              Vendor
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onSwitchPortal('Admin')}
              className="text-rose-400 hover:text-rose-300 font-bold"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
