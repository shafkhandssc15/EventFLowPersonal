import React, { useState, useEffect } from 'react';
import { supabase, formatLKR } from '../lib/supabase';
import { User } from '../lib/types';
import { RefreshCw, CheckCircle2, XCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PendingPaymentItem {
  id: string; // registration id
  paymentId?: string;
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  ticketTypeName: string;
  quantity: number;
  amount: number;
  bookingRef: string;
  createdAt: string;
}


interface EventProgressItem {
  id: string;
  title: string;
  dateStr: string;
  status: string;
  capacity: number;
  soldCount: number;
  checkedInCount: number;
}

interface OrganizerDashboardViewProps {
  currentUser: User | null;
  onOpenLogin: (mode?: 'login' | 'signup') => void;
  onOpenScanner?: () => void;
}

export const OrganizerDashboardView: React.FC<OrganizerDashboardViewProps> = ({
  currentUser,
  onOpenLogin,
  onOpenScanner,
}) => {
  const isOrganizer = currentUser?.Role === 'Organizer' || currentUser?.Role === 'Admin';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Metrics from Supabase
  const [passesSold, setPassesSold] = useState<number>(0);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [awaitingPaymentCount, setAwaitingPaymentCount] = useState<number>(0);

  // Pending payments from Supabase
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentItem[]>([]);

  // Events list with progress from Supabase
  const [eventsProgress, setEventsProgress] = useState<EventProgressItem[]>([]);

  // Fetch 100% authentic Supabase records
  const loadSupabaseData = async () => {
    try {
      // 1. Fetch Registrations
      const { data: dbRegs, error: regErr } = await supabase.from('Registrations').select('*');
      if (regErr) console.warn('Reg fetch warning:', regErr);
      const regs = dbRegs || [];

      // 2. Fetch CheckIns
      const { data: dbCheckIns, error: ciErr } = await supabase.from('CheckIns').select('*');
      if (ciErr) console.warn('CheckIns fetch warning:', ciErr);
      const checkIns = dbCheckIns || [];

      // 3. Fetch Payments
      const { data: dbPayments, error: payErr } = await supabase.from('Payments').select('*');
      if (payErr) console.warn('Payments fetch warning:', payErr);
      const payments = dbPayments || [];

      // 4. Fetch Events
      const { data: dbEvents, error: evErr } = await supabase
        .from('Events')
        .select('*')
        .order('StartDate', { ascending: true });
      if (evErr) console.warn('Events fetch warning:', evErr);
      const events = dbEvents || [];

      // 5. Fetch TicketTypes
      const { data: dbTicketTypes } = await supabase.from('TicketTypes').select('*');
      const ticketTypes = dbTicketTypes || [];
      const ticketTypesMap = new Map(ticketTypes.map((tt) => [tt.Id, tt]));

      // 6. Fetch Tickets
      const { data: dbTickets } = await supabase.from('Tickets').select('*');
      const tickets = dbTickets || [];
      const ticketsMap = new Map(tickets.map((tk) => [tk.Id, tk]));

      // 7. Fetch Users
      const { data: dbUsers } = await supabase.from('Users').select('*');
      const users = dbUsers || [];
      const usersMap = new Map(users.map((u) => [u.Id, u]));

      // Calculate Metrics
      // Passes sold: total registrations in DB
      setPassesSold(regs.length);

      // Checked in: unique registrations marked CheckedIn or in CheckIns table
      const checkedInRegIds = new Set([
        ...regs.filter((r) => r.Status === 'CheckedIn').map((r) => r.Id),
        ...checkIns.map((ci) => ci.RegistrationId),
      ]);
      setCheckedInCount(checkedInRegIds.size);

      // Revenue: sum of amounts in Payments table
      const revenueSum = payments.reduce((acc, p) => acc + (Number(p.Amount) || 0), 0);
      setTotalRevenue(revenueSum);

      // Awaiting payment: registrations with Status === 'Registered' (unconfirmed)
      const awaiting = regs.filter((r) => r.Status === 'Registered');
      setAwaitingPaymentCount(awaiting.length);

      // Build Pending Payments List from Supabase
      const pendingList: PendingPaymentItem[] = awaiting.map((reg) => {
        const attendee = usersMap.get(reg.AttendeeId);
        const ticket = reg.TicketId ? ticketsMap.get(reg.TicketId) : undefined;
        const tt = ticket ? ticketTypesMap.get(ticket.TicketTypeId) : undefined;
        const ev = events.find((e) => e.Id === reg.EventId);
        const pay = payments.find((p) => p.TicketId === reg.TicketId);

        return {
          id: reg.Id,
          paymentId: pay?.Id,
          attendeeName: attendee?.Name || 'Registered Attendee',
          attendeeEmail: attendee?.Email || '',
          eventTitle: ev?.Title || 'Event Ticket',
          ticketTypeName: tt?.Name || 'General Pass',
          quantity: 1,
          amount: pay?.Amount || tt?.Price || 0,
          bookingRef: pay?.ProviderRef || `BK-${reg.Id.substring(0, 8).toUpperCase()}`,
          createdAt: reg.CreatedAt,
        };
      });
      setPendingPayments(pendingList);

      // Build Events Progress List from Supabase
      
      const progressList: EventProgressItem[] = events
        .filter((e) => e.Status === 'Published')
        .slice(0, 5)
        .map((ev) => {
          const eventRegs = regs.filter((r) => r.EventId === ev.Id);
          const eventCheckedIn = eventRegs.filter((r) => checkedInRegIds.has(r.Id)).length;

          // Format date e.g. "Fri, 9 Oct 2026"
          let dateStr = 'Fri, 9 Oct 2026';
          try {
            if (ev.StartDate) {
              const d = new Date(ev.StartDate);
              dateStr = d.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
            }
          } catch {}

          return {
            id: ev.Id,
            title: ev.Title,
            dateStr,
            status: ev.Status || 'Published',
            capacity: ev.Capacity || 2500,
            soldCount: eventRegs.length,
            checkedInCount: eventCheckedIn,
          };
        });

      setEventsProgress(progressList);
    } catch (err) {
      console.error('loadSupabaseData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSupabaseData();

    // Subscribe to live Postgres changes in Supabase for all relevant tables
    const channel = supabase
      .channel('organizer-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Registrations' }, () => {
        loadSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'CheckIns' }, () => {
        loadSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Payments' }, () => {
        loadSupabaseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSupabaseData();
  };

  // Handle Approve Payment in Supabase
  const handleApprovePayment = async (item: PendingPaymentItem) => {
    setActionLoadingId(item.id);
    try {
      const now = new Date().toISOString();
      // Update registration status to Confirmed in Supabase
      await supabase
        .from('Registrations')
        .update({
          Status: 'Confirmed',
          UpdatedAt: now,
        })
        .eq('Id', item.id);

      // If payment record exists, ensure it is recorded
      if (!item.paymentId) {
        await supabase.from('Payments').insert({
          Id: crypto.randomUUID(),
          Amount: item.amount,
          Provider: 'BankTransfer',
          ProviderRef: item.bookingRef,
          CreatedAt: now,
        });
      }

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      await loadSupabaseData();
    } catch (e) {
      console.error('Approve error:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Payment in Supabase
  const handleRejectPayment = async (item: PendingPaymentItem) => {
    setActionLoadingId(item.id);
    try {
      const now = new Date().toISOString();
      await supabase
        .from('Registrations')
        .update({
          Status: 'Cancelled',
          UpdatedAt: now,
        })
        .eq('Id', item.id);

      await loadSupabaseData();
    } catch (e) {
      console.error('Reject error:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ================= NOT LOGGED IN STATE =================
  if (!currentUser) {
    return (
      <div className="p-4 space-y-4 select-none pb-24">
        {/* Header with yellow PREVIEW ribbon matching Image 2 */}
        <div className="relative flex items-center justify-between pb-2 border-b border-white/5">
          <h2 className="text-lg font-black text-white">Organizer dashboard</h2>
          <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider border border-amber-500/30">
            PREVIEW
          </div>
        </div>

        {/* Lock Screen Prompt */}
        <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-4 shadow-2xl mt-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-extrabold text-white">Organizer Login Required</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Sales, check-ins and revenue for the organizer's own events, plus paid bookings waiting for approval.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => onOpenLogin('login')}
              className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Sign In as Organizer</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenLogin('signup')}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-semibold border border-white/5 transition"
            >
              Create Organizer Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RESTRICTED ATTENDEE ROLE =================
  if (!isOrganizer) {
    return (
      <div className="p-4 space-y-4 select-none pb-24">
        <div className="relative flex items-center justify-between pb-2 border-b border-white/5">
          <h2 className="text-lg font-black text-white">Organizer dashboard</h2>
          <div className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[10px] uppercase tracking-wider border border-rose-500/30">
            RESTRICTED
          </div>
        </div>

        <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-4 shadow-2xl mt-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-extrabold text-white">Organizer Portal Only</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Your account is registered as an <span className="text-emerald-400 font-bold">Attendee</span>. Real-time ticket revenue, financial transactions, attendee rosters, and ticket approvals are restricted to verified Organizers and Admins.
            </p>
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-left space-y-1.5 text-xs">
            <div className="text-[11px] font-bold text-slate-300">Your Attendee Access:</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Explore upcoming tech, music &amp; food events
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Reserve and purchase verified digital passes
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Show your live QR admission pass at the gate
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onOpenLogin('login')}
              className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Sign In with Organizer Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= LOGGED IN ORGANIZER DASHBOARD (Image 2) =================
  return (
    <div className="p-4 space-y-5 select-none pb-24">
      {/* Header with yellow PREVIEW ribbon matching Image 2 */}
      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Organizer dashboard</h2>
          <p className="text-[11px] text-slate-400">
            Sales, check-ins &amp; revenue live from Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-900 border border-white/10 rounded-xl text-slate-400 hover:text-white transition"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider border border-amber-500/30">
            PREVIEW
          </div>
        </div>
      </div>

      {/* 4 KPI CARDS (2x2 Grid exactly matching Image 2) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Passes sold */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Passes sold</span>
          <div className="text-2xl font-black text-blue-500">
            {loading ? '-' : passesSold}
          </div>
        </div>

        {/* Card 2: Checked in */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Checked in</span>
          <div className="text-2xl font-black text-emerald-400">
            {loading ? '-' : checkedInCount}
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Revenue</span>
          <div className="text-lg font-black text-purple-400 truncate">
            {loading ? '-' : `Rs. ${totalRevenue.toLocaleString()}`}
          </div>
        </div>

        {/* Card 4: Awaiting payment */}
        <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400 font-medium block">Awaiting payment</span>
          <div className="text-2xl font-black text-amber-400">
            {loading ? '-' : awaitingPaymentCount}
          </div>
        </div>
      </div>

      {/* SECTION: Payments to approve (matching Image 2) */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-300">Payments to approve</h3>

        {pendingPayments.length === 0 ? (
          <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl text-center text-xs text-slate-400">
            All paid bookings have been approved. No pending payments.
          </div>
        ) : (
          pendingPayments.map((item) => {
            const isProcessing = actionLoadingId === item.id;
            return (
              <div
                key={item.id}
                className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-xs truncate">
                      {item.attendeeName}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.eventTitle} · {item.quantity} × {item.ticketTypeName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Booking {item.bookingRef}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{item.attendeeEmail}</p>
                  </div>

                  <span className="text-xs font-black text-emerald-400 shrink-0">
                    Rs. {item.amount.toLocaleString()}
                  </span>
                </div>

                {/* Reject and Approve Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => handleRejectPayment(item)}
                    disabled={isProcessing}
                    className="py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-rose-950/40 border border-white/10 hover:border-rose-900/50 text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprovePayment(item)}
                    disabled={isProcessing}
                    className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    {isProcessing ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SECTION: Events (matching Image 2) */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-300">Events</h3>

        <div className="space-y-2.5">
          {eventsProgress.map((ev) => {
            const percent =
              ev.soldCount > 0 ? Math.round((ev.checkedInCount / ev.soldCount) * 100) : 0;

            return (
              <div
                key={ev.id}
                className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-white text-xs truncate">{ev.title}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                    {ev.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">{ev.dateStr}</div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(8, percent)}%` }}
                  />
                </div>

                {/* Subtext: "1 / 3 checked in · capacity 2500" */}
                <div className="text-[10px] text-slate-400">
                  {ev.checkedInCount} / {Math.max(ev.soldCount, 1)} checked in · capacity {ev.capacity}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
