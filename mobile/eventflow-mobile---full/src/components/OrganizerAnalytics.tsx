import React, { useState, useEffect } from 'react';
import {
  fetchOrganizerAnalytics,
  simulateRealtimeCheckIn,
  OrganizerAnalytics as AnalyticsData,
  formatLKR,
  supabase,
} from '../lib/supabase';
import { EventItem } from '../lib/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Ticket,
  Clock,
  RefreshCw,
  QrCode,
  Sparkles,
  DollarSign,
  ChevronDown,
  Activity,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrganizerAnalyticsProps {
  events: EventItem[];
  onOpenScanner?: () => void;
  onOpenAddStory?: () => void;
}

export const OrganizerAnalytics: React.FC<OrganizerAnalyticsProps> = ({
  events,
  onOpenScanner,
  onOpenAddStory,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | 'today' | '30d'>('7d');

  const loadAnalytics = async () => {
    try {
      const data = await fetchOrganizerAnalytics(selectedEventId);
      setAnalytics(data);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    // Supabase Real-Time Channel for instant gate check-ins and registrations
    const channel = supabase
      .channel('organizer-realtime-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Registrations' },
        () => {
          loadAnalytics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'CheckIns' },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEventId]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleSimulateCheckIn = async () => {
    setIsSimulating(true);
    const ok = await simulateRealtimeCheckIn();
    if (ok) {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
      await loadAnalytics();
    }
    setIsSimulating(false);
  };

  // Custom dark-mode tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-xs">
          <p className="font-bold text-white mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 text-[11px] my-0.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-slate-400 capitalize">{entry.name}:</span>
              <span className="font-extrabold text-white">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !analytics) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading organizer analytics from Supabase...</p>
      </div>
    );
  }

  const data = analytics!;

  return (
    <div className="p-4 space-y-4 select-none pb-20">
      {/* Top Header & Event Filter */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Organizer Dashboard</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time registrations &amp; gate check-in analytics
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 bg-slate-900 border border-white/10 hover:border-blue-500/50 rounded-xl text-slate-300 hover:text-white transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Event Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="all">📊 All Events Combined</option>
            {events.map((ev) => (
              <option key={ev.Id} value={ev.Id}>
                🎟️ {ev.Title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Organizer Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            className="p-3 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 hover:border-blue-400 rounded-2xl flex items-center gap-2.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Open Gate Scanner</div>
              <div className="text-[10px] text-slate-400 truncate">Scan attendee QR pass</div>
            </div>
          </button>
        )}

        {onOpenAddStory && (
          <button
            onClick={onOpenAddStory}
            className="p-3 bg-gradient-to-r from-amber-600/20 to-rose-600/20 border border-amber-500/40 hover:border-amber-400 rounded-2xl flex items-center gap-2.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Post Live Story</div>
              <div className="text-[10px] text-slate-400 truncate">Share backstage update</div>
            </div>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Registrations */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Total Passes</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {data.totalRegistrations.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3 h-3" />
            <span>+14% this week</span>
          </div>
        </div>

        {/* Gate Check-Ins */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Gate Check-Ins</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {data.totalCheckedIn.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-400 font-semibold">
            {data.attendanceRate}% Attendance Rate
          </div>
        </div>

        {/* Revenue */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Pass Revenue</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base font-extrabold text-amber-300 truncate">
            {formatLKR(data.totalRevenue)}
          </div>
          <div className="text-[10px] text-slate-400">Verified sales</div>
        </div>

        {/* Remaining Expected */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Pending Entry</span>
            <Clock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {Math.max(0, data.totalRegistrations - data.totalCheckedIn).toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-400 font-semibold">Remaining attendees</div>
        </div>
      </div>

      {/* CHART 1: Real-Time Event Registration Trends (AreaChart) */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Registration &amp; Check-In Trends
            </h3>
            <p className="text-[10px] text-slate-400">7-Day cumulative velocity</p>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span className="flex items-center gap-1 text-blue-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Booked
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Checked In
            </span>
          </div>
        </div>

        <div className="h-48 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.registrationTrends}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCheckIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="registrations"
                name="Registrations"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRegs)"
              />
              <Area
                type="monotone"
                dataKey="checkedIn"
                name="Checked In"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCheckIn)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: Gate Check-In Velocity by Hour (BarChart) */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Hourly Gate Check-In Velocity
            </h3>
            <p className="text-[10px] text-slate-400">Arrivals vs. Expected through turnstiles</p>
          </div>
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.hourlyCheckIns}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="checkedIn"
                name="Checked In"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expected"
                name="Expected"
                fill="#334155"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 3: Ticket Tier Distribution (PieChart) */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl space-y-3">
        <div>
          <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-purple-400" />
            Pass Tier Distribution
          </h3>
          <p className="text-[10px] text-slate-400">Share of registrations by ticket category</p>
        </div>

        <div className="h-40 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.tierBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {data.tierBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
          {data.tierBreakdown.map((tier, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                <span className="text-slate-300 truncate">{tier.name}</span>
              </div>
              <span className="font-extrabold text-white ml-2">{tier.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Live Realtime Check-in Button */}
      <div className="p-3.5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Test Real-Time Chart Update:
          </span>
          <span className="text-[10px] text-slate-400">Supabase Sync</span>
        </div>
        <button
          onClick={handleSimulateCheckIn}
          disabled={isSimulating}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
        >
          {isSimulating ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>Add Test Gate Check-In</span>
        </button>
      </div>

      {/* Recent Gate Scan Activity Feed */}
      <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Recent Gate Check-In Stream
          </h3>
          <span className="text-[10px] text-slate-400">Live feed</span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          {data.recentActivity.map((act) => (
            <div
              key={act.id}
              className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-white text-[11px] truncate">
                    {act.attendeeName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {act.eventName} · {act.ticketType}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-slate-400 shrink-0 ml-2">
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
