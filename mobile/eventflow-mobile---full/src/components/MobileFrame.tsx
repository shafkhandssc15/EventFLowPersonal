import React, { useState } from 'react';
import { Wifi, Battery, Signal, Maximize2, Minimize2 } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [fullscreen, setFullscreen] = useState(false);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
        {/* Minimal top status bar with toggle to restore frame */}
        <div className="h-9 px-4 bg-slate-950/80 backdrop-blur-md flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 shrink-0 z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-white text-[11px]">EventFlow Mobile</span>
          </div>
          <button
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Show Device Bezel</span>
          </button>
        </div>

        <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto my-2 w-full max-w-[400px] h-[840px] bg-slate-950 rounded-[50px] p-3 shadow-[0_0_80px_rgba(37,99,235,0.22)] border-[8px] border-slate-800 ring-1 ring-slate-700/60 flex flex-col overflow-hidden select-none">
      {/* Side buttons simulation */}
      <div className="absolute -left-[11px] top-28 w-[3px] h-9 bg-slate-700 rounded-l" />
      <div className="absolute -left-[11px] top-42 w-[3px] h-12 bg-slate-700 rounded-l" />
      <div className="absolute -left-[11px] top-58 w-[3px] h-12 bg-slate-700 rounded-l" />
      <div className="absolute -right-[11px] top-36 w-[3px] h-16 bg-slate-700 rounded-r" />

      {/* Dynamic Island cutout */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-between px-3 shadow-sm border border-slate-900/60">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-blue-500/50" />
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
      </div>

      {/* Mobile Top Status Bar */}
      <div className="w-full h-8 pt-1 px-6 flex justify-between items-center text-[11px] font-semibold text-slate-300 z-30 shrink-0">
        <span>09:41</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <Battery className="w-3.5 h-3.5 text-emerald-400" />
          <button
            onClick={() => setFullscreen(true)}
            className="ml-1 p-0.5 text-slate-400 hover:text-white"
            title="Expand to full screen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Internal OLED Screen Viewport */}
      <div className="flex-1 w-full h-full bg-slate-950 rounded-[40px] overflow-hidden flex flex-col relative shadow-inner">
        {children}
      </div>

      {/* Home Indicator Bar */}
      <div className="w-full h-4 pt-1 flex justify-center items-center shrink-0 z-30">
        <div className="w-32 h-1 bg-slate-600 rounded-full" />
      </div>
    </div>
  );
};
