import React, { useState } from 'react';
import { EventItem } from '../lib/types';
import { StoryHighlight } from '../lib/eventImages';
import { X, Sparkles, MapPin, Upload } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddHighlightModalProps {
  events: EventItem[];
  onClose: () => void;
  onAddHighlight: (highlight: StoryHighlight) => void;
}

const PRESET_IMAGES = [
  { label: 'Concert', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1080&q=85' },
  { label: 'Stage', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1080&q=85' },
  { label: 'Hall', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1080&q=85' },
  { label: 'Gaming', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1080&q=85' },
  { label: 'Outdoors', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1080&q=85' },
];

const PRESET_BADGES = ['Live Now', 'Backstage', 'Doors Open', 'VIP Area', 'Sneak Peek'];

export const AddHighlightModal: React.FC<AddHighlightModalProps> = ({
  events,
  onClose,
  onAddHighlight,
}) => {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.Id || '');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [location, setLocation] = useState(events[0]?.Location || 'Colombo, Sri Lanka');
  const [badge, setBadge] = useState('Live Now');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    const ev = events.find((e) => e.Id === id);
    if (ev) {
      setLocation(ev.Location || 'Colombo, Sri Lanka');
      if (!title) setTitle(`${ev.Title.split(' ')[0]} Live`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setImageUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedEvent = events.find((e) => e.Id === selectedEventId);
    const finalTitle = title.trim() || (selectedEvent ? selectedEvent.Title.split(' ')[0] : 'Event Live');
    const finalSubtitle = subtitle.trim() || 'Doors open! Come join the experience.';

    const newHighlight: StoryHighlight = {
      id: `story-custom-${Date.now()}`,
      title: finalTitle,
      subtitle: finalSubtitle,
      avatar: imageUrl,
      image: imageUrl,
      location: location || selectedEvent?.Location || 'Colombo, Sri Lanka',
      badge: badge,
      eventId: selectedEventId || undefined,
    };

    onAddHighlight(newHighlight);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/10 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm">Add Story</h3>
              <p className="text-[11px] text-slate-400">Post a live update for your attendees</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 no-scrollbar">
          {/* Target Event Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Select Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleSelectEvent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {events.map((ev) => (
                <option key={ev.Id} value={ev.Id}>
                  {ev.Title}
                </option>
              ))}
            </select>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Headline
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Soundcheck Underway, Doors Open Soon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Note (optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. VIP guests can head to Gate B for express check-in."
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Venue
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. BMICH, Colombo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tag */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Tag
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_BADGES.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBadge(b)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                    badge === b
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Photo
            </label>

            {/* Preview image */}
            <div className="relative h-24 w-full rounded-2xl overflow-hidden border border-white/10 mb-2 bg-black">
              <img src={imageUrl} alt="Story preview" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-blue-600/90 text-white text-[10px] font-bold">
                {badge}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {PRESET_IMAGES.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setImageUrl(img.url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                    imageUrl === img.url ? 'border-blue-500 scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 border border-white/10 hover:border-blue-500 rounded-xl text-[11px] font-semibold text-slate-300 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Upload Photo from Device</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Share Story</span>
          </button>
        </form>
      </div>
    </div>
  );
};
