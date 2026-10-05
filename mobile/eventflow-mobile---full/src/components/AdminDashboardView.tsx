import React, { useState, useEffect } from 'react';
import { supabase, formatLKR } from '../lib/supabase';
import { User, UserRole, EventItem } from '../lib/types';
import {
  Shield,
  Users,
  Calendar,
  DollarSign,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminDashboardViewProps {
  currentUser: User | null;
  onOpenLogin: (mode?: 'login' | 'signup') => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onOpenLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'platform' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [regsCount, setRegsCount] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // 1. Fetch Users from Supabase
      const { data: dbUsers } = await supabase
        .from('Users')
        .select('*')
        .order('CreatedAt', { ascending: false });
      setUsers(dbUsers || []);

      // 2. Fetch Events count
      const { count: eCount } = await supabase
        .from('Events')
        .select('Id', { count: 'exact', head: true });
      setEventsCount(eCount || 0);

      // 3. Fetch Registrations count
      const { count: rCount } = await supabase
        .from('Registrations')
        .select('Id', { count: 'exact', head: true });
      setRegsCount(rCount || 0);

      // 4. Fetch Payments sum
      const { data: pData } = await supabase.from('Payments').select('Amount');
      const rev = (pData || []).reduce((acc, p) => acc + (Number(p.Amount) || 0), 0);
      setTotalRevenue(rev);

      // 5. Fetch CheckIns audit
      const { data: ciData } = await supabase
        .from('CheckIns')
        .select('*')
        .order('CheckedInAt', { ascending: false })
        .limit(10);
      setAuditLogs(ciData || []);
    } catch (err) {
      console.error('AdminDashboardView error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Users' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CheckIns' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Change user role in Supabase
  
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      const now = new Date().toISOString();
      await supabase
        .from('Users')
        .update({ Role: newRole, UpdatedAt: now })
        .eq('Id', userId);

      confetti({ particleCount: 30, spread: 40 });
      await loadData();
    } catch (e) {
      console.error('Role update error:', e);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.Name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.Email.toLowerCase().includes(searchUser.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.Role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 space-y-4 select-none pb-24">
      {/* Top Admin Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
            System Administration
          </span>
          <h2 className="text-lg font-black text-white">Platform Governance</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-900 border border-white/10 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[10px] uppercase tracking-wider border border-rose-500/30">
            ADMIN ROOT
          </div>
        </div>
      </div>

      {/* Admin 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Registered Users</span>
          <div className="text-xl font-black text-white">{loading ? '-' : users.length}</div>
          <span className="text-[9px] text-slate-500">Live in Supabase</span>
        </div>

        <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Summits Hosted</span>
          <div className="text-xl font-black text-blue-400">{loading ? '-' : eventsCount}</div>
          <span className="text-[9px] text-slate-500">Events Table</span>
        </div>

        <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Total Passes Issued</span>
          <div className="text-xl font-black text-emerald-400">{loading ? '-' : regsCount}</div>
          <span className="text-[9px] text-slate-500">Registrations</span>
        </div>

        <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-0.5">
          <span className="text-[10px] text-slate-400 font-medium">Platform Volume</span>
          <div className="text-sm font-black text-purple-400 truncate">
            {loading ? '-' : formatLKR(totalRevenue)}
          </div>
          <span className="text-[9px] text-slate-500">Gross Payments</span>
        </div>
      </div>

      {/* Tab Switcher: Users / Audit */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-2xl border border-white/5 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'users' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Live Gate Audits</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto no-scrollbar text-[10px]">
              {['All', 'Attendee', 'Organizer', 'VendorVenueManager', 'Admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                    roleFilter === r
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {r === 'VendorVenueManager' ? 'Vendor' : r}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            {filteredUsers.map((u) => {
              const isUpdating = updatingUserId === u.Id;

              const roleBadgeColor =
                u.Role === 'Admin'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : u.Role === 'Organizer'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : u.Role === 'VendorVenueManager'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

              return (
                <div
                  key={u.Id}
                  className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2 shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-white text-xs truncate">{u.Name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{u.Email}</div>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleBadgeColor} shrink-0`}
                    >
                      {u.Role === 'VendorVenueManager' ? 'Vendor / Venue' : u.Role}
                    </span>
                  </div>

                  {/* RBAC Role Selector inline */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                    <span className="text-slate-400 font-medium">Reassign Role:</span>
                    <select
                      value={u.Role}
                      disabled={isUpdating}
                      onChange={(e) => handleUpdateRole(u.Id, e.target.value as UserRole)}
                      className="bg-black/60 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-rose-500"
                    >
                      <option value="Attendee">Attendee</option>
                      <option value="Organizer">Organizer</option>
                      <option value="VendorVenueManager">Vendor/Venue</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-300">Live Turnstile Check-Ins</span>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-white/5 text-xs text-slate-400">
              No recent gate check-ins logged.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.Id}
                className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gate Check-In Approved</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.CheckedInAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  Reg ID: {log.RegistrationId} · Method: {log.Method || 'QR'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
