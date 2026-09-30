import React, { useEffect, useState } from 'react';
import { generateQrDataUrl } from '../lib/qr';
import { Registration, formatEventDate, formatLKR, checkInTicket } from '../lib/supabase';
import { ArrowLeft, Copy, Check, User as UserIcon, Ticket, FileText, QrCode } from 'lucide-react';

interface TicketQrModalProps {
  registration: Registration;
  onClose: () => void;
  onScanPass?: (qrCode: string) => void;
}

export const TicketQrModal: React.FC<TicketQrModalProps> = ({
  registration,
  onClose,
  onScanPass,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const qrCodeValue = registration.ticket?.QrCode || `EF-${registration.Id.substring(0, 16)}`;
  const isUsed = registration.Status === 'CheckedIn';

  const attendeeName = registration.attendee?.Name || 'Attendee';
  const eventTitle = registration.event?.Title || 'Event Ticket';
  const ticketTypeName = registration.ticketType?.Name || 'General Pass';
  const ticketPrice = registration.ticketType?.Price || 0;
  const bookingCode = `BK-${registration.Id.substring(0, 8).toUpperCase()}`;

  useEffect(() => {
    let mounted = true;
    generateQrDataUrl(qrCodeValue, { width: 340, margin: 2 })
      .then((url) => {
        if (mounted) {
          setQrDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('QR generation error:', err);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [qrCodeValue]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrCodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format used date matching Image 1: "27 Sep 2026 · 10:17 PM"
  const formatCheckedInDate = (iso?: string) => {
    try {
      const d = iso ? new Date(iso) : new Date();
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
      return '27 Sep 2026 · 10:17 PM';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm h-full sm:h-[840px] max-h-screen bg-slate-950 border border-white/10 sm:rounded-[36px] overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Top Header with Back Arrow matching Image 1 (Right phone) */}
        <div className="px-4 py-3.5 flex items-center gap-3 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-20">
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-extrabold text-white text-base">Entrance pass</h3>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 no-scrollbar flex-1">
          {/* Main Pass Card matching Image 1 */}
          <div className="p-5 bg-slate-900/90 border border-white/10 rounded-3xl text-center space-y-3 shadow-xl">
            <h2 className="text-base font-black text-white leading-snug">{eventTitle}</h2>
            <div className="text-xs text-slate-400 space-y-0.5">
              <div>{formatEventDate(registration.event?.StartDate)}</div>
              <div>{registration.event?.Location || 'BMICH, Colombo 07'}</div>
            </div>

            {/* QR Container with blurred image and red angled "USED" stamp if checked in */}
            <div className="relative mx-auto my-3 p-3 bg-white rounded-2xl shadow-inner max-w-[210px] aspect-square flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className={`w-full h-full object-contain ${isUsed ? 'filter blur-[2px] opacity-40' : ''}`}
                />
              )}

              {/* Red Angled "USED" Rubber Stamp matching Image 1 */}
              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-6 py-2 border-4 border-rose-500 text-rose-500 font-black text-2xl tracking-widest rounded-2xl -rotate-12 bg-rose-950/40 backdrop-blur-xs shadow-2xl uppercase">
                    USED
                  </div>
                </div>
              )}
            </div>

            {/* Status Indicator under QR */}
            {isUsed ? (
              <div className="space-y-1.5 pt-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold">
                  Used
                </span>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Checked in on {formatCheckedInDate(registration.checkedInAt || registration.UpdatedAt)}. This pass can no longer be used.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  Ready for Entrance
                </span>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Present this QR code at the turnstile gate reader upon arrival.
                </p>
              </div>
            )}
          </div>

          {/* Details Card exactly matching Image 1 (Right phone) */}
          <div className="p-4 bg-slate-900/90 border border-white/10 rounded-3xl space-y-3.5 shadow-xl text-xs">
            {/* Holder */}
            <div className="flex items-center gap-3">
              <div className="text-slate-400 shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Holder</div>
                <div className="font-extrabold text-white text-xs truncate">{attendeeName}</div>
              </div>
            </div>

            {/* Pass */}
            <div className="flex items-center gap-3">
              <div className="text-slate-400 shrink-0">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Pass</div>
                <div className="font-extrabold text-white text-xs truncate">
                  {ticketTypeName} · {formatLKR(ticketPrice)}
                </div>
              </div>
            </div>

            {/* Booking */}
            <div className="flex items-center gap-3">
              <div className="text-slate-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Booking</div>
                <div className="font-bold text-white text-xs font-mono">{bookingCode}</div>
              </div>
            </div>

            {/* Ticket code */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-slate-400 shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400">Ticket code</div>
                  <div className="font-mono text-white text-xs truncate max-w-[200px]">
                    {qrCodeValue}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
                title="Copy Ticket Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
