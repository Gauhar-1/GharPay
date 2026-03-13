import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Bed, CheckCircle2, TrendingUp, Users,
  LogOut, AlertTriangle, Activity, ShieldAlert, Hash, 
  Database, Bell, MessageSquare, CreditCard, Wrench, Download, Plus, FileText
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

function useSubmitAsset() {
  return useMutation({
    mutationFn: async (payload: any) => {
      // In a real system, this goes to an 'asset_submissions' table for Admin review
      toast.success('Asset dossier submitted to Admin for verification and KYC.');
      return true;
    }
  });
}

// Mocking the complex relational data for the new tabs to ensure UI compiles flawlessly
const MOCK_TENANTS = [
  { id: 1, name: 'Rahul Sharma', room: 'C-101', status: 'Active', rent_due: 0, kyc: 'Verified', lease_end: '2026-12-01' },
  { id: 2, name: 'Vikram Singh', room: 'C-102', status: 'Notice', rent_due: 12500, kyc: 'Verified', lease_end: '2026-04-15' },
  { id: 3, name: 'Priya Patel', room: 'C-201', status: 'Active', rent_due: 0, kyc: 'Verified', lease_end: '2027-01-10' },
];

const MOCK_MAINTENANCE = [
  { id: 'TKT-092', room: 'C-102', issue: 'HVAC Failure', cost: 4500, status: 'Pending Approval', date: '2026-03-12' },
  { id: 'TKT-088', room: 'C-201', issue: 'Plumbing Leak', cost: 1200, status: 'Resolved', date: '2026-03-01' },
];

const MOCK_PAYOUTS = [
  { id: 1, period: 'Feb 2026', gross: 245000, fee: 24500, repairs: 1200, net: 219300, status: 'Cleared' },
  { id: 2, period: 'Jan 2026', gross: 240000, fee: 24000, repairs: 0, net: 216000, status: 'Cleared' },
  { id: 3, period: 'Dec 2025', gross: 225000, fee: 22500, repairs: 4500, net: 198000, status: 'Cleared' },
];

const STATUS_THEME: Record<string, string> = {
  vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  occupied: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  maintenance: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  blocked: 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30',
};

