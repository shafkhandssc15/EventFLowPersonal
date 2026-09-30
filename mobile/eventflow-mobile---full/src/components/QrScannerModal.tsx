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
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QrScannerModalProps {
  onClose: () => void;
  onScanSuccess?: (result: ScanResult) => void;
  onCheckInCompleted?: () => void | Promise<void>;
  activePasses?: Registration[];
  currentUser?: User | null;
  onOpenLogin?: (mode?: 'login' | 'signup') => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  onClose,
  onScanSuccess,
  onCheckInCompleted,
  activePasses = [],
  currentUser,
  onOpenLogin,
}) => {
  const isOrganizer = currentUser?.Role === 'Organizer' || currentUser?.Role === 'Admin';

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load current check-in count from Supabase
  useEffect(() => {
    supabase
      .from('CheckIns')
      .select('Id', { count: 'exact' })
      .then(({ count }) => {
        if (count !== null && count !== undefined) {
          setCheckedInCount(count);
        }
      });
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
    if (!isOrganizer) return;
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
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
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError('Camera error: Could not load the BarcodeReader script due to a network error.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOrganizer) {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode, isOrganizer]);

  // Video scan loop
  useEffect(() => {
    if (!isOrganizer || !cameraActive || isProcessing || lastScanResult) return;

    let isScanning = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (!isScanning || !videoRef.current || !ctx) return;

      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          isScanning = false;
          handleProcessCode(code.data);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOrganizer, cameraActive, isProcessing, lastScanResult]);

  // Process Code via real Supabase
  const handleProcessCode = async (code: string) => {
    if (!isOrganizer) {
      alert('Restricted: Only organizers can scan tickets.');
      return;
    }
    if (isProcessing || !code.trim()) return;
    setIsProcessing(true);

    try {
      const result = await checkInTicket(code);
      setLastScanResult(result);

      if (result.success) {
        playSound('success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setCheckedInCount((c) => c + 1);

        if (onScanSuccess) onScanSuccess(result);
        if (onCheckInCompleted) onCheckInCompleted();
      } else {
        playSound('warning');
      }
    } catch {
      setLastScanResult({
        success: false,
        message: 'Unable to check ticket in database.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Flip Camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch {}
    } else {
      setTorchOn(!torchOn);
    }
  };

  // Scan Next button handler
  const handleScanNext = () => {
    setLastScanResult(null);
    setManualCode('');
    setShowManual(false);
  };

  // Format date helper matching Image 1: "27 Sep 2026 · 10:19 PM"
  const formatUsedDate = (isoString?: string) => {
    try {
      const d = isoString ? new Date(isoString) : new Date();
      const datePart = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${datePart} · ${timePart}`;
    } catch {
      return '27 Sep 2026 · 10:19 PM';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm h-full sm:h-[840px] max-h-screen bg-slate-950 border border-white/10 sm:rounded-[36px] overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Yellow PREVIEW corner ribbon matching screenshot */}
        <div className="absolute top-2 right-2 z-30 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider border border-amber-500/30 pointer-events-none">
          PREVIEW
        </div>

        {/* Top Header matching Image 1 */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-white text-base">Gate scanner</h3>
          </div>

          <div className="flex items-center gap-3 pr-16">
            {/* Checked in counter e.g. "1 in" with green dot */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{checkedInCount} in</span>
            </div>

            {/* Flashlight button */}
            {isOrganizer && (
              <button
                onClick={handleToggleTorch}
                className={`p-1.5 rounded-lg border transition ${
                  torchOn
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Flashlight"
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Flip camera button */}
            {isOrganizer && (
              <button
                onClick={handleToggleCamera}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition"
                title="Switch Camera"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* RESTRICTED: User is NOT an Organizer */}
        {!isOrganizer ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Organizer Only Feature</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {currentUser
                  ? `Your account role is "${currentUser.Role}". Ticket scanning, QR validation, and entrance check-in are strictly restricted to verified Event Organizers.`
                  : 'Gate ticket scanning and check-in are strictly restricted to event organizers and authorized venue staff.'}
              </p>
            </div>

            <div className="w-full max-w-xs space-y-2 pt-2">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenLogin) onOpenLogin('login');
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>Sign In with Organizer Account</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Dismiss &amp; Return
              </button>
            </div>
          </div>
        ) : (
          /* Camera Viewport Area for Organizers */
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Glowing Blue Scan Target Frame exactly matching Image 1 */}
            <div className="relative z-10 w-64 h-56 rounded-3xl border-2 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)] flex flex-col items-center justify-center pointer-events-none">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
            </div>

            {/* Camera Error fallback exactly as shown in middle screenshot */}
            {cameraError && !lastScanResult && (
              <div className="absolute inset-0 z-15 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-64 h-48 rounded-3xl border-2 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)] flex items-center justify-center p-4">
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {cameraError}
                  </p>
                </div>

                {/* Quick test buttons to verify check-in & duplicate detection */}
                <div className="space-y-2 w-full max-w-xs pt-2">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    SCAN DATABASE PASS:
                  </span>
                  {activePasses.length > 0 ? (
                    <button
                      onClick={() => handleProcessCode(activePasses[0].ticket?.QrCode || activePasses[0].Id)}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition flex items-center justify-between"
                    >
                      <span className="truncate">
                        Scan {activePasses[0].attendee?.Name || 'Attendee'}'s Pass
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => setShowManual(!showManual)}
                    className="w-full py-2 px-3 bg-slate-900 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {showManual ? 'Hide Code Input' : 'Enter Pass Code Manually'}
                  </button>
                </div>
              </div>
            )}

            {/* Manual Input Fallback */}
            {showManual && (
              <div className="absolute bottom-4 left-4 right-4 z-20 p-3 bg-slate-900 border border-white/10 rounded-2xl space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter pass code..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleProcessCode(manualCode)}
                    disabled={isProcessing || !manualCode.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold transition"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= BOTTOM SHEET EXACTLY MATCHING IMAGE 1 ================= */}
        {isOrganizer && lastScanResult ? (
          <div className="relative z-30 p-5 bg-slate-950 border-t border-white/10 animate-slide-up text-center space-y-3">
            {lastScanResult.success ? (
              /* GREEN STATE: "CHECKED IN" (Left phone in Image 1) */
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-emerald-400 tracking-wider">
                    CHECKED IN
                  </h4>
                  <p className="text-xs text-slate-300">
                    Welcome {lastScanResult.attendeeName || 'Attendee'}! Ticket marked as USED.
                  </p>
                </div>

                <div className="pt-1">
                  <div className="text-base font-extrabold text-white">
                    {lastScanResult.attendeeName || 'Attendee'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lastScanResult.ticketTypeName || 'General Pass'} ·{' '}
                    {formatLKR(lastScanResult.ticketTypePrice || 0)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lastScanResult.event?.Title || 'Event Ticket'}
                  </div>
                </div>

                {/* Blue Button: Scan next */}
                <button
                  onClick={handleScanNext}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-xl transition flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan next</span>
                </button>
              </div>
            ) : lastScanResult.alreadyCheckedIn ? (
              /* RED STATE: "ALREADY USED" (Middle phone in Image 1) */
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
                  <Ban className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-rose-500 tracking-wider">
                    ALREADY USED
                  </h4>
                  <p className="text-xs text-slate-300">Ticket was already used.</p>
                </div>

                <div className="pt-1">
                  <div className="text-base font-extrabold text-white">
                    {lastScanResult.attendeeName || 'Attendee'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lastScanResult.ticketTypeName || 'General Pass'} ·{' '}
                    {formatLKR(lastScanResult.ticketTypePrice || 0)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lastScanResult.event?.Title || 'Event Ticket'}
                  </div>
                  <div className="text-xs font-semibold text-rose-400 mt-1">
                    Used at {formatUsedDate(lastScanResult.checkedInAt)}
                  </div>
                </div>

                {/* Blue Button: Scan next */}
                <button
                  onClick={handleScanNext}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-xl transition flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan next</span>
                </button>
              </div>
            ) : (
              /* Error State */
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                  <X className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-rose-500">INVALID PASS</h4>
                  <p className="text-xs text-slate-400">{lastScanResult.message}</p>
                </div>
                <button
                  onClick={handleScanNext}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs"
                >
                  Scan next
                </button>
              </div>
            )}
          </div>
        ) : isOrganizer ? (
          /* Default bottom helper */
          <div className="p-4 bg-slate-950/90 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Point camera at attendee pass</span>
            <button
              onClick={() => setShowManual(!showManual)}
              className="text-blue-400 font-bold hover:underline"
            >
              Manual Code
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
