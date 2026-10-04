import React, { useState } from 'react';
import { User, UserRole } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  X,
  Lock,
  Mail,
  Building,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  MapPin,
  Sparkles,
} from 'lucide-react';


interface VendorVenueLoginModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  onSwitchPortal: (role: UserRole) => void;
}


export const VendorVenueLoginModal: React.FC<VendorVenueLoginModalProps> = ({
  onClose,
  onSuccess,
  onSwitchPortal,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [venueBrand, setVenueBrand] = useState('');
  const [facilityType, setFacilityType] = useState('Convention & Exhibition Center');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // 1-Tap Quick Demo Login as Vendor / Venue Partner
  const handleQuickVendorLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: users } = await supabase
        .from('Users')
        .select('*')
        .ilike('Email', 'vendor.eventflow@gmail.com')
        .limit(1);

      if (users && users.length > 0) {
        const u = users[0];
        onSuccess({
          Id: u.Id,
          Name: u.Name,
          Email: u.Email,
          Role: 'VendorVenueManager',
        });
        onClose();
        return;
      }


      onSuccess({
        Id: '00000000-0000-0000-0000-0000000000bb',
        Name: 'BMICH Premier Venues & Staging',
        Email: 'vendor.eventflow@gmail.com',
        Role: 'VendorVenueManager',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Vendor login failed');
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
      setError('Please provide a valid business email.');
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
            Role: 'VendorVenueManager',
          });
          onClose();
          return;
        }


        onSuccess({
          Id: crypto.randomUUID(),
          Name: cleanEmail.split('@')[0],
          Email: cleanEmail,
          Role: 'VendorVenueManager',
        });
        onClose();
      } else {
        if (!venueBrand.trim()) throw new Error('Please enter venue or agency brand name.');
        const newUserId = crypto.randomUUID();
        const now = new Date().toISOString();

        await supabase.from('Users').insert({
          Id: newUserId,
          Name: venueBrand.trim(),
          Email: cleanEmail,
          PasswordHash: password,
          Role: 'VendorVenueManager',
          CreatedAt: now,
          UpdatedAt: now,
        });


        onSuccess({
          Id: newUserId,
          Name: venueBrand.trim(),
          Email: cleanEmail,
          Role: 'VendorVenueManager',
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950/40 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col max-h-[92vh]">
        {/* Vendor & Venue Header: Rich Emerald & Teal Theme */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-950 border-b border-emerald-500/30 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Building className="w-3 h-3 text-emerald-400" />
                  Vendor &amp; Venue
                </span>
                <span className="text-[9px] text-teal-300 font-bold bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-800/40">
                  Expo &amp; Facilities
                </span>
              </div>
              <h3 className="text-base font-black text-white">Venue &amp; Vendor Partner Hub</h3>
              <p className="text-[11px] text-slate-300 leading-tight">
                Purpose: Manage convention halls, exhibition stalls, AV stage packages, and organizer booking quotes.
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
        <div className="p-3 bg-emerald-950/40 border-b border-emerald-500/20">
          <button
            type="button"
            onClick={handleQuickVendorLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 rounded-xl text-left flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                BM
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>Sign in as BMICH Venue Partner</span>
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-[10px] text-emerald-300 font-mono">
                  vendor.eventflow@gmail.com · Convention Center
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-300 group-hover:text-emerald-200 bg-emerald-500/20 px-2 py-1 rounded-md">
              1-Tap
            </span>
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-3 flex items-center justify-between border-b border-white/5 pb-2 text-xs">
          <span className="font-bold text-white text-xs">
            {mode === 'login' ? 'Sign In as Partner' : 'Register Venue / Agency'}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline"
          >
            {mode === 'login' ? 'Register Facility / Service' : 'Already registered?'}
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
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Venue / Supplier Brand Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. BMICH Colombo / Ceylon AV Dynamics"
                    value={venueBrand}
                    onChange={(e) => setVenueBrand(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Primary Facility / Service Category
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Convention & Exhibition Center">Convention &amp; Exhibition Center</option>
                    <option value="Luxury Ballroom & Hotel">Luxury Ballroom &amp; Hotel</option>
                    <option value="Stage Lighting & Staging">Stage Lighting &amp; Staging</option>
                    <option value="Audiovisual & LED Walls">Audiovisual &amp; LED Walls</option>
                    <option value="Exhibition Booth Fabricator">Exhibition Booth Fabricator</option>
                    <option value="VIP Catering & Hospitality">VIP Catering &amp; Hospitality</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Business / Partner Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. vendor.eventflow@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{mode === 'login' ? 'Sign In as Partner' : 'Create Vendor Profile'}</span>
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
              onClick={() => onSwitchPortal('Organizer')}
              className="text-purple-400 hover:text-purple-300 font-bold"
            >
              Organizer
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
