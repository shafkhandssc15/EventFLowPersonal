import React, { useState, useEffect } from 'react';
import { supabase, formatLKR } from '../lib/supabase';
import { Venue, Vendor, User } from '../lib/types';
import {
  Building,
  Briefcase,
  Plus,
  RefreshCw,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  X,
  Phone,
  Sparkles,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VendorPartnerViewProps {
  currentUser: User | null;
  onOpenLogin: (mode?: 'login' | 'signup') => void;
}

export const VendorPartnerView: React.FC<VendorPartnerViewProps> = ({
  currentUser,
  onOpenLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'venues' | 'services' | 'requests'>('venues');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Venue Modal
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [vName, setVName] = useState('');
  const [vLocation, setVLocation] = useState('');
  const [vCapacity, setVCapacity] = useState(1500);
  const [vPrice, setVPrice] = useState(75000);
  const [submittingVenue, setSubmittingVenue] = useState(false);

  // Add Service Modal
  const [showAddService, setShowAddService] = useState(false);
  const [sName, setSName] = useState('');
  const [sType, setSType] = useState('Audio/Visual');
  const [sPrice, setSPrice] = useState(250000);
  const [submittingService, setSubmittingService] = useState(false);

  const loadData = async () => {
    try {
      const { data: vData } = await supabase.from('Venues').select('*').order('CreatedAt', { ascending: false });
      setVenues(vData || []);

      const { data: vdData } = await supabase.from('Vendors').select('*').order('CreatedAt', { ascending: false });
      setVendors(vdData || []);
    } catch (err) {
      console.error('VendorPartnerView error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to changes in Venues and Vendors
    const channel = supabase
      .channel('vendor-partner-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Venues' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Vendors' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Add Venue to Supabase
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim()) return;
    setSubmittingVenue(true);

    try {
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();
      await supabase.from('Venues').insert({
        Id: newId,
        OwnerId: currentUser?.Id || '00000000-0000-0000-0000-0000000000bb',
        Name: vName.trim(),
        Location: vLocation.trim() || 'Colombo, Sri Lanka',
        Capacity: Number(vCapacity) || 1000,
        PricePerHour: Number(vPrice) || 50000,
        IsActive: true,
        CreatedAt: now,
      });

      confetti({ particleCount: 40, spread: 50 });
      setShowAddVenue(false);
      setVName('');
      setVLocation('');
      await loadData();
    } catch (err) {
      console.error('Error inserting venue:', err);
    } finally {
      setSubmittingVenue(false);
    }
  };

  // Add Vendor Service to Supabase
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;
    setSubmittingService(true);

    try {
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();
      await supabase.from('Vendors').insert({
        Id: newId,
        OwnerId: currentUser?.Id || '00000000-0000-0000-0000-0000000000bb',
        Name: sName.trim(),
        ServiceType: sType,
        PricePerService: Number(sPrice) || 100000,
        IsActive: true,
        CreatedAt: now,
      });

      confetti({ particleCount: 40, spread: 50 });
      setShowAddService(false);
      setSName('');
      await loadData();
    } catch (err) {
      console.error('Error inserting vendor service:', err);
    } finally {
      setSubmittingService(false);
    }
  };

  return (
    <div className="p-4 space-y-4 select-none pb-24">
      {/* Top Partner Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
            Partner Portal
          </span>
          <h2 className="text-lg font-black text-white">Venues &amp; Vendor Services</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 bg-slate-900 border border-white/10 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30">
            PARTNER
          </div>
        </div>
      </div>

      {/* Partner Purpose Summary Banner */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-950 rounded-2xl border border-emerald-500/20 flex items-start gap-2.5">
        <Briefcase className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-300 leading-snug">
          Manage your convention facilities, auditorium capacities, audiovisual equipment packages and catering service contracts for Sri Lankan summits.
        </p>
      </div>

      {/* Segmented Sub-navigation: Venues / Services / Requests */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-2xl border border-white/5 text-xs">
        <button
          onClick={() => setActiveTab('venues')}
          className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'venues'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Venues ({venues.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'services'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Services ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'requests'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Inquiries</span>
        </button>
      </div>

      {/* TAB 1: VENUES */}
      {activeTab === 'venues' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Convention Facilities</span>
            <button
              onClick={() => setShowAddVenue(true)}
              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List Venue</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading venues from Supabase...
            </div>
          ) : venues.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-white/5 text-xs text-slate-400">
              No venues registered. Click "List Venue" to publish your hall space.
            </div>
          ) : (
            venues.map((v) => (
              <div
                key={v.Id}
                className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-white text-xs leading-snug">{v.Name}</h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{v.Location || 'Colombo, Sri Lanka'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 shrink-0">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Capacity: {v.Capacity.toLocaleString()}</span>
                  </div>
                  <div className="text-right text-emerald-400 font-bold">
                    {formatLKR(v.PricePerHour)} / hr
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: VENDOR SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Summit Staging &amp; Services</span>
            <button
              onClick={() => setShowAddService(true)}
              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading services from Supabase...
            </div>
          ) : vendors.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-white/5 text-xs text-slate-400">
              No staging or vendor packages listed yet.
            </div>
          ) : (
            vendors.map((vd) => (
              <div
                key={vd.Id}
                className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-white text-xs leading-snug">{vd.Name}</h4>
                    <span className="inline-block mt-0.5 text-[10px] text-blue-400 font-semibold px-2 py-0.5 bg-blue-950/40 rounded-md border border-blue-500/20">
                      {vd.ServiceType || 'Event Service'}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400 shrink-0">
                    {formatLKR(vd.PricePerService)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
                  <span>Available for summit contracting</span>
                  <span className="text-emerald-400 font-semibold">Verified Partner</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: INQUIRIES & REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-300">Active Summit Bookings</span>
          <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">BMICH Main Hall Booking</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                Confirmed
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Reserved for Sri Lanka AI &amp; Tech Innovation Summit 2027
            </p>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
              <span>Host: EventFlow Lead Organizer</span>
              <span className="text-emerald-400 font-bold">Paid Deposit</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Audio/Visual &amp; LED Stage</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                Pending Final Review
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ceylon Sound Dynamics contracted for Nelum Pokuna Music Gala
            </p>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-white/5">
              <span>Host: Colombo Arts Council</span>
              <span className="text-blue-400 font-bold">Rs. 350,000 package</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD VENUE */}
      {showAddVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-extrabold text-white text-sm">List Convention Venue</h3>
              <button
                onClick={() => setShowAddVenue(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Venue Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BMICH Banquet Hall"
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bauddhaloka Mawatha, Colombo 07"
                  value={vLocation}
                  onChange={(e) => setVLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={vCapacity}
                    onChange={(e) => setVCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Hourly Rate (Rs.)</label>
                  <input
                    type="number"
                    value={vPrice}
                    onChange={(e) => setVPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingVenue}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                {submittingVenue ? 'Saving to Database...' : 'Register Venue in Supabase'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {showAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-extrabold text-white text-sm">Add Staging / Vendor Service</h3>
              <button
                onClick={() => setShowAddService(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Service Brand / Package</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceylon Sound Dynamics 8K Setup"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Service Category</label>
                <select
                  value={sType}
                  onChange={(e) => setSType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Audio/Visual">Audio / Visual &amp; LED</option>
                  <option value="Catering">Haute Catering &amp; Dining</option>
                  <option value="Photography">Photography &amp; 8K Drone</option>
                  <option value="Security">VIP Executive Security</option>
                  <option value="Decoration">Stage &amp; Botanical Styling</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Package Price (Rs.)</label>
                <input
                  type="number"
                  value={sPrice}
                  onChange={(e) => setSPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingService}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                {submittingService ? 'Saving to Database...' : 'Save Service to Supabase'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