export default function OwnerPortal() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: owner, isLoading: ownerLoading } = useOwnerByUser(user?.id);
  const { data: properties } = useOwnerProperties(owner?._id);
  const submitAsset = useSubmitAsset();

  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [assetForm, setAssetForm] = useState({ name: '', address: '', type: 'coliving', capacity: '' });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/owner-portal');
  }, [authLoading, user, navigate]);

  if (authLoading || ownerLoading) return <LoadingScreen />;
  if (!owner) return <ClearanceDenied user={user} navigate={navigate} signOut={signOut} />;

  const filteredProps = selectedProperty === 'all' ? properties || [] : properties?.filter((p: any) => p.id === selectedProperty) || [];
  const totalBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds?.length || 0), 0), 0);
  const occupiedBeds = filteredProps.reduce((s: number, p: any) => s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds || []).filter((b: any) => b.status === 'occupied').length, 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

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
              <p className="text-[8px] font-mono font-bold uppercase tracking-[0.4em] text-[#D4AF37] mt-1.5">Asset Partner</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 bg-[#121215] px-4 py-2 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">ID: {owner.name}</span>
            </div>
            <Button variant="ghost" size="icon" className="rounded-none border border-white/10 hover:bg-[#A62639]/20 hover:text-[#A62639] transition-all" onClick={() => signOut()}>
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
          
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="w-full lg:w-64">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="h-14 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-[#D4AF37]">
                  <SelectValue placeholder="All Assets" />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                  <SelectItem value="all" className="font-mono text-xs">Global Portfolio</SelectItem>
                  {properties?.map((p: any) => <SelectItem key={p.id} value={p.id} className="font-mono text-xs">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Link New Asset Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-14 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8">
                  <Plus size={14} className="mr-2" /> Link Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-[#121215]">
                  <DialogTitle className="font-serif text-2xl italic text-white">Asset Verification Pipeline</DialogTitle>
                  <p className="text-[10px] font-mono text-white/50 mt-2 tracking-widest uppercase">Submit property details for Admin KYC and platform induction.</p>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); submitAsset.mutate(assetForm); }} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Asset Name/Designation</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Full Address</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Expected Capacity</Label>
                      <Input type="number" className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Asset Type</Label>
                      <Select defaultValue="coliving">
                        <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#121215] border-[#D4AF37]">
                          <SelectItem value="coliving">Co-Living Space</SelectItem>
                          <SelectItem value="pg">Traditional PG</SelectItem>
                          <SelectItem value="apartment">Full Apartment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={submitAsset.isPending} className="w-full h-12 rounded-none bg-[#D4AF37] text-black font-black uppercase tracking-widest text-[10px]">
                    {submitAsset.isPending ? 'Transmitting...' : 'Submit to Admin Pipeline'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px mb-16">
          {[
            { label: 'System Occupancy', value: `${occupancyRate}%`, icon: Activity, color: 'text-sky-500' },
            { label: 'Est. Monthly Yield', value: '₹245,000', icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Active Tenants', value: MOCK_TENANTS.length, icon: Users, color: 'text-[#D4AF37]' },
            { label: 'Pending Repairs', value: 1, icon: Wrench, color: 'text-orange-500' },
          ].map((kpi, i) => (
            <div key={i} className="bg-[#0A0A0C] p-8 relative overflow-hidden group hover:bg-[#121215] transition-colors">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{kpi.label}</p>
                <kpi.icon size={16} className={`${kpi.color} opacity-50`} />
              </div>
              <p className={`text-4xl sm:text-5xl font-serif italic tracking-tighter ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tactical Sub-Nav */}
        <Tabs defaultValue="dashboard" className="space-y-12">
          <TabsList className="bg-transparent border-b border-white/10 w-full justify-start h-auto p-0 flex flex-wrap gap-2 sm:gap-8">
            <TabsTrigger value="dashboard" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Analytics</TabsTrigger>
            <TabsTrigger value="assets" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Facilities</TabsTrigger>
            <TabsTrigger value="tenants" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Tenant Directory</TabsTrigger>
            <TabsTrigger value="finance" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Financial Ledger</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">Ops & Repairs</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD / ANALYTICS */}
            <TabsContent value="dashboard" className="space-y-8 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Custom Native Tailwind Bar Chart for Reliability */}
                <div className="bg-[#121215] border border-white/10 p-8">
                  <h3 className="font-serif text-xl italic text-white mb-8">Yield Trajectory (Q1)</h3>
                  <div className="flex items-end justify-between h-48 gap-4">
                    {[
                      { month: 'Nov', val: 60 }, { month: 'Dec', val: 75 }, 
                      { month: 'Jan', val: 90 }, { month: 'Feb', val: 85 }, 
                      { month: 'Mar', val: 100 }
                    ].map((bar) => (
                      <div key={bar.month} className="flex-1 flex flex-col items-center gap-4">
                        <div className="w-full bg-white/5 relative h-full flex items-end">
                          <motion.div 
                            initial={{ height: 0 }} animate={{ height: `${bar.val}%` }} transition={springTransition}
                            className={`w-full ${bar.val === 100 ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/40'} border-t-2 border-[#D4AF37]`}
                          />
                        </div>
                        <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#121215] border border-white/10 p-8 flex flex-col justify-center">
                  <h3 className="font-serif text-xl italic text-white mb-2">Portfolio Health</h3>
                  <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-8">System diagnostic</p>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono tracking-widest uppercase mb-2">
                        <span className="text-white/60">Rent Collection</span>
                        <span className="text-emerald-500">92%</span>
                      </div>
                      <div className="h-1 bg-white/10 w-full"><div className="h-full bg-emerald-500 w-[92%]" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-mono tracking-widest uppercase mb-2">
                        <span className="text-white/60">Asset Utilization</span>
                        <span className="text-sky-500">{occupancyRate}%</span>
                      </div>
                      <div className="h-1 bg-white/10 w-full"><div className="h-full bg-sky-500" style={{ width: `${occupancyRate}%`}} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 2. ASSETS / FACILITIES (Your existing grid, refined) */}
            <TabsContent value="assets" className="space-y-12 outline-none">
               {filteredProps.map((property: any) => (
                 <div key={property.id}>
                    <h2 className="text-3xl font-serif text-white tracking-tighter uppercase mb-6">{property.name}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px">
                      {(property.rooms || []).map((room: any) => (
                        <div key={room.id} className="bg-[#0A0A0C] p-6">
                          <div className="flex justify-between mb-4">
                            <p className="text-2xl font-serif text-white">C-{room.room_number}</p>
                            <Badge className={`rounded-none px-2 py-0 text-[8px] font-black uppercase border ${STATUS_THEME[room.status]}`}>{room.status}</Badge>
                          </div>
                          <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-6">Yield: ₹{(room.rent_per_bed || 0).toLocaleString()}/bed</p>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
            </TabsContent>

            {/* 3. TENANTS (NEW) */}
            <TabsContent value="tenants" className="outline-none">
              <div className="bg-[#0A0A0C] border-t-2 border-emerald-500 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-[#121215]">
                  <h3 className="font-serif text-xl italic text-white">Active Leases & KYC</h3>
                </div>
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#121215]">
                    <tr>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Tenant Identity</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Unit Assignment</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Lease Expiry</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Rent Arrears</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">KYC/Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {MOCK_TENANTS.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="py-4 px-6">
                          <p className="font-serif text-white text-base">{t.name}</p>
                        </td>
                        <td className="py-4 px-6 text-[11px] font-mono text-white/60 tracking-widest">{t.room}</td>
                        <td className="py-4 px-6 text-[10px] font-mono text-white/40 uppercase tracking-widest">{t.lease_end}</td>
                        <td className="py-4 px-6 text-right font-mono text-xs">
                          {t.rent_due > 0 ? <span className="text-[#A62639]">₹{t.rent_due.toLocaleString()}</span> : <span className="text-emerald-500">Cleared</span>}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Badge variant="outline" className="rounded-none px-2 py-1 text-[8px] font-black uppercase tracking-widest border-sky-500/30 text-sky-500">{t.kyc}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* 4. FINANCIAL LEDGER */}
            <TabsContent value="finance" className="outline-none">
              <div className="bg-[#0A0A0C] border-t-2 border-[#D4AF37] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#121215]">
                  <h3 className="font-serif text-xl italic text-white">Settlement Ledger</h3>
                  <Button variant="outline" className="h-8 rounded-none border-white/20 text-[9px] font-mono tracking-widest uppercase hover:bg-white/10"><Download size={12} className="mr-2" /> Export CSV</Button>
                </div>
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#121215]">
                    <tr>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Period</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Gross Rent</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Platform Fee (10%)</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 text-right">Repairs Deducted</th>
                      <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37] border-b border-white/10 text-right">Net Transferred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {MOCK_PAYOUTS.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-4 px-6 text-[11px] font-mono text-white tracking-widest uppercase">{p.period}</td>
                        <td className="py-4 px-6 text-[11px] font-mono text-white/60 text-right">₹{p.gross.toLocaleString()}</td>
                        <td className="py-4 px-6 text-[11px] font-mono text-[#A62639] text-right">-₹{p.fee.toLocaleString()}</td>
                        <td className="py-4 px-6 text-[11px] font-mono text-orange-500 text-right">-₹{p.repairs.toLocaleString()}</td>
                        <td className="py-4 px-6 text-[12px] font-mono text-[#D4AF37] font-bold text-right">₹{p.net.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* 5. MAINTENANCE (NEW) */}
            <TabsContent value="maintenance" className="outline-none">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-4">
                   {MOCK_MAINTENANCE.map((tkt) => (
                     <div key={tkt.id} className="bg-[#121215] border border-white/10 p-6 flex items-center justify-between hover:border-orange-500/50 transition-colors cursor-pointer">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{tkt.id}</span>
                            <Badge variant="outline" className="rounded-none border-white/10 text-white/40 text-[8px] uppercase tracking-widest">{tkt.room}</Badge>
                          </div>
                          <p className="font-serif text-lg text-white">{tkt.issue}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono tracking-widest uppercase text-white/40 mb-1">{tkt.status}</p>
                          <p className="font-mono text-sm text-white">Est. ₹{tkt.cost.toLocaleString()}</p>
                        </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="bg-[#0A0A0C] border border-white/10 p-8 h-fit">
                    <h3 className="font-serif text-xl italic text-white mb-6">Authorize Repair</h3>
                    <p className="text-[10px] font-mono tracking-widest uppercase text-white/40 mb-6 leading-relaxed">
                      Admins handle contractor dispatch. Review quotes and approve deductions from your next settlement cycle here.
                    </p>
                    <Button disabled className="w-full h-12 rounded-none bg-white/5 text-white/30 font-black uppercase tracking-widest text-[10px] border border-white/10">
                      No Pending Approvals
                    </Button>
                 </div>
               </div>
            </TabsContent>

          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
}

// Ensure you keep your LoadingScreen and ClearanceDenied components here at the bottom...
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