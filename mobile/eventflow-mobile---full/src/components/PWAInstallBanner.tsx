import React, { useState } from 'react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, MoreVertical, PlusSquare, ArrowRight, ShieldCheck } from 'lucide-react';

interface PWAInstallBannerProps {
  variant?: 'banner' | 'button' | 'modal';
  onClose?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ variant = 'banner', onClose }) => {
  const { canInstall, hasPrompt, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (hasPrompt) {
      const outcome = await install();
      if (outcome === 'accepted') {
        if (onClose) onClose();
      }
    } else {
      // Show Android/iOS step-by-step install guide modal
      setShowGuideModal(true);
    }
  };

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg transition flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white animate-pulse" />
            <span>Install EventFlow Android App</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
            <span>1-Tap</span>
            <Download className="w-3 h-3" />
          </div>
        </button>

        {showGuideModal && (
          <InstallGuideModal
            isIOS={isIOS}
            isAndroid={isAndroid}
            onClose={() => setShowGuideModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mx-3 mt-2 p-3 bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border border-blue-500/40 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0">
            <img src="/icons/icon-192.png" alt="EventFlow" className="w-6 h-6 rounded-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white text-[12px] flex items-center gap-1.5">
              <span>Install Mobile App</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded border border-emerald-500/30">
                WebAPK
              </span>
            </div>
            <div className="text-[10px] text-slate-300 truncate">
              Add to Home screen for full-screen camera &amp; tickets
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[11px] shadow-md transition flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-500 hover:text-white rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showGuideModal && (
        <InstallGuideModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </>
  );
};

interface InstallGuideModalProps {
  isIOS: boolean;
  isAndroid: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isIOS, isAndroid, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Install on Android</h3>
              <p className="text-[10px] text-slate-400">Chrome WebAPK Installation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">To install on iOS Safari:</p>
            <div className="p-3 bg-black/40 rounded-xl space-y-2 text-slate-300 border border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Tap the <strong>Share</strong> button at bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <p className="text-slate-300">
              Follow these simple steps in Google Chrome on your Android phone:
            </p>

            <div className="p-3.5 bg-black/40 rounded-2xl space-y-3 text-slate-300 border border-white/5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Tap Chrome Menu</span>
                  <span className="text-[11px] text-slate-400">
                    Tap the <strong>3 vertical dots (⋮)</strong> in the top-right corner of Chrome.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Select &quot;Install app&quot;</span>
                  <span className="text-[11px] text-slate-400">
                    Tap <strong>&quot;Install app&quot;</strong> (or <strong>&quot;Add to Home screen&quot;</strong>).
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">Confirm Installation</span>
                  <span className="text-[11px] text-slate-400">
                    Tap <strong>&quot;Install&quot;</strong>. Android will build the WebAPK and place EventFlow on your home screen!
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-300 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Verified PWA with Service Worker &amp; Offline Cache active.</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
