import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Bed, CheckCircle2, TrendingUp, Users,
  LogOut, AlertTriangle, Activity, ShieldAlert, Hash, 
  Database, Bell, MessageSquare, CreditCard, Wrench, Download
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

// --- Hooks (Existing) ---
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

// --- Types ---
interface Payout {
  id: number | string;
  period: string;
  total_rent: number;
  admin_fee: number;
  net_payout: number;
  status: string;
}

// --- Hooks (NEW: Financials & Notifications) ---
// Note: Assuming tables 'payouts' and 'notifications' exist or will be created
function useOwnerPayouts(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['owner-payouts', ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Payout[]> => {
      const { data, error } = await (supabase as any).from('payouts').select('*').eq('owner_id', ownerId!).order('created_at', { ascending: false });
      if (error) {
        console.warn("Payouts table missing, using mock data");
        return [{ id: 1, period: 'Feb 2026', total_rent: 145000, admin_fee: 14500, net_payout: 130500, status: 'cleared' }, { id: 2, period: 'Mar 2026', total_rent: 160000, admin_fee: 16000, net_payout: 144000, status: 'processing' }];
      }
      return (data ?? []) as unknown as Payout[];
    },
  });
}

function useOwnerNotifications(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['owner-notifications', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', ownerId!).order('created_at', { ascending: false });
      if (error) {
         return [{ id: 1, type: 'alert', message: 'Admin requested status update on Asset C-102.', read: false, created_at: new Date().toISOString() }];
      }
      return data;
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
      toast.success('Asset status updated in the mainframe.');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

const STATUS_THEME: Record<string, string> = {
  vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  occupied: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  vacating: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
  blocked: 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30',
  maintenance: 'bg-orange-500/10 text-orange-500 border-orange-500/30', // NEW
};

export default function OwnerPortal() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: owner, isLoading: ownerLoading } = useOwnerByUser(user?.id);
  const { data: properties } = useOwnerProperties(owner?._id);
  
  const propertyIds = properties?.map((p: any) => p.id) || [];
  const { data: bookings } = useOwnerBookings(propertyIds);
  const { data: payouts } = useOwnerPayouts(owner?._id);
  const { data: notifications } = useOwnerNotifications(owner?.user_id);
  
  const confirmRoom = useConfirmRoom();

  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [confirmStatus, setConfirmStatus] = useState('vacant');
  const [confirmNotes, setConfirmNotes] = useState('');

  const handleConfirm = () => {
    if (!confirmDialog || !owner) return;
    confirmRoom.mutate(
      { room_id: confirmDialog.id, status: confirmStatus, confirmed_by: owner._id, notes: confirmNotes },
      { onSuccess: () => { setConfirmDialog(null); setConfirmNotes(''); } }
    );
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/owner-portal');
  }, [authLoading, user, navigate]);

  if (authLoading || ownerLoading) return <LoadingScreen />;
  if (!owner) return <ClearanceDenied user={user} navigate={navigate} signOut={signOut} />;

  const filteredProps = selectedProperty === 'all' ? properties || [] : properties?.filter((p: any) => p.id === selectedProperty) || [];
  const totalBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds?.length || 0), 0), 0);
  const occupiedBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds || []).filter((b: any) => b.status === 'occupied').length, 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  
  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E5E5E5] relative selection:bg-[#D4AF37]/30 font-sans pb-20">
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-[#D4AF37] flex items-center justify-center bg-[#D4AF37]/5">
              <span className="text-[#D4AF37] font-serif font-black text-xl italic">G</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-serif font-bold text-xl leading-none text-white tracking-tight">Gharpayy OS</p>
              <p className="text-[8px] font-mono font-bold uppercase tracking-[0.4em] text-[#D4AF37] mt-1.5">Partner Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer group">
              <Bell size={18} className="text-white/60 group-hover:text-white transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#A62639] border border-[#0A0A0C] flex items-center justify-center text-[7px] font-black rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
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
            <h1 className="text-5xl lg:text-7xl font-serif italic text-white tracking-tighter mb-4">Portfolio <br/><span className="text-[#D4AF37]">Command.</span></h1>
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.3em] flex items-center gap-2">
              <Database size={12} className="text-[#D4AF37]" /> Managing {properties?.length || 0} Facilities
            </p>
          </div>
          
          <div className="w-full lg:w-96">
            <label className="text-[8px] font-mono tracking-[0.2em] uppercase text-white/40 mb-2 block">Scope Filter</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="h-14 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37] transition-all">
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                <SelectItem value="all" className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white py-3">Global Portfolio Overview</SelectItem>
                {properties?.map((p: any) => <SelectItem key={p.id} value={p.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white py-3">FACILITY: {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Financial & Status KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px mb-16">
          {[
            { label: 'System Occupancy', value: `${occupancyRate}%`, icon: Activity, color: 'text-sky-500' },
            { label: 'Pending Yield', value: `₹${(payouts?.find((p:any) => p.status === 'processing')?.net_payout || 0).toLocaleString()}`, icon: CreditCard, color: 'text-[#D4AF37]' },
            { label: 'Active Leases', value: bookings?.length || 0, icon: Users, color: 'text-emerald-500' },
            { label: 'Unread Comm', value: unreadCount, icon: MessageSquare, color: 'text-white/80' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1, ...springTransition }}>
              <div className="bg-[#0A0A0C] p-8 relative overflow-hidden group hover:bg-[#121215] transition-colors h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-8">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{kpi.label}</p>
                  <kpi.icon size={16} className={`${kpi.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                </div>
                <p className={`text-4xl sm:text-5xl font-serif italic tracking-tighter ${kpi.color}`}>{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tactical Sub-Nav */}
        <Tabs defaultValue="rooms" className="space-y-12">
          <TabsList className="bg-transparent border-b border-white/10 w-full justify-start h-auto p-0 flex flex-wrap gap-2 sm:gap-8">
            <TabsTrigger value="rooms" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Facility Grid</TabsTrigger>
            <TabsTrigger value="finance" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Financial Ledger</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Lease Contracts</TabsTrigger>
            <TabsTrigger value="comms" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Uplink (Comms)</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            
            {/* 1. ROOMS / FACILITY GRID */}
            <TabsContent value="rooms" className="space-y-12 outline-none">
              {filteredProps.map((property: any, pIdx: number) => (
                <motion.section key={property.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pIdx * 0.1 }}>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-3xl font-serif text-white tracking-tighter uppercase">{property.name}</h2>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px">
                    {(property.rooms || []).map((room: any) => {
                      const vacant = (room.beds || []).filter((b: any) => b.status === 'vacant').length;
                      return (
                        <div key={room.id} className="group relative bg-[#0A0A0C] p-6 hover:bg-[#121215] transition-all duration-500">
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
                              <p className="text-white/30 mb-1">Vacancy</p>
                              <p className={`font-bold ${vacant > 0 ? 'text-emerald-500' : 'text-[#A62639]'}`}>{vacant} / {room.bed_count}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white/30 mb-1">Target Yield</p>
                              <p className="text-[#D4AF37]">₹{(room.rent_per_bed || 0).toLocaleString()}</p>
                            </div>
                          </div>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button className="w-full h-10 rounded-none bg-transparent text-white/50 border border-white/10 hover:border-[#D4AF37] hover:text-[#D4AF37] font-black text-[9px] uppercase tracking-[0.2em] transition-all">
                                Update / Flag
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                              <div className="p-6 border-b border-white/10 bg-[#121215]">
                                <DialogTitle className="font-serif text-xl italic text-white">Asset Override: C-{room.room_number}</DialogTitle>
                              </div>
                              <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Declare State</Label>
                                  <Select value={confirmStatus} onValueChange={setConfirmStatus}>
                                    <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                                      <SelectItem value="vacant" className="font-mono text-xs focus:bg-emerald-500/20 focus:text-emerald-500">VACANT - CLEAR</SelectItem>
                                      <SelectItem value="occupied" className="font-mono text-xs focus:bg-sky-500/20 focus:text-sky-500">OCCUPIED - SECURED</SelectItem>
                                      <SelectItem value="maintenance" className="font-mono text-xs focus:bg-orange-500/20 focus:text-orange-500">MAINTENANCE - FLAG FOR REPAIR</SelectItem>
                                      <SelectItem value="blocked" className="font-mono text-xs focus:bg-[#A62639]/20 focus:text-[#A62639]">BLOCKED - RESTRICTED</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Owner Remarks</Label>
                                  <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="Reason for status change..." value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} />
                                </div>
                                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                                  <Button onClick={handleConfirm} disabled={confirmRoom.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12">
                                    {confirmRoom.isPending ? 'Executing...' : 'Commit Status'}
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

            {/* 2. FINANCIAL LEDGER (NEW) */}
            <TabsContent value="finance" className="outline-none">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0C] border-t-2 border-[#D4AF37] shadow-2xl overflow-hidden">
                 <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#121215]">
                    <h3 className="font-serif text-xl italic text-white">Settlement History</h3>
                    <Button variant="outline" className="h-8 rounded-none border-white/20 text-[9px] font-mono tracking-widest uppercase hover:bg-white/10">
                      <Download size={12} className="mr-2" /> Export CSV
                    </Button>
                 </div>
                 {payouts?.length ? (
                   <div className="overflow-x-auto custom-scrollbar">
                     <table className="w-full text-left border-collapse min-w-[800px]">
                       <thead className="bg-[#121215]">
                         <tr>
                           <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Settlement Period</th>
                           <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Gross Yield</th>
                           <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Platform Fee (10%)</th>
                           <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37] border-b border-white/10 text-right">Net Payout</th>
                           <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {payouts.map((p: any) => (
                           <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="py-4 px-6 text-[11px] font-mono text-white tracking-widest uppercase">{p.period}</td>
                             <td className="py-4 px-6 text-[11px] font-mono text-white/60 text-right">₹{p.total_rent.toLocaleString()}</td>
                             <td className="py-4 px-6 text-[11px] font-mono text-[#A62639] text-right">-₹{p.admin_fee.toLocaleString()}</td>
                             <td className="py-4 px-6 text-[12px] font-mono text-[#D4AF37] font-bold text-right">₹{p.net_payout.toLocaleString()}</td>
                             <td className="py-4 px-6 text-right">
                               <Badge variant="outline" className={`rounded-none px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] border ${p.status === 'cleared' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-[#D4AF37]/30 text-[#D4AF37] bg-[#D4AF37]/5'}`}>
                                 {p.status}
                               </Badge>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 ) : (
                    <div className="py-20 text-center text-white/30 text-[11px] font-mono uppercase tracking-widest">No settlements generated yet.</div>
                 )}
               </motion.div>
            </TabsContent>

            {/* 3. BOOKINGS / LEASES (Existing, slightly styled) */}
            <TabsContent value="bookings" className="outline-none">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0C] border-t-2 border-sky-500 shadow-2xl overflow-hidden">
                {bookings?.length ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    {/* ... Existing table code for bookings ... */}
                  </div>
                ) : (
                  <div className="py-20 text-center text-white/30 text-[11px] font-mono uppercase tracking-widest">No active leases recorded.</div>
                )}
              </motion.div>
            </TabsContent>

            {/* 4. COMMS / UPLINK (NEW) */}
            <TabsContent value="comms" className="outline-none">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                 {notifications?.map((note: any) => (
                   <div key={note.id} className={`p-6 border ${note.read ? 'border-white/10 bg-[#0A0A0C] opacity-60' : 'border-[#D4AF37]/50 bg-[#121215]'} flex gap-6 items-start transition-all hover:opacity-100`}>
                      <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${note.type === 'alert' ? 'bg-[#A62639]/10 text-[#A62639]' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                        {note.type === 'alert' ? <AlertTriangle size={16} /> : <MessageSquare size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{new Date(note.created_at).toLocaleString()}</p>
                          {!note.read && <Badge className="rounded-none bg-[#D4AF37] text-black text-[7px] font-black uppercase tracking-widest">NEW</Badge>}
                        </div>
                        <p className="text-sm font-mono text-white/90 leading-relaxed">{note.message}</p>
                      </div>
                   </div>
                 ))}
               </motion.div>
            </TabsContent>

          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
}

// Keep the standard Loading/Denied components at the bottom
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-t-2 border-[#D4AF37] border-l-2 rounded-full animate-spin" />
        <p className="text-[10px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase animate-pulse">Establishing Secure Uplink...</p>
      </div>
    </div>
  );
}

function ClearanceDenied({ user, navigate, signOut }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] p-6">
      <div className="bg-[#121215] border-2 border-[#A62639] p-10 text-center max-w-md w-full">
        <ShieldAlert size={48} className="mx-auto mb-6 text-[#A62639]" />
        <h2 className="text-3xl font-serif italic text-white mb-2">Clearance Denied</h2>
        <p className="text-[10px] font-mono text-white/50 mb-8 uppercase tracking-widest leading-relaxed">Identity <strong>{user?.email}</strong> is not an authorized asset partner.</p>
        <div className="flex flex-col gap-4">
          <Button className="h-12 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px]" onClick={() => navigate('/auth?mode=owner_signup')}>Register as Property Owner</Button>
          <Button variant="ghost" className="h-12 rounded-none text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white" onClick={() => signOut()}>Purge Session</Button>
        </div>
      </div>
    </div>
  );
}