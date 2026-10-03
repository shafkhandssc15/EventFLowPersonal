import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { checkInTicket, ScanResult, Registration, formatLKR, supabase, User } from '../lib/supabase';
import {
  Camera,
  X,
  CheckCircle2,
  Ban,
  RotateCcw,
  Zap,
  ZapOff,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Search,
  Radio,
  Sparkles,
  Copy,
  Check,
  User as UserIcon,
  Ticket,
  QrCode,
  Clock,
  LogOut,
  ListFilter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrganizerScannerTerminalProps {
  currentUser: User | null;
  onLogout: () => void;
  onSwitchPortal?: (role: string) => void;
}

export const OrganizerScannerTerminal: React.FC<OrganizerScannerTerminalProps> = ({
  currentUser,
  onLogout,
  onSwitchPortal,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [totalPassesCount, setTotalPassesCount] = useState<number>(0);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');

  // Live Supabase tickets for quick testing and history
  const [dbTickets, setDbTickets] = useState<any[]>([]);
  const [checkInLogs, setCheckInLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load gate stats and Supabase tickets
  const loadGateStats = async () => {
    setLoadingData(true);
    try {
      // 1. CheckIns count
      const { count: ciCount } = await supabase
        .from('CheckIns')
        .select('Id', { count: 'exact', head: true });
      setCheckedInCount(ciCount || 0);

      // 2. Total Registrations count
      const { count: regCount } = await supabase
        .from('Registrations')
        .select('Id', { count: 'exact', head: true });
      setTotalPassesCount(regCount || 0);

      // 3. Fetch all Tickets + Registrations + Users + TicketTypes for quick testing
      const { data: tickets } = await supabase.from('Tickets').select('*');
      const { data: regs } = await supabase.from('Registrations').select('*');
      const { data: users } = await supabase.from('Users').select('*');
      const { data: ticketTypes } = await supabase.from('TicketTypes').select('*');
      const { data: events } = await supabase.from('Events').select('*');
      const { data: checkIns } = await supabase.from('CheckIns').select('*').order('CheckedInAt', { ascending: false });

      const usersMap = new Map((users || []).map((u) => [u.Id, u]));
      const ttMap = new Map((ticketTypes || []).map((tt) => [tt.Id, tt]));
      const eventsMap = new Map((events || []).map((e) => [e.Id, e]));
      const checkInsMap = new Map((checkIns || []).map((ci) => [ci.RegistrationId, ci]));

      const enrichedTickets = (tickets || []).map((tk) => {
        const reg = (regs || []).find((r) => r.TicketId === tk.Id || r.AttendeeId === tk.AttendeeId);
        const attendee = usersMap.get(tk.AttendeeId);
        const tt = ttMap.get(tk.TicketTypeId);
        const ci = reg ? checkInsMap.get(reg.Id) : undefined;
        const ev = reg ? eventsMap.get(reg.EventId) : undefined;

        return {
          ticket: tk,
          registration: reg,
          attendee,
          ticketType: tt,
          checkIn: ci,
          event: ev,
          isCheckedIn: reg?.Status === 'CheckedIn' || !!ci,
        };
      });

      setDbTickets(enrichedTickets);

      // Build recent check-in logs
      const logs = (checkIns || []).slice(0, 10).map((ci) => {
        const reg = (regs || []).find((r) => r.Id === ci.RegistrationId);
        const tk = reg?.TicketId ? (tickets || []).find((t) => t.Id === reg.TicketId) : undefined;
        const att = reg ? usersMap.get(reg.AttendeeId) : undefined;
        const tt = tk ? ttMap.get(tk.TicketTypeId) : undefined;

        return {
          id: ci.Id,
          attendeeName: att?.Name || 'Attendee',
          attendeeEmail: att?.Email || '',
          ticketTypeName: tt?.Name || 'General Pass',
          checkedInAt: ci.CheckedInAt,
          qrCode: tk?.QrCode || `REG-${ci.RegistrationId.substring(0, 8)}`,
        };
      });

      setCheckInLogs(logs);
    } catch (err) {
      console.warn('Error loading gate data from Supabase:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadGateStats();
  }, []);

  // Audio chimes
  const playSound = (type: 'success' | 'warning' | 'error') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access note:', err.message);
      setCameraError('Camera stream unavailable. You can use the Quick-Scan Simulator or manual code lookup below.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Frame scanner loop
  useEffect(() => {
    if (!cameraActive || isProcessing || lastScanResult) return;

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleProcessCode(code.data);
        return;
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, isProcessing, lastScanResult]);

  // Process QR Code / Ticket Code against Supabase
  const handleProcessCode = async (rawCode: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await checkInTicket(rawCode.trim());
      setLastScanResult(result);

      if (result.success) {
        playSound('success');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } else {
        playSound('warning');
      }

      // Refresh gate counts and logs
      loadGateStats();
    } catch (err: any) {
      playSound('error');
      setLastScanResult({
        success: false,
        message: err.message || 'Verification error with Supabase database',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextScan = () => {
    setLastScanResult(null);
    setManualCode('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
      {/* Organizer Header - Dedicated Gate Scanner Turnstile */}
      <div className="p-4 bg-slate-900 border-b border-purple-500/30 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">Gate scanner</h2>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[9px] uppercase tracking-wider border border-amber-500/30">
                ORGANIZER ONLY
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Station: Turnstile Gate 1 · Live Supabase Sync
            </p>
          </div>
        </div>

        {/* Live Gate Counter Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-full border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-white">{checkedInCount} in</span>
            <span className="text-[10px] text-slate-400">/ {totalPassesCount}</span>
          </div>

          <button
            onClick={loadGateStats}
            disabled={loadingData}
            title="Refresh database records"
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Organizer Purpose Subheader */}
      <div className="px-4 py-2 bg-purple-950/40 border-b border-purple-500/10 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-purple-300">
          <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
          <span>Purpose: <strong>Ticket Scanning &amp; Check-In</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition ${
              activeTab === 'scan' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2.5 py-0.5 rounded-full font-bold transition ${
              activeTab === 'history' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gate Feed ({checkInLogs.length})
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
        {activeTab === 'scan' ? (
          <>
            {/* Viewfinder Card */}
            <div className="relative aspect-[4/3] w-full bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Glowing Corner Frame (Matching Image 1) */}
              <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                </div>
                {/* Center laser line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-xl shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                </div>
              </div>

              {/* Viewfinder Controls: Torch & Camera Flip */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={() => setTorchOn(!torchOn)}
                  className={`p-2 rounded-full backdrop-blur-md transition ${
                    torchOn ? 'bg-amber-500 text-black' : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                  title="Toggle Torch"
                >
                  {torchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white transition"
                  title="Switch Camera"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Camera Fallback / Off State */}
              {!cameraActive && (
                <div className="p-4 text-center space-y-2 z-10 max-w-xs">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-300">
                    {cameraError || 'Camera preview is off. Position pass or use simulator below.'}
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition shadow"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>

            {/* Manual Code Input Bar */}
            <div className="p-3 bg-slate-900 rounded-2xl border border-white/10 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Enter Ticket Code (e.g. EF-TEA-GUEST-55)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.trim()) {
                    handleProcessCode(manualCode.trim());
                  }
                }}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => {
                  if (manualCode.trim()) handleProcessCode(manualCode.trim());
                }}
                disabled={isProcessing || !manualCode.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition"
              >
                Verify
              </button>
            </div>

            {/* Live Supabase Ticket Test Simulator: 100% Real Records */}
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Scan Supabase DB Ticket Directly:
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">100% Real Supabase Data</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {dbTickets.map(({ ticket, registration, attendee, ticketType, isCheckedIn }) => (
                  <div
                    key={ticket.Id}
                    className="p-2.5 bg-black/60 rounded-xl border border-white/5 flex items-center justify-between text-xs hover:border-purple-500/30 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate text-[11px]">
                          {attendee?.Name || 'Registered Attendee'}
                        </span>
                        {isCheckedIn ? (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                            USED
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            VALID
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {ticketType?.Name || 'General Pass'} · {attendee?.Email}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">{ticket.QrCode}</div>
                    </div>

                    <button
                      onClick={() => handleProcessCode(ticket.QrCode)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition shrink-0"
                    >
                      Scan This
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Check-In History / Gate Feed */
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <span className="text-xs font-bold text-white">Recent Turnstile Check-Ins</span>
              <span className="text-[10px] text-slate-400 font-mono">{checkInLogs.length} Records</span>
            </div>

            {checkInLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No check-ins recorded yet at this gate.
              </div>
            ) : (
              checkInLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white text-[11px]">{log.attendeeName}</div>
                    <div className="text-[10px] text-slate-400">{log.ticketTypeName}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{log.qrCode}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Verified
                    </span>
                    <div className="text-[9px] text-slate-500 mt-1">
                      {new Date(log.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Result Sheet (Image 1 Specification) */}
      {lastScanResult && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] animate-slide-up">
          <div className="space-y-4">
            {/* Header: Result Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    lastScanResult.success
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {lastScanResult.success ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <Ban className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      lastScanResult.success
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {lastScanResult.success
                      ? 'CHECKED IN'
                      : lastScanResult.alreadyCheckedIn
                      ? 'ALREADY USED'
                      : 'INVALID PASS'}
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    {lastScanResult.message}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleNextScan}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-black/40 hover:bg-black/60 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Attendee Details Card (All from Supabase) */}
            <div className="p-4 bg-black/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Attendee</span>
                  <div className="font-bold text-white text-sm">
                    {lastScanResult.attendeeName || 'Registered Attendee'}
                  </div>
                  {lastScanResult.attendeeEmail && (
                    <div className="text-[11px] text-slate-400">{lastScanResult.attendeeEmail}</div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pass Type</span>
                  <div className="font-bold text-purple-300 text-xs">
                    {lastScanResult.ticketTypeName || 'Full Summit Delegate'}
                  </div>
                  {lastScanResult.ticketTypePrice !== undefined && lastScanResult.ticketTypePrice > 0 && (
                    <div className="text-[11px] text-emerald-400 font-bold">
                      {formatLKR(lastScanResult.ticketTypePrice)}
                    </div>
                  )}
                </div>
              </div>

              {/* Event & Booking Reference */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Booking Reference</span>
                  <span className="font-mono text-white font-semibold">
                    {lastScanResult.bookingRef || 'BK-SUMMIT-2027'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Event</span>
                  <span className="text-slate-300 truncate block">
                    {lastScanResult.event?.Title || 'Sri Lanka AI & Tech Summit 2027'}
                  </span>
                </div>
              </div>

              {/* Ticket Code with Copy */}
              {lastScanResult.ticket?.QrCode && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[9px] text-slate-500 block">Ticket QR Code Hash</span>
                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                      {lastScanResult.ticket.QrCode}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(lastScanResult.ticket!.QrCode)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition shrink-0"
                    title="Copy code"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Next Scan Action */}
            <button
              onClick={handleNextScan}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Scan Next Pass</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Organizer Bottom Bar: Only Gate Scanning and Station Actions */}
      <div className="h-14 bg-black/90 border-t border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white">Organizer Gate Station</span>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchPortal && (
            <button
              onClick={() => onSwitchPortal('select')}
              className="px-2.5 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition"
            >
              Switch Role
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 rounded-lg border border-rose-900/40 transition"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
