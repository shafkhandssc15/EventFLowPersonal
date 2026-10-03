import React, { useState } from 'react';
import { UserRole } from '../../lib/types';
import {
  Ticket,
  QrCode,
  Building,
  Shield,
  X,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { AttendeeLoginModal } from './AttendeeLoginModal';
import { OrganizerLoginModal } from './OrganizerLoginModal';
import { VendorVenueLoginModal } from './VendorVenueLoginModal';
import { AdminLoginModal } from './AdminLoginModal';
import { User } from '../../lib/types';

interface RolePortalGatewayProps {
  initialRole?: UserRole | null;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const RolePortalGateway: React.FC<RolePortalGatewayProps> = ({
  initialRole = null,
  onClose,
  onSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(initialRole);

  // If a role is already selected, render that role's distinct login UI
  if (selectedRole === 'Attendee') {
    return (
      <AttendeeLoginModal
        onClose={onClose}
        onSuccess={onSuccess}
        onSwitchPortal={(r) => setSelectedRole(r)}
      />
    );
  }

  if (selectedRole === 'Organizer') {
    return (
      <OrganizerLoginModal
        onClose={onClose}
        onSuccess={onSuccess}
        onSwitchPortal={(r) => setSelectedRole(r)}
      />
    );
  }

  if (selectedRole === 'VendorVenueManager') {
    return (
      <VendorVenueLoginModal
        onClose={onClose}
        onSuccess={onSuccess}
        onSwitchPortal={(r) => setSelectedRole(r)}
      />
    );
  }

  if (selectedRole === 'Admin') {
    return (
      <AdminLoginModal
        onClose={onClose}
        onSuccess={onSuccess}
        onSwitchPortal={(r) => setSelectedRole(r)}
      />
    );
  }

  // Otherwise, render the 4 Role Portals Gateway
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Gateway Header */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/10 flex items-start justify-between">
          <div className="space-y-1">
            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Role Access Gateway
            </span>
            <h3 className="text-base font-black text-white">Select Your Access Portal</h3>
            <p className="text-[11px] text-slate-400">
              Each role has a dedicated app experience with its own purpose.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-black/40 hover:bg-black/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Portals List */}
        <div className="p-4 space-y-2.5 overflow-y-auto no-scrollbar">
          {/* 1. Attendee Portal */}
          <button
            onClick={() => setSelectedRole('Attendee')}
            className="w-full p-3.5 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 hover:border-blue-400 rounded-2xl text-left flex items-start gap-3 transition group hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white group-hover:text-blue-300 transition">
                  1. Attendee &amp; Delegate Portal
                </h4>
                <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  Passes &amp; Wallet
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Purpose: Explore summits, reserve passes and view digital entrance QR passes.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 self-center" />
          </button>

          {/* 2. Organizer Portal */}
          <button
            onClick={() => setSelectedRole('Organizer')}
            className="w-full p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-900 border border-purple-500/30 hover:border-purple-400 rounded-2xl text-left flex items-start gap-3 transition group hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white group-hover:text-purple-300 transition">
                  2. Organizer Gate Scanner
                </h4>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Scan Only
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Purpose: Gate ticket scanning and pass verification ONLY. Live Supabase database validation.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 self-center" />
          </button>

          {/* 3. Vendor / Venue Partner Portal */}
          <button
            onClick={() => setSelectedRole('VendorVenueManager')}
            className="w-full p-3.5 bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl text-left flex items-start gap-3 transition group hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Building className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white group-hover:text-emerald-300 transition">
                  3. Vendor &amp; Venue Partner
                </h4>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Venues &amp; Staging
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Purpose: Manage convention halls, stage packages, booth rentals, and organizer quotes.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 self-center" />
          </button>

          {/* 4. Admin Portal */}
          <button
            onClick={() => setSelectedRole('Admin')}
            className="w-full p-3.5 bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/30 hover:border-rose-400 rounded-2xl text-left flex items-start gap-3 transition group hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white group-hover:text-rose-300 transition">
                  4. System Administration
                </h4>
                <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  RBAC &amp; Governance
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Purpose: User directory management, RBAC enforcement, database health &amp; audit logs.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 self-center" />
          </button>
        </div>
      </div>
    </div>
  );
};
