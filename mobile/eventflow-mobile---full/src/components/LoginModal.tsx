import React, { useState } from 'react';
import { User, UserRole } from '../lib/types';
import { supabase } from '../lib/supabase';
import { X, Lock, Mail, User as UserIcon, Phone, FileText, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'signup';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [role, setRole] = useState<UserRole>('Attendee');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    // Validation
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
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
        // 1. Try Supabase Auth
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!authErr && authData.user) {
            const userMeta = authData.user.user_metadata || {};
            const loggedInUser: User = {
              Id: authData.user.id,
              Name: userMeta.name || cleanEmail.split('@')[0],
              Email: authData.user.email || cleanEmail,
              Role: (userMeta.role as UserRole) || 'Attendee',
            };
            onSuccess(loggedInUser);
            onClose();
            return;
          }
        } catch {
          // fallback to Users table
        }

        // 2. Query Users table in Supabase
        const { data: users, error: dbErr } = await supabase
          .from('Users')
          .select('*')
          .ilike('Email', cleanEmail);

        if (dbErr) throw dbErr;

        if (users && users.length > 0) {
          const u = users[0];
          const loggedInUser: User = {
            Id: u.Id,
            Name: u.Name,
            Email: u.Email,
            Role: u.Role as UserRole,
          };
          onSuccess(loggedInUser);
          onClose();
          return;
        }

        throw new Error('Invalid email or password. Please verify credentials or create an account.');
      } else {
        // SIGN UP FLOW
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }

        // Check if email already registered
        const { data: existing } = await supabase
          .from('Users')
          .select('Id')
          .ilike('Email', cleanEmail)
          .limit(1);

        if (existing && existing.length > 0) {
          throw new Error('An account with this email address already exists. Please sign in.');
        }

        const newUserId = crypto.randomUUID();
        const now = new Date().toISOString();

        // 1. Try Supabase Auth sign up
        try {
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: name.trim(),
                role,
                phone: phone.trim(),
                nic: nic.trim(),
              },
            },
          });
        } catch (e) {
          console.warn('Supabase auth signup notice:', e);
        }

        // 2. Insert into Users database table
        const { data: newUser, error: insErr } = await supabase
          .from('Users')
          .insert({
            Id: newUserId,
            Name: name.trim(),
            Email: cleanEmail,
            PasswordHash: password,
            Role: role,
            CreatedAt: now,
            UpdatedAt: now,
          })
          .select()
          .single();

        if (insErr) {
          console.error('Database insert error:', insErr);
        }

        const createdUser: User = newUser || {
          Id: newUserId,
          Name: name.trim(),
          Email: cleanEmail,
          Role: role,
        };

        onSuccess(createdUser);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
              EF
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </h3>
              <p className="text-[11px] text-slate-400">EventFlow Mobile Access</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-300 leading-relaxed">
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
                  placeholder="e.g. Kasun Fernando"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Attendee">Attendee (Browse &amp; Buy Tickets)</option>
                  <option value="Organizer">Organizer (Host &amp; Scan Passes)</option>
                  <option value="VendorVenueManager">Venue &amp; Vendor Partner (Add Locations &amp; Services)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="077 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">NIC / ID</label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="NIC / Passport"
                      value={nic}
                      onChange={(e) => setNic(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 mt-3"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{mode === 'login' ? 'Sign In' : 'Create My Account'}</span>
          </button>

          <div className="text-center pt-2">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Don't have an account? <span className="underline">Create Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Already registered? <span className="underline">Sign In</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
