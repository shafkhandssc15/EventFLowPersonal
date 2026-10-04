import React, { useState, useEffect } from 'react';
import { Venue, Vendor, User } from '../lib/types';
import { fetchVenues, fetchVendors, createVenue, createVendor, formatLKR } from '../lib/supabase';
import {
  MapPin,
  Building2,
  Users,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  X,
  Phone,
  Layers,
  Wrench,
  Clock,
  Compass,
  Check,
} from 'lucide-react';

import confetti from 'canvas-confetti';

interface VenueVendorPortalProps {
  currentUser: User | null;
  onOpenLogin: (mode?: 'login' | 'signup') => void;
  onSelectVenue?: (venue: Venue) => void;
}


const VENUE_AMENITIES_OPTIONS = [
  'Air Conditioning',
  '4K LED Screen Wall',
  'Pro Stage Sound Rig',
  'VIP Green Rooms',
  'Generator Backup (500kVA)',
  'High-Speed Gigabit WiFi',
  'Valet & Event Parking',
  'Loading Dock Access',
  'Wheelchair Accessible',
];


const VENDOR_CATEGORY_OPTIONS = [
  'Audio/Visual & Lighting',
  'Catering & Haute Cuisine',
  'Stage Design & Floral Decor',
  'Security & Crowd Management',
  'Photography & Drone Media',
  'Event MC & Host Agency',
];



