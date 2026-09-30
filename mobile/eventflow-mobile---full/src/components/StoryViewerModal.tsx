import React, { useState, useEffect, useRef } from 'react';
import { StoryHighlight } from '../lib/eventImages';
import { X, MapPin, Sparkles, ChevronRight, Ticket } from 'lucide-react';

interface StoryViewerModalProps {
  stories: StoryHighlight[];
  initialIndex?: number;
  onClose: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex = 0,
  onClose,
  onSelectEvent,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentIndex];

  // Reset progress whenever currentIndex changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Timer loop for story progress
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused]);

  // Auto-advance when progress hits 100% (safe in useEffect, not in state updater)
  useEffect(() => {
    if (progress >= 100) {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    }
  }, [progress, currentIndex, stories.length, onClose]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 select-none animate-fade-in">
      <div
        className="relative w-full max-w-sm h-full max-h-[800px] bg-slate-950 rounded-none sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl"
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        onPointerCancel={() => setIsPaused(false)}
      >
        {/* Story Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentStory.image}
            alt={currentStory.title}
            className="w-full h-full object-cover brightness-[0.82]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        </div>

        {/* Top Story Header & Progress Bars */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full">
            {stories.map((s, idx) => (
              <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < currentIndex
                        ? '100%'
                        : idx === currentIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* User / Venue Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentStory.avatar}
                alt={currentStory.title}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white text-sm">{currentStory.title}</h4>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-500/80 text-white font-semibold">
                    {currentStory.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span className="truncate max-w-[180px]">{currentStory.location}</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-white/80 hover:text-white bg-black/40 rounded-full backdrop-blur-sm transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mid Touch Navigation Zones */}
        <div className="relative z-10 flex-1 flex">
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="w-2/3 h-full cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Bottom Story Card & Action */}
        <div className="relative z-10 p-5 space-y-3">
          <div className="p-4 bg-slate-900/85 backdrop-blur-md rounded-2xl border border-white/10 text-white space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-300 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Featured Highlight
              </span>
              <span>Exclusive Backstage</span>
            </div>
            <h3 className="font-extrabold text-base leading-snug">{currentStory.subtitle}</h3>
            <p className="text-xs text-slate-300 line-clamp-2">
              High-definition production rig and spatial sound staging ready for the main gala.
            </p>

            {currentStory.eventId && onSelectEvent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(currentStory.eventId!);
                  onClose();
                }}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Ticket className="w-4 h-4" />
                <span>View Event &amp; Book Passes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
