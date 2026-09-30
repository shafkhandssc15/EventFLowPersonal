import React, { useState } from 'react';
import { User, UserRole } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  Ticket,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AttendeeLoginModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  onSwitchPortal: (role: UserRole) => void;
}

export const AttendeeLoginModal: React.FC<AttendeeLoginModalProps> = ({
  onClose,
  onSuccess,
  onSwitchPortal,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1-Tap Quick Demo Login as Attendee
  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: users } = await supabase
        .from('Users')
        .select('*')
        .ilike('Email', 'nimal@gmail.com')
        .limit(1);

      if (users && users.length > 0) {
        const u = users[0];
        onSuccess({
          Id: u.Id,
          Name: u.Name,
          Email: u.Email,
          Role: 'Attendee',
        });
        onClose();
        return;
      }

      // Fallback attendee
      onSuccess({
        Id: '10000000-0000-0000-0000-000000000001',
        Name: 'Nimal Perera',
        Email: 'nimal@gmail.com',
        Role: 'Attendee',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed');
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
      setError('Please provide a valid attendee email.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
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
            Role: 'Attendee',
          });
          onClose();
          return;
        }

        // Demo fallback for instant sign-in
        onSuccess({
          Id: crypto.randomUUID(),
          Name: cleanEmail.split('@')[0],
          Email: cleanEmail,
          Role: 'Attendee',
        });
        onClose();
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');
        const newUserId = crypto.randomUUID();
        const now = new Date().toISOString();

        await supabase.from('Users').insert({
          Id: newUserId,
          Name: name.trim(),
          Email: cleanEmail,
          PasswordHash: password,
          Role: 'Attendee',
          CreatedAt: now,
          UpdatedAt: now,
        });

        onSuccess({
          Id: newUserId,
          Name: name.trim(),
          Email: cleanEmail,
          Role: 'Attendee',
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Attendee authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950/40 border border-blue-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.25)] flex flex-col max-h-[92vh]">
        {/* Attendee Portal Header: Deep Blue / Cyan Festival Theme */}
        <div className="p-4 bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-cyan-900/40 border-b border-blue-500/20 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <Ticket className="w-3 h-3" />
                  Attendee Portal
                </span>
                <span className="text-[9px] text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
                  Passes &amp; Wallet
                </span>
              </div>
              <h3 className="text-base font-black text-white">Attendee &amp; Delegate Access</h3>
              <p className="text-[11px] text-slate-300 leading-tight">
                Purpose: Explore summits, reserve passes and access your digital QR gate wallet.
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

        {/* 1-Tap Quick Demo Access */}
        <div className="p-3 bg-blue-950/40 border-b border-blue-500/10">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 rounded-xl text-left flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-xs">
                NP
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>Sign in as Nimal Perera</span>
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-[10px] text-blue-300 font-mono">nimal@gmail.com · Attendee</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-md">
              1-Tap
            </span>
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-3 flex items-center justify-between border-b border-white/5 pb-2 text-xs">
          <span className="font-bold text-white text-xs">
            {mode === 'login' ? 'Sign In with Email' : 'Create Attendee Account'}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline"
          >
            {mode === 'login' ? 'Register as Attendee' : 'Already have account?'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto no-scrollbar">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-xs text-rose-300 leading-relaxed">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Nimal Perera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. nimal@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Mobile</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+94 77..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">NIC / ID</label>
                <input
                  type="text"
                  placeholder="National ID"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{mode === 'login' ? 'Sign In as Attendee' : 'Register Attendee Pass'}</span>
          </button>
        </form>

        {/* Portal Switcher Footer */}
        <div className="p-3 bg-black/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Need a different portal?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSwitchPortal('Organizer')}
              className="text-purple-400 hover:text-purple-300 font-bold"
            >
              Organizer
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
