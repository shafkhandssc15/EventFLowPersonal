import React, { useState, useEffect } from 'react';
import { User, EventItem, Registration, TicketType, UserRole } from '../lib/types';
import {
  supabase,
  fetchEvents,
  fetchUserRegistrations,
  bookTicket,
  formatLKR,
  formatEventDate,
  checkInTicket,
} from '../lib/supabase';
import { EVENT_PHOTOS, StoryHighlight } from '../lib/eventImages';
import { TicketQrModal } from './TicketQrModal';
import { QrScannerModal } from './QrScannerModal';
import { StoryViewerModal } from './StoryViewerModal';
import { AddHighlightModal } from './AddHighlightModal';
import { OrganizerDashboardView } from './OrganizerDashboardView';
import { OrganizerAnalytics } from './OrganizerAnalytics';
import { VenueVendorPortal } from './VenueVendorPortal';
import { AdminDashboardView } from './AdminDashboardView';
import { useTouchDragScroll } from '../lib/useTouchDragScroll';
import { AgentTask, runAgentWorkflow } from '../lib/gemini';
import {
  Compass,
  LayoutGrid,
  Ticket,
  QrCode,
  User as UserIcon,
  BarChart3,
  Search,
  Calendar,
  MapPin,
  Users,
  Building2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Bookmark,
  Share2,
  Sparkles,
  Plus,
  Minus,
  RefreshCw,
  LogOut,
  Camera,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  X,
  Heart,
  Shield,
  Wrench,
  Globe,
  Cpu,
  Send,
  Download,
  Terminal,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type AppTab =
  | 'explore'
  | 'passes'
  | 'agent'
  | 'organizer'
  | 'dashboard'
  | 'scan'
  | 'analytics'
  | 'venues'
  | 'services'
  | 'admin-overview'
  | 'admin-users'
  | 'admin-events'
  | 'profile';

interface MobileAppProps {
  currentUser: User | null;
  onOpenLogin: (mode?: 'login' | 'signup') => void;
  onLogout: () => void;
  onSwitchUser?: (user: User) => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onSwitchUser,
}) => {
  const isOrganizer = currentUser?.Role === 'Organizer' || currentUser?.Role === 'Admin';
  const isAdmin = currentUser?.Role === 'Admin';
  const isVendorPartner = currentUser?.Role === 'VendorVenueManager';

  // Determine initial tab based on role
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (currentUser?.Role === 'Admin') return 'admin-overview';
    if (currentUser?.Role === 'Organizer') return 'organizer';
    if (currentUser?.Role === 'VendorVenueManager') return 'venues';
    return 'explore';
  });

  const [events, setEvents] = useState<EventItem[]>([]);
  const [passes, setPasses] = useState<Registration[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedEventIds, setSavedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ef_saved_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Social likes
  const [likedEventIds, setLikedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ef_liked_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const mainViewportRef = useTouchDragScroll<HTMLDivElement>();

  // RBAC Restriction Modal State
  const [restrictionNotice, setRestrictionNotice] = useState<{
    title: string;
    message: string;
    requiredRole: string;
  } | null>(null);

  // Stories & Highlights - populated dynamically from live Supabase events
  const [stories, setStories] = useState<StoryHighlight[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [addHighlightOpen, setAddHighlightOpen] = useState(false);

  // Booking Bottom Sheet
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedTier, setSelectedTier] = useState<TicketType | null>(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  // Pass details QR modal
  const [viewingPass, setViewingPass] = useState<Registration | null>(null);

  // Gate Scanner modal
  const [scannerOpen, setScannerOpen] = useState(false);

  // Meaningful device feature: Date & Time selector filter
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Agentic task submission, recommendation display & workflow status
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentHistory, setAgentHistory] = useState<AgentTask[]>([
    {
      id: 'task-initial',
      objective: 'Optimize gate check-in throughput at BMICH for 2,500 attendees',
      status: 'Completed',
      currentStep: 'Plan Finalized',
      steps: [
        { name: '1. Venue Telemetry & Space Audit', status: 'done', output: 'Analyzed capacity, gate lanes, and egress.' },
        { name: '2. Capacity & Arrival Modeling', status: 'done', output: 'Calculated 0.4s throughput target per scanner turnstile.' },
        { name: '3. Recommendation Synthesis', status: 'done', output: 'Generated operational fast-lane deployment.' },
      ],
      recommendations: [
        'Deploy 4 dedicated QR mobile scanner gates at Hall A entrance to eliminate bottlenecks.',
        'Pre-cache offline attendee tokens on mobile scanners to maintain 0.4s scan speed during peak arrival.',
        'Issue digital attendee badges automatically upon gate verification.',
      ],
      createdAt: new Date().toISOString(),
    },
  ]);

  const handleRunAgent = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const query = preset || agentPrompt.trim();
    if (!query || agentRunning) return;

    setAgentRunning(true);
    if (!preset) setAgentPrompt('');

    try {
      const eventsSummary = events
        .map((ev) => `- ${ev.Title} (${ev.Category || 'General'}, ${ev.Location || 'Colombo'})`)
        .join('\n');
      const task = await runAgentWorkflow(query, eventsSummary);
      setAgentHistory((prev) => [task, ...prev]);
    } catch (err) {
      console.error('Agent workflow error:', err);
    } finally {
      setAgentRunning(false);
    }
  };

  // Sync role view when user signs in or changes
  useEffect(() => {
    if (currentUser?.Role === 'Admin') {
      setActiveTab('admin-overview');
    } else if (currentUser?.Role === 'Organizer') {
      setActiveTab('organizer');
    } else if (currentUser?.Role === 'VendorVenueManager') {
      setActiveTab('venues');
    } else {
      setActiveTab('explore');
    }
  }, [currentUser?.Role, currentUser?.Id]);

  const categories = ['All', 'Venues', 'Technology', 'Music', 'Food', 'Sports', 'Art'];

  const loadEventsData = async () => {
    setLoadingEvents(true);
    try {
      const data = await fetchEvents();
      setEvents(data);
      if (data && data.length > 0) {
        const liveStories: StoryHighlight[] = data.map((ev, idx) => ({
          id: `story-db-${ev.Id}`,
          title: ev.Title.split(' ').slice(0, 2).join(' '),
          subtitle: ev.Category || 'Live Event',
          avatar: EVENT_PHOTOS[ev.Id] || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=200&q=80',
          image: EVENT_PHOTOS[ev.Id] || 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1080&q=85',
          location: ev.Location || 'Colombo, Sri Lanka',
          badge: idx === 0 ? 'Featured' : 'Live Event',
          eventId: ev.Id,
        }));
        setStories(liveStories);
      }
    } catch (e) {
      console.error('Error fetching events:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadPassesData = async () => {
    setLoadingPasses(true);
    try {
      const data = await fetchUserRegistrations(currentUser ? currentUser.Id : undefined);
      setPasses(data);
    } catch (e) {
      console.error('Error fetching user passes:', e);
    } finally {
      setLoadingPasses(false);
    }
  };

  useEffect(() => {
    loadEventsData();
    loadPassesData();
  }, []);

  useEffect(() => {
    loadPassesData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedEvent && selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0) {
      setSelectedTier(selectedEvent.ticketTypes[0]);
      setBookingQty(1);
    }
  }, [selectedEvent]);

  const handleBookTicket = async () => {
    if (!currentUser) {
      onOpenLogin('login');
      return;
    }
    if (!selectedEvent || !selectedTier) return;

    setIsBooking(true);
    try {
      await bookTicket({
        eventId: selectedEvent.Id,
        ticketTypeId: selectedTier.Id,
        attendeeId: currentUser.Id,
        quantity: bookingQty,
      });

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });

      await Promise.all([loadPassesData(), loadEventsData()]);
      setSelectedEvent(null);
      setActiveTab('passes');
    } catch (err: any) {
      alert('Registration notice: ' + (err.message || 'Please try again'));
    } finally {
      setIsBooking(false);
    }
  };

  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleShare = (ev: EventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: ev.Title,
        text: `Check out ${ev.Title} on EventFlow!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/events/${ev.Id}`);
      alert('Link copied to clipboard!');
    }
  };

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedEventIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('ef_liked_events', JSON.stringify(next));
      } catch {}
      return next;
    });
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
  };

  const filteredEvents = events.filter((ev) => {
    const matchesCat =
      selectedCategory === 'All' || ev.Category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      ev.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.Location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !selectedDate || (ev.StartDate && ev.StartDate.startsWith(selectedDate));
    return matchesCat && matchesSearch && matchesDate;
  });

  return (
    <div className="w-full h-full flex flex-col bg-black text-white overflow-hidden relative select-none font-sans">
      {/* Top Mobile Bar (Instagram/Snapchat inspired) */}
      <div className="px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20">
            EF
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">
              EventFlow
            </h1>
            <span className="text-[10px] text-blue-400 font-semibold tracking-wide">
              {currentUser?.Role === 'Admin'
                ? 'Admin'
                : currentUser?.Role === 'Organizer'
                ? 'Organizer'
                : currentUser?.Role === 'VendorVenueManager'
                ? 'Venue Partner'
                : 'Colombo'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-1.5 p-1 pl-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-full text-xs transition"
            >
              <span className="font-semibold text-white text-[11px] truncate max-w-[90px]">
                {currentUser.Name.split(' ')[0]}
              </span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentUser.Role === 'Admin'
                    ? 'bg-gradient-to-tr from-rose-500 to-amber-600 text-white'
                    : currentUser.Role === 'Organizer'
                    ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white'
                    : currentUser.Role === 'VendorVenueManager'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white'
                }`}
              >
                {currentUser.Name.charAt(0)}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenLogin('login')}
                className="px-3 py-1 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenLogin('signup')}
                className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow-md"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Viewport with Touch/Mouse Momentum Drag Scrolling and Zero Scrollbars */}
      <div
        ref={mainViewportRef}
        className="flex-1 overflow-y-auto pb-20 no-scrollbar touch-pan-y overscroll-contain select-none cursor-grab active:cursor-grabbing"
      >
        {/* ================= TAB 1: EXPLORE / DISCOVERY ================= */}
        {activeTab === 'explore' && (
          <div className="space-y-4">
            {/* Instagram / Snapchat Style Stories Highlights Bar */}
            <div className="pt-2 px-3 border-b border-white/5 pb-3">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                  Venues &amp; Spotlights
                </span>
                <span className="text-[10px] text-blue-400 font-semibold">24h Highlights</span>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {/* Organizer '+' Add Story Highlight Bubble */}
                {isOrganizer && (
                  <button
                    onClick={() => setAddHighlightOpen(true)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                    title="Add Event Highlight Story"
                  >
                    <div className="relative w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 group-hover:scale-105 transition-transform duration-200">
                      <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center border border-white/10">
                        <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center">
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-black flex items-center justify-center text-white">
                        <Sparkles className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 truncate max-w-[68px] text-center leading-tight">
                      + Story
                    </span>
                  </button>
                )}

                {/* Published Stories Feed */}
                {stories.map((story, idx) => (
                  <button
                    key={story.id}
                    onClick={() => setActiveStoryIndex(idx)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                  >
                    <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 group-hover:scale-105 transition-transform duration-200">
                      <div className="w-full h-full rounded-full overflow-hidden bg-black p-[2px]">
                        <img
                          src={story.avatar}
                          alt={story.title}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-300 truncate max-w-[68px] text-center leading-tight">
                      {story.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search summits, artists, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner"
                />
              </div>
            </div>

            {/* Category Filter Chips & Meaningful Device Feature: Date/Time Selection */}
            <div className="px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat === 'Venues') {
                      setActiveTab('venues');
                    } else {
                      setSelectedCategory(cat);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition font-semibold text-[11px] ${
                    selectedCategory === cat && activeTab === 'explore'
                      ? 'bg-white text-black shadow-md'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat === 'Venues' ? '🏛️ Venues' : cat}
                </button>
              ))}

              {/* Date Filter (Device Feature: Date/Time selection) */}
              <div className="flex items-center gap-1 bg-slate-900/90 border border-white/10 rounded-full px-2.5 py-1 shrink-0">
                <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-300 focus:outline-none"
                  title="Filter events by date"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
                    title="Clear date filter"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Events Feed */}
            <div className="px-4 space-y-4">
              {loadingEvents ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
                  Fetching live summits from Supabase...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  No events found in this category.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const photo =
                    EVENT_PHOTOS[ev.Id] ||
                    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80';
                  const lowestPrice =
                    ev.ticketTypes && ev.ticketTypes.length > 0
                      ? Math.min(...ev.ticketTypes.map((t) => t.Price))
                      : 0;
                  const isSaved = savedEventIds.includes(ev.Id);

                  return (
                    <div
                      key={ev.Id}
                      onClick={() => setSelectedEvent(ev)}
                      className="bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl active:scale-[0.99] transition duration-200 cursor-pointer flex flex-col group"
                    >
                      {/* Photo Banner with Gradient Overlay */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                        <img
                          src={photo}
                          alt={ev.Title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-blue-300 uppercase tracking-wider border border-white/10">
                            {ev.Category || 'General'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleShare(ev, e)}
                              className="p-2 bg-black/60 backdrop-blur-md text-white/80 hover:text-white rounded-full border border-white/10 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleToggleBookmark(ev.Id, e)}
                              className={`p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition ${
                                isSaved ? 'text-blue-400' : 'text-white/80 hover:text-white'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Photo Info */}
                        <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            {formatEventDate(ev.StartDate)}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40">
                            {formatLKR(lowestPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-extrabold text-white text-base leading-snug group-hover:text-blue-400 transition-colors">
                          {ev.Title}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {ev.Description}
                        </p>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">{ev.Location || 'Colombo, Sri Lanka'}</span>
                          </div>

                          <span className="text-blue-400 font-bold flex items-center gap-0.5">
                            Get Ticket
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MY PASSES (WALLET) ================= */}
        {activeTab === 'passes' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">My Tickets</h2>
                <p className="text-xs text-slate-400">Passes for your upcoming events</p>
              </div>
              <button
                onClick={loadPassesData}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {!currentUser ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-white/10 space-y-3">
                <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="font-bold text-white text-sm">Sign In to See Your Tickets</h3>
                <p className="text-xs text-slate-400">
                  Access your event tickets, entry QR codes, and seat details.
                </p>
                <button
                  onClick={() => onOpenLogin('login')}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs font-bold shadow-lg"
                >
                  Sign In
                </button>
              </div>
            ) : loadingPasses ? (
              <div className="py-20 text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading your passes from database...
              </div>
            ) : passes.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-white/10 space-y-3">
                <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="font-bold text-white text-sm">Your Wallet is Empty</h3>
                <p className="text-xs text-slate-400">
                  You haven't reserved any passes yet. Explore upcoming summits to get yours!
                </p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-xs font-bold"
                >
                  Explore Summits
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {passes.map((pass) => {
                  const isCheckedIn = pass.Status === 'CheckedIn';
                  return (
                    <div
                      key={pass.Id}
                      onClick={() => setViewingPass(pass)}
                      className={`p-4 rounded-3xl border transition shadow-xl cursor-pointer active:scale-[0.98] ${
                        isCheckedIn
                          ? 'bg-gradient-to-br from-slate-900 to-blue-950/40 border-blue-500/30'
                          : 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isCheckedIn
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isCheckedIn ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Used
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" /> Ready for Entrance
                            </>
                          )}
                        </span>

                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                          <QrCode className="w-4 h-4" />
                        </div>
                      </div>

                      <h3 className="font-extrabold text-white text-sm mb-1">
                        {pass.event?.Title || 'Event Ticket'}
                      </h3>

                      <div className="text-[11px] text-slate-400 space-y-0.5 mb-3">
                        <div>{formatEventDate(pass.event?.StartDate)}</div>
                        <div className="truncate">{pass.event?.Location || 'Colombo, Sri Lanka'}</div>
                      </div>

                      <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">PASS</span>
                          <span className="text-white font-bold">{pass.ticketType?.Name || 'General Pass'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">TICKET NO</span>
                          <span className="text-blue-400 truncate max-w-[120px] block">
                            {pass.ticket?.QrCode ? pass.ticket.QrCode.substring(0, 14) + '...' : pass.Id.substring(0, 8)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-blue-400 font-bold">
                        <span>Tap to show ticket QR code</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: ORGANIZER DASHBOARD (Image 2) ================= */}
        {activeTab === 'dashboard' && (
          <OrganizerDashboardView
            currentUser={currentUser}
            onOpenLogin={onOpenLogin}
            onOpenScanner={() => setScannerOpen(true)}
          />
        )}

        {/* ================= TAB 3: GATE SCANNER (Image 1) - ORGANIZER ONLY ================= */}
        {activeTab === 'scan' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h2 className="text-lg font-black text-white">Gate scanner</h2>
                <p className="text-xs text-slate-400">
                  Scan attendee tickets to verify entrance &amp; mark as used
                </p>
              </div>
              <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider border border-amber-500/30">
                ORGANIZER ONLY
              </div>
            </div>

            {!isOrganizer ? (
              /* RESTRICTED: Attendee or Guest */
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-4 shadow-2xl mt-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                  <ShieldAlert className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Organizer Access Restricted
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {currentUser
                      ? `Your account is registered as an Attendee. Gate ticket scanning and check-in are strictly restricted to Event Organizers and Venue Staff.`
                      : 'Gate ticket scanning and check-in are strictly restricted to Event Organizers and Venue Staff.'}
                  </p>
                </div>

                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-left space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-300">Role Boundary Rules:</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span> <strong className="text-slate-300">Attendees:</strong> Present tickets in "My Passes" wallet
                  </div>
                  <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
                    <span className="font-bold">✕</span> <strong className="text-slate-300">Attendees:</strong> Cannot scan or validate tickets at gates
                  </div>
                  <div className="text-[11px] text-blue-400 flex items-center gap-1.5">
                    <span className="font-bold">✓</span> <strong className="text-slate-300">Organizers:</strong> Gate check-in, real-time rosters &amp; scanners
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
            ) : (
              /* AUTHORIZED: Organizer Gate Scanner View */
              <div className="space-y-4">
                {/* Glowing Blue Viewfinder Preview Card */}
                <div
                  onClick={() => setScannerOpen(true)}
                  className="relative aspect-[4/3] w-full bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center p-6 space-y-3 cursor-pointer group"
                >
                  <div className="w-56 h-40 rounded-3xl border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center p-4 relative group-hover:scale-105 transition-transform">
                    <div className="w-12 h-12 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Launch Gate Scanner</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Real-time QR verification</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setScannerOpen(true);
                    }}
                    className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs shadow-xl transition flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Open Fullscreen Gate Scanner</span>
                  </button>
                </div>

                {/* Gate Admission Overview */}
                <div className="p-4 bg-slate-900/90 rounded-3xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Live Gate Status
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Scanner Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block mb-0.5">CHECKED IN</span>
                      <span className="text-base font-black text-emerald-400">
                        {passes.filter((p) => p.Status === 'CheckedIn').length}
                      </span>
                    </div>
                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block mb-0.5">TOTAL PASSES</span>
                      <span className="text-base font-black text-white">{passes.length}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                    Position attendee digital pass QR codes inside the camera frame for instant entrance validation.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: ORGANIZER EVENTS & DASHBOARD ================= */}
        {(activeTab === 'organizer' || activeTab === 'dashboard') && (
          isOrganizer ? (
            <OrganizerDashboardView
              currentUser={currentUser}
              onOpenLogin={onOpenLogin}
              onOpenScanner={() => setScannerOpen(true)}
            />
          ) : (
            <div className="p-4 space-y-4">
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-4 shadow-2xl mt-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-white">Organizer Only Portal</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Managing events, reviewing attendee payments, and gate controls are strictly restricted to verified Organizers.
                </p>
                <button
                  onClick={() => onOpenLogin('login')}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
                >
                  Sign In as Organizer
                </button>
              </div>
            </div>
          )
        )}

        {/* ================= TAB: ORGANIZER ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          isOrganizer ? (
            <OrganizerAnalytics
              events={events}
              onOpenScanner={() => setScannerOpen(true)}
              onOpenAddStory={() => setAddHighlightOpen(true)}
            />
          ) : (
            <div className="p-4 space-y-4">
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-4 shadow-2xl mt-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-white">Organizer Only Portal</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Real-time ticket sales charts and attendance revenue are strictly restricted to verified Organizers.
                </p>
                <button
                  onClick={() => onOpenLogin('login')}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Sign In as Organizer
                </button>
              </div>
            </div>
          )
        )}

        {/* ================= TAB: ADMIN COMMAND CENTER ================= */}
        {(activeTab === 'admin-overview' || activeTab === 'admin-users' || activeTab === 'admin-events') && (
          isAdmin ? (
            <AdminDashboardView
              currentUser={currentUser}
              onOpenLogin={onOpenLogin}
            />
          ) : (
            <div className="p-4 space-y-4">
              <div className="p-6 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-4 shadow-2xl mt-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-white">Admin Privileges Required</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Platform governance, user management, and security audits are strictly restricted to System Administrators.
                </p>
                <button
                  onClick={() => onOpenLogin('login')}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-xl text-xs font-bold transition shadow-lg"
                >
                  Sign In as Admin
                </button>
              </div>
            </div>
          )
        )}

        {/* ================= TAB: VENUES & LOCATIONS DIRECTORY / PORTAL ================= */}
        {activeTab === 'venues' && (
          <VenueVendorPortal
            currentUser={currentUser}
            onOpenLogin={onOpenLogin}
            onSelectVenue={(v) => {
              setSearchQuery(v.Name);
              setActiveTab('explore');
            }}
          />
        )}

        {/* ================= TAB: AGENTIC WORKFLOWS ================= */}
        {activeTab === 'agent' && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Agentic Workflows</h2>
                  <p className="text-[11px] text-slate-400">
                    Operational task submission, workflow status &amp; recommendation display
                  </p>
                </div>
              </div>
            </div>

            {/* Task Submission Form */}
            <form onSubmit={handleRunAgent} className="p-4 bg-slate-900 border border-white/10 rounded-3xl space-y-3 shadow-xl">
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Submit Operational Objective
                </label>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  Enter an operational target or attendee query to trigger multi-step agentic analysis.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Optimize gate check-in throughput at BMICH..."
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    className="w-full pl-3.5 pr-11 py-2.5 bg-black/60 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={agentRunning || !agentPrompt.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-md transition"
                  >
                    {agentRunning ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Operational Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Operational Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Optimize gate check-in throughput at BMICH for 2,500 attendees',
                    'Model Nelum Pokuna main auditorium arrival velocity and fast-lanes',
                    'Recommend budget technology conferences with student developer pass',
                    'Plan stage AV and audio vendor setup for Colombo music festival',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRunAgent(undefined, preset)}
                      disabled={agentRunning}
                      className="px-2.5 py-1 bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/20 text-slate-300 text-[10px] rounded-full transition text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Workflow Execution & Recommendations Display */}
            <div className="space-y-3">
              {agentHistory.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-slate-900 border border-blue-500/20 rounded-3xl space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-white text-xs truncate">{task.objective}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      {task.status}
                    </span>
                  </div>

                  {/* Multi-Step Workflow Pipeline Status */}
                  <div className="p-3 bg-black/50 rounded-2xl border border-white/5 space-y-2">
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Workflow Execution Pipeline:
                    </div>
                    <div className="space-y-1.5">
                      {task.steps.map((st, sidx) => (
                        <div key={sidx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-white text-[11px] block">{st.name}</span>
                            {st.output && (
                              <span className="text-[10px] text-slate-400 block">{st.output}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Recommendations Display */}
                  {task.recommendations && task.recommendations.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Actionable Recommendations:</span>
                      </div>
                      <div className="space-y-1.5">
                        {task.recommendations.map((rec, ridx) => (
                          <div
                            key={ridx}
                            className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2"
                          >
                            <span className="text-blue-400 font-bold">•</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROFILE & ACCOUNT ================= */}
        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            {currentUser ? (
              <div className="p-5 bg-slate-900 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-xl shadow-blue-500/20">
                    {currentUser.Name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-white text-base truncate">
                      {currentUser.Name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{currentUser.Email}</p>
                    <span className="inline-block mt-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {currentUser.Role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs text-center">
                  <div className="p-2.5 bg-black/40 rounded-2xl">
                    <span className="text-[10px] text-slate-400 block">TICKETS</span>
                    <span className="text-base font-bold text-white">{passes.length}</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-2xl">
                    <span className="text-[10px] text-slate-400 block">SAVED</span>
                    <span className="text-base font-bold text-blue-400">
                      {savedEventIds.length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-900 rounded-3xl border border-white/10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Join EventFlow</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sign in to book passes, scan QR tickets, and run AI event workflows.
                  </p>
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={() => onOpenLogin('login')}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs font-semibold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => onOpenLogin('signup')}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs font-bold shadow-md"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}

            {/* Role Actions */}
            {currentUser?.Role === 'Admin' && (
              <button
                onClick={() => setActiveTab('admin-overview')}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-600/30 to-amber-600/30 border border-rose-500/40 hover:border-rose-400 rounded-2xl text-xs font-bold text-white flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>Admin Command Center</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {currentUser?.Role === 'VendorVenueManager' && (
              <button
                onClick={() => setActiveTab('venues')}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl text-xs font-bold text-white flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Venues &amp; Locations Console</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {isOrganizer && (
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('organizer')}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600/25 to-indigo-600/25 border border-purple-500/30 hover:border-purple-400 rounded-2xl text-xs font-bold text-white flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-purple-400" />
                    <span>Organizer Summits Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('scan');
                    setScannerOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-slate-900 border border-white/10 hover:border-white/20 rounded-2xl text-xs font-bold text-white flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-purple-400" />
                    <span>Launch Gate Scanner</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}

            {/* Quick Agentic Workflows Shortcut */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('agent')}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl text-xs font-bold text-white flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>Agentic Task &amp; Workflow Center</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400" />
              </button>
            </div>

            {/* Saved / Bookmarked Events for Attendee */}
            {savedEventIds.length > 0 && (
              <div className="p-4 bg-slate-900 rounded-3xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                    <span>Saved Events ({savedEventIds.length})</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('explore')}
                    className="text-[10px] text-blue-400 hover:underline font-semibold"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2">
                  {events
                    .filter((ev) => savedEventIds.includes(ev.Id))
                    .slice(0, 3)
                    .map((ev) => (
                      <div
                        key={ev.Id}
                        onClick={() => setSelectedEvent(ev)}
                        className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between gap-2 cursor-pointer hover:border-white/15 transition"
                      >
                        <div className="truncate">
                          <h4 className="font-bold text-white text-xs truncate">{ev.Title}</h4>
                          <span className="text-[10px] text-slate-400">
                            {formatEventDate(ev.StartDate)} · {ev.Location || 'Colombo'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Account Actions */}
            {currentUser && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onOpenLogin('login')}
                  className="w-full py-3 text-center text-slate-300 hover:text-white text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Switch Account</span>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full py-3 text-center text-rose-400 hover:text-rose-300 text-xs font-semibold bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role-Customized Modern Glass Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-2xl border-t border-white/10 px-2 flex items-center justify-around z-30">
        {currentUser?.Role === 'Admin' ? (
          <>
            <button
              onClick={() => setActiveTab('admin-overview')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'admin-overview' ? 'text-rose-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Command</span>
            </button>

            <button
              onClick={() => setActiveTab('admin-users')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'admin-users' ? 'text-rose-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Users</span>
            </button>

            <button
              onClick={() => setActiveTab('explore')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'explore' ? 'text-rose-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Events</span>
            </button>

            <button
              onClick={() => setActiveTab('venues')}
              className={`flex flex-col items-center justify-center py-1 relative transition ${
                activeTab === 'venues' ? 'text-rose-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Venues</span>
            </button>
          </>
        ) : currentUser?.Role === 'Organizer' ? (
          <>
            <button
              onClick={() => setActiveTab('organizer')}
              className={`flex flex-col items-center justify-center py-1 relative transition ${
                activeTab === 'organizer' || activeTab === 'dashboard' ? 'text-purple-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">My Events</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('scan');
                setScannerOpen(true);
              }}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'scan' ? 'text-purple-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Scan Gate</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'analytics' ? 'text-purple-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Analytics</span>
            </button>

            <button
              onClick={() => setAddHighlightOpen(true)}
              className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-purple-400 transition"
              title="Broadcast Live Event Highlight Story"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">+ Story</span>
            </button>
          </>
        ) : currentUser?.Role === 'VendorVenueManager' ? (
          <>
            <button
              onClick={() => setActiveTab('venues')}
              className={`flex flex-col items-center justify-center py-1 relative transition ${
                activeTab === 'venues' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Locations</span>
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>

            <button
              onClick={() => setActiveTab('explore')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'explore' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Explore</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                activeTab === 'explore' ? 'text-blue-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Explore</span>
            </button>

            <button
              onClick={() => setActiveTab('venues')}
              className={`flex flex-col items-center justify-center py-1 relative transition ${
                activeTab === 'venues' ? 'text-blue-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Venues</span>
            </button>

            <button
              onClick={() => setActiveTab('passes')}
              className={`flex flex-col items-center justify-center py-1 relative transition ${
                activeTab === 'passes' ? 'text-blue-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Ticket className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">My Passes</span>
              {passes.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`flex flex-col items-center justify-center py-1 relative transition ${
                activeTab === 'agent' ? 'text-blue-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Agent</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'profile'
              ? currentUser?.Role === 'Admin'
                ? 'text-rose-400 scale-105'
                : currentUser?.Role === 'Organizer'
                ? 'text-purple-400 scale-105'
                : currentUser?.Role === 'VendorVenueManager'
                ? 'text-emerald-400 scale-105'
                : 'text-blue-400 scale-105'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        </button>
      </div>

      {/* ================= MODAL: EVENT DETAIL & BOOKING SHEET ================= */}
      {selectedEvent && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
          <div className="bg-slate-900 border-t border-white/10 rounded-t-[32px] max-h-[85%] flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {selectedEvent.Category}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 no-scrollbar overscroll-contain touch-pan-y">
              <h2 className="text-lg font-black text-white leading-tight">{selectedEvent.Title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedEvent.Description}</p>

              <div className="p-3 bg-black/50 rounded-2xl space-y-1.5 text-xs text-slate-400 border border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>{formatEventDate(selectedEvent.StartDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{selectedEvent.Location || 'Colombo, Sri Lanka'}</span>
                </div>
              </div>

              {/* Ticket Tiers */}
              <div>
                <label className="block text-xs font-bold text-white mb-2">Select Ticket Tier:</label>
                <div className="space-y-2">
                  {selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 ? (
                    selectedEvent.ticketTypes.map((tier) => {
                      const isSelected = selectedTier?.Id === tier.Id;
                      return (
                        <div
                          key={tier.Id}
                          onClick={() => setSelectedTier(tier)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-black/50 border-white/5 text-slate-300 hover:border-white/10'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{tier.Name}</div>
                            <div className="text-[10px] text-slate-500">
                              {tier.Sold} / {tier.Quantity} claimed
                            </div>
                          </div>
                          <div className="text-xs font-bold text-blue-400">{formatLKR(tier.Price)}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-400">General Pass · Free</div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-white/5">
                <span className="text-xs font-semibold text-slate-300">Pass Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBookingQty(Math.max(1, bookingQty - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs">{bookingQty}</span>
                  <button
                    onClick={() => setBookingQty(bookingQty + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Book Action */}
            <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400">Total Price:</span>
                <div className="text-sm font-extrabold text-blue-400">
                  {formatLKR((selectedTier?.Price || 0) * bookingQty)}
                </div>
              </div>

              <button
                onClick={handleBookTicket}
                disabled={isBooking}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-lg transition flex items-center gap-2"
              >
                {isBooking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Ticket className="w-4 h-4" />
                )}
                <span>{isBooking ? 'Generating Pass...' : 'Confirm & Get Pass'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INSTAGRAM STORY VIEWER ================= */}
      {activeStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onSelectEvent={(eventId) => {
            const found = events.find((e) => e.Id === eventId);
            if (found) setSelectedEvent(found);
          }}
        />
      )}

      {/* ================= MODAL: ORGANIZER ADD EVENT HIGHLIGHT ================= */}
      {addHighlightOpen && (
        <AddHighlightModal
          events={events}
          onClose={() => setAddHighlightOpen(false)}
          onAddHighlight={(newHighlight) => {
            setStories((prev) => {
              const updated = [newHighlight, ...prev];
              try {
                const customOnly = updated.filter((s) => s.id.startsWith('story-custom-'));
                localStorage.setItem('ef_custom_stories', JSON.stringify(customOnly));
              } catch {}
              return updated;
            });
            setActiveStoryIndex(0);
          }}
        />
      )}

      {/* ================= MODAL: TICKET QR PASS ================= */}
      {viewingPass && (
        <TicketQrModal
          registration={viewingPass}
          onClose={() => setViewingPass(null)}
          onScanPass={async (code) => {
            const res = await checkInTicket(code);
            if (res.success) {
              setViewingPass((prev) => (prev ? { ...prev, Status: 'CheckedIn' } : null));
              await loadPassesData();
            }
          }}
        />
      )}

      {/* ================= MODAL: GATE QR SCANNER ================= */}
      {scannerOpen && (
        <QrScannerModal
          onClose={() => setScannerOpen(false)}
          activePasses={passes}
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
          onCheckInCompleted={async () => {
            await loadPassesData();
          }}
        />
      )}

      {/* ================= MODAL: ROLE RESTRICTION ALERT ================= */}
      {restrictionNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">
                {restrictionNotice.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {restrictionNotice.message}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setRestrictionNotice(null);
                  onOpenLogin('login');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>Sign In as {restrictionNotice.requiredRole}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setRestrictionNotice(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
