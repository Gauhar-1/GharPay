import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Bed, CheckCircle2, TrendingUp, Users,
  LogOut, RefreshCw, AlertTriangle, Home, CalendarCheck, 
  ChevronRight, Activity, ShieldAlert, Lock, Hash, MapPin, Database
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

// --- Hooks ---
function useOwnerByUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['owner-by-user', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('owners').select('*').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useOwnerProperties(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['owner-properties', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('*, rooms(*, beds(*))').eq('owner_id', ownerId!).order('name');
      if (error) throw error;
      return data;
    },
  });
}

function useOwnerBookings(propertyIds: string[]) {
  return useQuery({
    queryKey: ['owner-bookings', propertyIds],
    enabled: propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('bookings').select('*, leads(name, phone), rooms(room_number), beds(bed_number), properties(name)').in('property_id', propertyIds).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function usePropertyEffort(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property-effort', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_property_effort', { p_property_id: propertyId! });
      if (error) throw error;
      return data as any;
    },
  });
}

function useConfirmRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { room_id: string; status: string; confirmed_by?: string; notes?: string }) => {
      const { data, error } = await supabase.from('room_status_log').insert({
        room_id: params.room_id, status: params.status as any, confirmed_by: params.confirmed_by || null, notes: params.notes || null, rent_updated: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-properties'] });
      toast.success('Asset status verified and logged.');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

const STATUS_THEME: Record<string, string> = {
  vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  occupied: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  vacating: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
  blocked: 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30',
};

const BOOKING_THEME: Record<string, string> = {
  pending: 'text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/5',
  confirmed: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
  cancelled: 'text-[#A62639] border-[#A62639]/30 bg-[#A62639]/5',
  completed: 'text-sky-500 border-sky-500/30 bg-sky-500/5',
};

export default function OwnerPortal() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: owner, isLoading: ownerLoading } = useOwnerByUser(user?.id);
  const { data: properties } = useOwnerProperties(owner?.id);
  const propertyIds = properties?.map((p: any) => p.id) || [];
  const { data: bookings } = useOwnerBookings(propertyIds);
  const confirmRoom = useConfirmRoom();

  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [confirmStatus, setConfirmStatus] = useState('vacant');
  const [confirmNotes, setConfirmNotes] = useState('');

  const handleConfirm = () => {
    if (!confirmDialog || !owner) return;
    confirmRoom.mutate(
      { room_id: confirmDialog.id, status: confirmStatus, confirmed_by: owner.id, notes: confirmNotes },
      { onSuccess: () => { setConfirmDialog(null); setConfirmNotes(''); } }
    );
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/owner-portal');
  }, [authLoading, user, navigate]);

  if (authLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] relative">
        <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 border-t-2 border-[#D4AF37] border-l-2 rounded-full animate-spin" />
          <p className="text-[10px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase animate-pulse">Establishing Secure Uplink...</p>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] p-6 relative">
        <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springTransition} className="w-full max-w-md relative z-10">
          <div className="bg-[#121215] border-2 border-[#A62639] p-10 text-center shadow-[0_0_40px_rgba(166,38,57,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#A62639]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#A62639]" />
            
            <ShieldAlert size={48} className="mx-auto mb-6 text-[#A62639]" />
            <h2 className="text-3xl font-serif italic text-white mb-2">Clearance Denied</h2>
            <p className="text-[10px] font-mono text-white/50 mb-8 uppercase tracking-widest leading-relaxed">
              Identity <strong>{user?.email}</strong> is not registered as an authorized asset partner in the mainframe.
            </p>
            <div className="flex flex-col gap-4">
              <Button className="h-12 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-all" onClick={() => navigate('/auth?mode=owner_signup')}>
                <Building2 size={14} className="mr-2" /> Register as Property Owner
              </Button>
              <Button variant="ghost" className="h-12 rounded-none text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5" onClick={() => navigate('/')}>Return to Base</Button>
              <Button variant="ghost" className="h-12 rounded-none text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5" onClick={() => signOut()}>Purge Session</Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const filteredProps = selectedProperty === 'all' ? properties || [] : properties?.filter((p: any) => p.id === selectedProperty) || [];
  const totalBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds?.length || 0), 0), 0);
  const vacantBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds || []).filter((b: any) => b.status === 'vacant').length, 0), 0);
  const occupiedBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds || []).filter((b: any) => b.status === 'occupied').length, 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E5E5E5] relative selection:bg-[#D4AF37]/30 font-sans">
      {/* Texture: Subtle Victorian Wallpaper Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      {/* Military/Forensic Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-[#D4AF37] flex items-center justify-center bg-[#D4AF37]/5">
              <span className="text-[#D4AF37] font-serif font-black text-xl italic">G</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-serif font-bold text-xl leading-none text-white tracking-tight">Gharpayy</p>
              <p className="text-[8px] font-mono font-bold uppercase tracking-[0.4em] text-[#D4AF37] mt-1.5">Asset Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 bg-[#121215] px-4 py-2 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">ID: {owner.name.split(' ')[0]}</span>
            </div>
            <Button variant="ghost" size="icon" className="rounded-none border border-white/10 hover:bg-[#A62639]/20 hover:text-[#A62639] hover:border-[#A62639]/50 transition-all h-10 w-10" onClick={() => signOut()}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 py-12 relative z-10">
        
        {/* Command Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={springTransition} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl lg:text-7xl font-serif italic text-white tracking-tighter mb-4">Partner <br/><span className="text-[#D4AF37]">Dossier.</span></h1>
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.3em] flex items-center gap-2">
              <Database size={12} className="text-[#D4AF37]" /> Operating {properties?.length || 0} Classified Assets
            </p>
          </div>
          
          <div className="w-full lg:w-96">
            <label className="text-[8px] font-mono tracking-[0.2em] uppercase text-white/40 mb-2 block">Target Portfolio Scope</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="h-14 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37] transition-all">
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                <SelectItem value="all" className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white py-3">Global Overview</SelectItem>
                {properties?.map((p: any) => <SelectItem key={p.id} value={p.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white py-3">ASSET: {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Forensic Diagnostics (KPIs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px mb-16">
          {[
            { label: 'System Occupancy', value: `${occupancyRate}%`, icon: Activity, color: 'text-sky-500' },
            { label: 'Clear Units', value: vacantBeds, icon: Bed, color: 'text-emerald-500' },
            { label: 'Active Negotiations', value: bookings?.length || 0, icon: Users, color: 'text-[#D4AF37]' },
            { label: 'Total Capacity', value: totalBeds, icon: Hash, color: 'text-white/80' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1, ...springTransition }}>
              <div className="bg-[#0A0A0C] p-8 relative overflow-hidden group hover:bg-[#121215] transition-colors h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-8">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{kpi.label}</p>
                  <kpi.icon size={16} className={`${kpi.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                </div>
                <p className={`text-5xl font-serif italic tracking-tighter ${kpi.color}`}>{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tactical Sub-Nav */}
        <Tabs defaultValue="rooms" className="space-y-12">
          <TabsList className="bg-transparent border-b border-white/10 w-full justify-start h-auto p-0 flex flex-wrap gap-2 sm:gap-8">
            <TabsTrigger value="rooms" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Asset Control</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Yield Ledger</TabsTrigger>
            <TabsTrigger value="effort" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Agency Performance</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {/* INVENTORY TAB */}
            <TabsContent value="rooms" className="space-y-12 outline-none">
              {filteredProps.map((property: any, pIdx: number) => (
                <motion.section key={property.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pIdx * 0.1 }}>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-3xl font-serif text-white tracking-tighter uppercase">{property.name}</h2>
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[9px] font-mono tracking-[0.2em] text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3 py-1 border border-[#D4AF37]/30">
                      {property.area}, {property.city}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px">
                    {(property.rooms || []).map((room: any) => {
                      const vacant = (room.beds || []).filter((b: any) => b.status === 'vacant').length;
                      const stale = room.last_confirmed_at ? new Date().getTime() - new Date(room.last_confirmed_at).getTime() > 24 * 60 * 60 * 1000 : true;
                      
                      return (
                        <div key={room.id} className={`group relative bg-[#0A0A0C] p-6 transition-all duration-500 overflow-hidden ${room.auto_locked ? 'shadow-[inset_0_0_0_1px_#A62639]' : 'hover:bg-[#121215]'}`}>
                          {room.auto_locked && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#A62639] to-transparent opacity-50" />}
                          {stale && <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse" title="Verification Overdue" />}
                          
                          <div className="flex items-start justify-between mb-8">
                            <div>
                              <p className="text-2xl font-serif text-white tracking-tight mb-1">C-{room.room_number}</p>
                              <p className="text-[8px] font-mono text-white/40 uppercase tracking-[0.2em]">{room.room_type || 'STANDARD CLASS'}</p>
                            </div>
                            <Badge className={`rounded-none px-2 py-1 text-[8px] font-black uppercase tracking-widest border ${STATUS_THEME[room.status] || 'bg-white/5 border-white/10 text-white/50'}`}>
                              {room.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-8 text-[10px] font-mono tracking-widest uppercase">
                            <div>
                              <p className="text-white/30 mb-1">Clearance</p>
                              <p className={`font-bold ${vacant > 0 ? 'text-emerald-500' : 'text-[#A62639]'}`}>{vacant} / {room.bed_count}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white/30 mb-1">Target Yield</p>
                              <p className="text-[#D4AF37]">₹{(room.rent_per_bed || 0).toLocaleString()}</p>
                            </div>
                          </div>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                className={`w-full h-10 rounded-none font-black text-[9px] uppercase tracking-[0.2em] transition-all border ${
                                  stale 
                                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black' 
                                    : 'bg-transparent text-white/50 border-white/10 hover:border-white/30 hover:text-white'
                                }`}
                                onClick={() => { setConfirmDialog(room); setConfirmStatus(room.status); }}
                              >
                                {stale ? 'Verify Integrity' : 'Modify Status'}
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="sm:max-w-[400px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                              <div className="p-6 border-b border-white/10 bg-[#121215]">
                                <DialogTitle className="font-serif text-xl italic text-white">Integrity Override: C-{room.room_number}</DialogTitle>
                              </div>
                              <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Current State Definition</Label>
                                  <Select value={confirmStatus} onValueChange={setConfirmStatus}>
                                    <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                                      <SelectItem value="vacant" className="font-mono text-xs focus:bg-emerald-500/20 focus:text-emerald-500">VACANT - CLEAR</SelectItem>
                                      <SelectItem value="occupied" className="font-mono text-xs focus:bg-sky-500/20 focus:text-sky-500">OCCUPIED - SECURED</SelectItem>
                                      <SelectItem value="vacating" className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-[#D4AF37]">VACATING - PENDING</SelectItem>
                                      <SelectItem value="blocked" className="font-mono text-xs focus:bg-[#A62639]/20 focus:text-[#A62639]">BLOCKED - RESTRICTED</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Agent Intelligence (Notes)</Label>
                                  <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="Log physical anomalies..." value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} />
                                </div>
                                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                                  <Button variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase hover:bg-white/5 text-white/50 hover:text-white" onClick={() => setConfirmDialog(null)}>Abort</Button>
                                  <Button onClick={handleConfirm} disabled={confirmRoom.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12 transition-colors">
                                    {confirmRoom.isPending ? 'Logging...' : 'Confirm Status'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      );
                    })}
                  </div>
                </motion.section>
              ))}
            </TabsContent>

            {/* BOOKINGS TAB */}
            <TabsContent value="bookings" className="outline-none">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0C] border-t-2 border-[#A62639] shadow-2xl overflow-hidden">
                {bookings?.length ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-[#121215]">
                        <tr>
                          <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 w-12"><Hash size={10} /></th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Subject Identity</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Asset Location</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Target Yield</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Projected Entry</th>
                          <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Ledger Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bookings.map((b: any, i: number) => (
                          <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-4 px-6 text-[10px] font-mono text-white/20">{(i + 1).toString().padStart(3, '0')}</td>
                            <td className="py-4 px-6">
                              <p className="font-serif text-base text-white group-hover:italic transition-all">{(b.leads as any)?.name || 'UNKNOWN'}</p>
                              <p className="text-[9px] font-mono text-[#D4AF37] tracking-widest mt-1">{(b.leads as any)?.phone}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-[11px] font-mono text-white/80 tracking-widest uppercase">{(b.properties as any)?.name}</p>
                              <p className="text-[9px] font-mono text-white/40 tracking-widest mt-1 uppercase">C-{(b.rooms as any)?.room_number} • BED {(b.beds as any)?.bed_number}</p>
                            </td>
                            <td className="py-4 px-6 text-right font-mono text-xs text-white">
                              ₹{(b.monthly_rent || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-[10px] font-mono text-white/60 uppercase tracking-widest">
                              {b.move_in_date ? new Date(b.move_in_date).toLocaleDateString('en-GB') : 'TBD'}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Badge variant="outline" className={`rounded-none px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] border ${BOOKING_THEME[b.booking_status] || 'border-white/20 text-white/40'}`}>
                                {b.booking_status.replace('_', ' ')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-32 text-center">
                    <Database size={40} className="mx-auto mb-6 text-white/10" />
                    <p className="font-serif text-2xl italic text-white mb-2">Ledger Empty</p>
                    <p className="text-[11px] font-mono tracking-widest text-white/40 uppercase">No closures recorded for target scope.</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* EFFORT TAB */}
            <TabsContent value="effort" className="outline-none">
              <div className="grid gap-px bg-white/10 border border-white/10 p-px lg:grid-cols-2">
                {filteredProps.map((property: any) => <EffortCard key={property.id} property={property} />)}
              </div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
}

// --- Reimagined EffortCard Component ---
function EffortCard({ property }: { property: any }) {
  const { data: effort } = usePropertyEffort(property.id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={springTransition} className="bg-[#0A0A0C] p-8 relative overflow-hidden group hover:bg-[#121215] transition-colors">
      <div className="flex items-start justify-between mb-8 border-b border-white/10 pb-6">
        <div>
          <h3 className="font-serif text-2xl text-white tracking-tighter mb-1">{property.name}</h3>
          <p className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-[#D4AF37]">{property.area}</p>
        </div>
        <Activity size={20} className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </div>
      
      {effort ? (
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-white/5 pb-4">
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/50">Engagement</span>
            <div className="text-right">
              <span className="text-2xl font-serif italic text-white leading-none">{(effort as any).total_leads}</span>
              <span className="text-[9px] font-mono text-white/30 ml-2">PROSPECTS</span>
            </div>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-4">
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/50">Field Tours</span>
            <div className="text-right">
              <span className="text-2xl font-serif italic text-white leading-none">{(effort as any).total_visits}</span>
              <span className="text-[9px] font-mono text-white/30 ml-2">EXECUTED</span>
            </div>
          </div>
          <div className="flex justify-between items-end border-b border-white/5 pb-4">
            <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-500/70">Assets Secured</span>
            <div className="text-right">
              <span className="text-2xl font-serif italic text-emerald-500 leading-none">{(effort as any).booked}</span>
              <span className="text-[9px] font-mono text-emerald-500/50 ml-2">UNITS</span>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#A62639]/70">Loss Rate</span>
            <div className="text-right">
              <span className="text-2xl font-serif italic text-[#A62639] leading-none">
                {Math.round(((effort as any).not_interested / ((effort as any).total_leads || 1)) * 100)}%
              </span>
              <span className="text-[9px] font-mono text-[#A62639]/50 ml-2">DROPPED</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-white/30">
          <div className="w-8 h-8 border-t-2 border-[#D4AF37] rounded-full animate-spin mb-4" />
          <p className="text-[9px] font-mono tracking-widest uppercase">Compiling Metrics...</p>
        </div>
      )}
    </motion.div>
  );
}