export const VenueVendorPortal: React.FC<VenueVendorPortalProps> = ({
  currentUser,
  onOpenLogin,
  onSelectVenue,

}) => {
  const [activeTab, setActiveTab] = useState<'venues' | 'vendors'>('venues');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');


  // Modals
  const [addVenueOpen, setAddVenueOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);

  // Form states for Venue
  const [venueName, setVenueName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('500');
  const [venuePrice, setVenuePrice] = useState('45000');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([

    'Air Conditioning',
    'High-Speed Gigabit WiFi',

  ]);
  const [submittingVenue, setSubmittingVenue] = useState(false);


  // Form states for Vendor
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState(VENDOR_CATEGORY_OPTIONS[0]);
  const [vendorPrice, setVendorPrice] = useState('150000');
  const [submittingVendor, setSubmittingVendor] = useState(false);


  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isVendorManager = currentUser?.Role === 'VendorVenueManager' || currentUser?.Role === 'Admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const [venuesData, vendorsData] = await Promise.all([fetchVenues(), fetchVendors()]);
      setVenues(venuesData);
      setVendors(vendorsData);
    } catch (err) {
      console.error('Error loading venues/vendors:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);


  const handleCopyLocation = (venue: Venue) => {
    if (venue.Location) {
      navigator.clipboard.writeText(`${venue.Name}, ${venue.Location}`);
      setCopiedId(venue.Id);
      setTimeout(() => setCopiedId(null), 2000);
    }

  };

  const handleToggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };


  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim() || !venueLocation.trim()) return;


    setSubmittingVenue(true);
    try {
      const created = await createVenue({
        name: venueName.trim(),
        location: venueLocation.trim(),
        capacity: Number(venueCapacity) || 500,
        pricePerHour: Number(venuePrice) || 0,
        ownerId: currentUser?.Id || '00000000-0000-0000-0000-0000000000bb',
      });


      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setVenues((prev) => [created, ...prev]);
      setAddVenueOpen(false);
      setVenueName('');
      setVenueLocation('');
      setVenueCapacity('500');
      setVenuePrice('45000');

    } catch (err: any) {
      alert('Could not save venue: ' + (err.message || 'Please try again'));
    } finally {
      setSubmittingVenue(false);

    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return;


    setSubmittingVendor(true);
    try {
      const created = await createVendor({
        name: vendorName.trim(),
        serviceType: vendorCategory,
        pricePerService: Number(vendorPrice) || 0,
        ownerId: currentUser?.Id || '00000000-0000-0000-0000-0000000000bb',
      });


      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setVendors((prev) => [created, ...prev]);
      setAddVendorOpen(false);
      setVendorName('');
      setVendorPrice('150000');
    } catch (err: any) {
      alert('Could not save vendor: ' + (err.message || 'Please try again'));
    } finally {
      setSubmittingVendor(false);
      
    }
  };

  const filteredVenues = venues.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.Name.toLowerCase().includes(q) ||
      (v.Location && v.Location.toLowerCase().includes(q))
    );
  });

  const filteredVendors = vendors.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.Name.toLowerCase().includes(q) ||
      (v.ServiceType && v.ServiceType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 space-y-4 select-none pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>Venues &amp; Vendors</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold text-[10px] uppercase tracking-wider border border-blue-500/30">
              Directory
            </span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Certified event spaces, physical locations &amp; production partners
          </p>
        </div>

        {isVendorManager ? (
          <button
            onClick={() => (activeTab === 'venues' ? setAddVenueOpen(true) : setAddVendorOpen(true))}
            className="py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'venues' ? '+ Add Location' : '+ Add Service'}</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenLogin('signup')}
            className="py-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-semibold border border-white/5 transition flex items-center gap-1 shrink-0"
            title="Register as a Venue / Vendor Partner"
          >
            <span>Partner Sign Up</span>
          </button>
        )}
      </div>

      {/* Role Banner: If User is VendorVenueManager */}
      {isVendorManager && (
        <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 border border-blue-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Venue &amp; Vendor Partner Console</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                  ACTIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                You can add locations, set hourly capacity, and offer event production services.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs: Venues vs Vendors */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/10 text-xs">
        <button
          onClick={() => setActiveTab('venues')}
          className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'venues'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Locations &amp; Venues ({venues.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'vendors'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Vendor Services ({vendors.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'venues'
              ? 'Search venues by name or location (e.g. Colombo, Nelum Pokuna)...'
              : 'Search vendor services (e.g. Sound, Catering, Lighting)...'
          }
          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* TAB 1: VENUES & LOCATIONS LIST */}
      {activeTab === 'venues' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading verified locations from database...
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-white/10 space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-bold text-white text-sm">No Venues Found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'No locations match your search query. Try another keyword.'
                  : 'No event locations registered yet.'}
              </p>
              {isVendorManager && (
                <button
                  onClick={() => setAddVenueOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold"
                >
                  + Add First Venue Location
                </button>
              )}
            </div>
          ) : (
            filteredVenues.map((venue) => {
              const isOwner = currentUser?.Id === venue.OwnerId;
              return (
                <div
                  key={venue.Id}
                  className="p-4 bg-slate-900/90 rounded-3xl border border-white/10 hover:border-white/20 transition space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          Verified Space
                        </span>
                        {isOwner && (
                          <span className="text-[9px] bg-blue-600/30 text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-500/30">
                            Your Listing
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-white text-sm leading-snug">
                        {venue.Name}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-500">Rate / Hr</div>
                      <div className="text-xs font-black text-blue-400">
                        {formatLKR(venue.PricePerHour || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Location Address */}
                  {venue.Location && (
                    <div className="p-2.5 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300 truncate pr-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate text-[11px]">{venue.Location}</span>
                      </div>
                      <button
                        onClick={() => handleCopyLocation(venue)}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition shrink-0 flex items-center gap-1"
                      >
                        {copiedId === venue.Id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <span>Copy Address</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Specs & Capacity */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-black/30 rounded-xl border border-white/5 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-500 block">CAPACITY</span>
                        <span className="font-bold text-white text-[11px]">
                          {venue.Capacity?.toLocaleString() || '500'} Guests
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-black/30 rounded-xl border border-white/5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-500 block">BOOKING</span>
                        <span className="font-bold text-emerald-400 text-[11px]">
                          Available Now
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center justify-between border-t border-white/5 text-[11px]">
                    <span className="text-[10px] text-slate-500">
                      ID: {venue.Id.substring(0, 8)}...
                    </span>

                    {onSelectVenue && (
                      <button
                        onClick={() => onSelectVenue(venue)}
                        className="py-1 px-3 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg font-bold transition flex items-center gap-1 text-[11px]"
                      >
                        <span>Select for Event</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: VENDOR SERVICES LIST */}
      {activeTab === 'vendors' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading verified vendors...
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-white/10 space-y-3">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-bold text-white text-sm">No Vendors Listed</h3>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? 'No vendor services match your search query.'
                  : 'No production partners registered yet.'}
              </p>
              {isVendorManager && (
                <button
                  onClick={() => setAddVendorOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold"
                >
                  + Add First Vendor Service
                </button>
              )}
            </div>
          ) : (
            filteredVendors.map((vendor) => {
              const isOwner = currentUser?.Id === vendor.OwnerId;
              return (
                <div
                  key={vendor.Id}
                  className="p-4 bg-slate-900/90 rounded-3xl border border-white/10 hover:border-white/20 transition space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        {vendor.ServiceType || 'Production Service'}
                      </span>
                      <h3 className="font-extrabold text-white text-sm leading-snug">
                        {vendor.Name}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-500">Base Package</div>
                      <div className="text-xs font-black text-emerald-400">
                        {formatLKR(vendor.PricePerService || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Certified EventFlow Vendor Partner</span>
                    </div>
                    {isOwner && (
                      <span className="text-[9px] bg-blue-600/30 text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-500/30">
                        Yours
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= MODAL: ADD VENUE LOCATION ================= */}
      {addVenueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Add Venue Location</h3>
                  <p className="text-[10px] text-slate-400">List an event space in Sri Lanka</p>
                </div>
              </div>
              <button
                onClick={() => setAddVenueOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateVenue}
              className="p-5 space-y-3.5 overflow-y-auto no-scrollbar"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lotus Grand Ballroom"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Physical Address / Location *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 110 Bauddhaloka Mawatha, Colombo 07"
                    value={venueLocation}
                    onChange={(e) => setVenueLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Guest Capacity *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    required
                    value={venueCapacity}
                    onChange={(e) => setVenueCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Price / Hr (LKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={venuePrice}
                    onChange={(e) => setVenuePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Key Amenities &amp; Features:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VENUE_AMENITIES_OPTIONS.map((am) => {
                    const isSelected = selectedAmenities.includes(am);
                    return (
                      <button
                        type="button"
                        key={am}
                        onClick={() => handleToggleAmenity(am)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                          isSelected
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-bold'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {am}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingVenue}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
                >
                  {submittingVenue ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Publish Venue Location</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD VENDOR SERVICE ================= */}
      {addVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Add Vendor Service</h3>
                  <p className="text-[10px] text-slate-400">List event production services</p>
                </div>
              </div>
              <button
                onClick={() => setAddVendorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateVendor}
              className="p-5 space-y-3.5 overflow-y-auto no-scrollbar"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Vendor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceylon Sound &amp; Stage Dynamics"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Service Category *
                </label>
                <select
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {VENDOR_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Base Package Rate (LKR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingVendor}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
                >
                  {submittingVendor ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Publish Vendor Service</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
