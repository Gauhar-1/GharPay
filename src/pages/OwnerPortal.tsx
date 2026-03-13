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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Bed, CheckCircle2, TrendingUp, Users,
  LogOut, Activity, ShieldAlert, Database, Wrench,
  Download, Plus, FileText, AlertTriangle, BookOpen,
  CheckCheck, RefreshCw, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  useOwnerTenants, useCheckoutTenant, useTenantIssues, useAllTenantIssues,
  useSubmitAsset, usePgRules, useUpsertPgRule, useDeletePgRule
} from '@/hooks/useTenantPortal';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };

const STATUS_THEME: Record<string, string> = {
  vacant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  occupied: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  maintenance: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  blocked: 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30',
};

const BOOKING_STATUS_THEME: Record<string, string> = {
  confirmed: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  checked_in: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  checked_out: 'bg-secondary text-muted-foreground border-border/50',
};

const ISSUE_STATUS_THEME: Record<string, string> = {
  open: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  in_progress: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  closed: 'bg-secondary text-muted-foreground border-border',
};

// ─── Local Hooks ─────────────────────────────────────────────────────────────

function useOwnerByUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['owner-by-user', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
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
      const { data, error } = await supabase
        .from('properties')
        .select('*, rooms(*, beds(*))')
        .eq('owner_id', ownerId!)  // FIX: was owner._id — now correctly owner.id
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

function useOwnerPayouts(propertyIds: string[]) {
  return useQuery({
    queryKey: ['owner-payouts', propertyIds],
    enabled: propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*, bookings(monthly_rent, property_id, properties(name))')
        .in('bookings.property_id', propertyIds)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerPortal() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const qc = useQueryClient();

  const { data: owner, isLoading: ownerLoading } = useOwnerByUser(user?.id);
  // CRITICAL FIX: was `owner?._id` — the column is `id`
  const { data: properties, isLoading: propertiesLoading } = useOwnerProperties(owner?.id);

  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [assetForm, setAssetForm] = useState({ name: '', address: '', capacity: '', asset_type: 'coliving' });
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ rule_text: '', category: 'general' });
  const [rulePropertyId, setRulePropertyId] = useState('');

  const submitAsset = useSubmitAsset();
  const checkoutTenant = useCheckoutTenant();
  const upsertRule = useUpsertPgRule();
  const deleteRule = useDeletePgRule();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/owner-portal');
  }, [authLoading, user, navigate]);

  const filteredProps = selectedProperty === 'all' ? (properties || []) :
    (properties || []).filter((p: any) => p.id === selectedProperty);

  const propertyIds = (properties || []).map((p: any) => p.id);
  const { data: tenants, isLoading: tenantsLoading } = useOwnerTenants(propertyIds);
  const { data: allIssues, isLoading: issuesLoading } = useAllTenantIssues();

  // Filter issues to this owner's properties
  const ownerIssues = (allIssues || []).filter((i: any) => propertyIds.includes(i.property_id));

  const { data: rules } = usePgRules(rulePropertyId || (properties?.[0]?.id));

  const totalBeds = filteredProps.reduce((s: number, p: any) =>
    s + (p.rooms || []).reduce((rs: number, r: any) => rs + (r.beds?.length || 0), 0), 0);
  const occupiedBeds = filteredProps.reduce((s: number, p: any) =>
    s + (p.rooms || []).reduce((rs: number, r: any) =>
      rs + (r.beds || []).filter((b: any) => b.status === 'occupied').length, 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const activeTenants = (tenants || []).filter((t: any) =>
    t.booking_status === 'confirmed' || t.booking_status === 'checked_in');
  const pendingIssues = ownerIssues.filter((i: any) => i.status === 'open' || i.status === 'in_progress');

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.address) { toast.error('Name and address required'); return; }
    try {
      await submitAsset.mutateAsync({
        owner_id: owner?.id,
        name: assetForm.name,
        address: assetForm.address,
        capacity: parseInt(assetForm.capacity) || 0,
        asset_type: assetForm.asset_type,
      });
      toast.success('Asset submitted to Admin pipeline for KYC & verification.');
      setAssetForm({ name: '', address: '', capacity: '', asset_type: 'coliving' });
      setAssetDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCheckout = async (bookingId: string, tenantName: string) => {
    if (!confirm(`Checkout ${tenantName}? This will release their bed back to inventory.`)) return;
    try {
      await checkoutTenant.mutateAsync({ bookingId });
      toast.success(`${tenantName} checked out successfully.`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const propId = rulePropertyId || properties?.[0]?.id;
    if (!ruleForm.rule_text || !propId) { toast.error('Please fill in rule text and select property'); return; }
    try {
      await upsertRule.mutateAsync({ property_id: propId, rule_text: ruleForm.rule_text, category: ruleForm.category });
      toast.success('Rule added');
      setRuleForm({ rule_text: '', category: 'general' });
    } catch (e: any) { toast.error(e.message); }
  };

  if (authLoading || ownerLoading) return <LoadingScreen />;
  if (!owner) return <ClearanceDenied user={user} navigate={navigate} signOut={signOut} />;

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
        {/* Header + Controls */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={springTransition}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl lg:text-7xl font-serif italic text-white tracking-tighter mb-4">
              Portfolio <br /><span className="text-[#D4AF37]">Command.</span>
            </h1>
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
                  {(properties || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id} className="font-mono text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit New Asset */}
            <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8">
                  <Plus size={14} className="mr-2" /> Link Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-[#121215]">
                  <DialogTitle className="font-serif text-2xl italic text-white">Asset Verification Pipeline</DialogTitle>
                  <p className="text-[10px] font-mono text-white/50 mt-2 tracking-widest uppercase">Submit for Admin KYC & platform induction.</p>
                </div>
                <form onSubmit={handleAssetSubmit} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Asset Name</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs"
                      value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Full Address</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs"
                      value={assetForm.address} onChange={e => setAssetForm(f => ({ ...f, address: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Capacity</Label>
                      <Input type="number" className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs"
                        value={assetForm.capacity} onChange={e => setAssetForm(f => ({ ...f, capacity: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Type</Label>
                      <Select value={assetForm.asset_type} onValueChange={v => setAssetForm(f => ({ ...f, asset_type: v }))}>
                        <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#121215] border-[#D4AF37]">
                          <SelectItem value="coliving">Co-Living</SelectItem>
                          <SelectItem value="pg">Traditional PG</SelectItem>
                          <SelectItem value="apartment">Full Apartment</SelectItem>
                          <SelectItem value="hostel">Hostel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={submitAsset.isPending} className="w-full h-12 rounded-none bg-[#D4AF37] text-black font-black uppercase tracking-widest text-[10px]">
                    {submitAsset.isPending ? <><Loader2 size={14} className="animate-spin mr-2" />Transmitting...</> : 'Submit to Admin Pipeline'}
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
            { label: 'Active Tenants', value: activeTenants.length, icon: Users, color: 'text-[#D4AF37]' },
            { label: 'Open Issues', value: pendingIssues.length, icon: Wrench, color: 'text-orange-500' },
            { label: 'Total Properties', value: properties?.length || 0, icon: Building2, color: 'text-emerald-500' },
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

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-12">
          <TabsList className="bg-transparent border-b border-white/10 w-full justify-start h-auto p-0 flex flex-wrap gap-2 sm:gap-8">
            {[
              { value: 'dashboard', label: 'Analytics' },
              { value: 'assets', label: 'Facilities' },
              { value: 'tenants', label: 'Tenant Directory' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'rules', label: 'House Rules' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 1. Analytics */}
          <TabsContent value="dashboard" className="space-y-8 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#121215] border border-white/10 p-8">
                <h3 className="font-serif text-xl italic text-white mb-8">Occupancy Overview</h3>
                <div className="flex items-end justify-between h-48 gap-4">
                  {filteredProps.slice(0, 5).map((p: any) => {
                    const total = (p.rooms || []).reduce((s: number, r: any) => s + (r.beds?.length || 0), 0);
                    const occ = (p.rooms || []).reduce((s: number, r: any) =>
                      s + (r.beds || []).filter((b: any) => b.status === 'occupied').length, 0);
                    const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
                    return (
                      <div key={p.id} className="flex-1 flex flex-col items-center gap-4">
                        <div className="w-full bg-white/5 h-full flex items-end">
                          <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={springTransition}
                            className={`w-full ${pct > 80 ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/40'} border-t-2 border-[#D4AF37]`} />
                        </div>
                        <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase truncate w-full text-center">{p.name?.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#121215] border border-white/10 p-8 flex flex-col justify-center">
                <h3 className="font-serif text-xl italic text-white mb-2">Portfolio Health</h3>
                <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-8">System diagnostic</p>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono tracking-widest uppercase mb-2">
                      <span className="text-white/60">Asset Utilization</span>
                      <span className="text-sky-500">{occupancyRate}%</span>
                    </div>
                    <div className="h-1 bg-white/10 w-full"><div className="h-full bg-sky-500" style={{ width: `${occupancyRate}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono tracking-widest uppercase mb-2">
                      <span className="text-white/60">Issue Resolution Rate</span>
                      <span className="text-emerald-500">
                        {ownerIssues.length > 0
                          ? Math.round((ownerIssues.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length / ownerIssues.length) * 100)
                          : 100}%
                      </span>
                    </div>
                    <div className="h-1 bg-white/10 w-full">
                      <div className="h-full bg-emerald-500" style={{
                        width: `${ownerIssues.length > 0
                          ? Math.round((ownerIssues.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length / ownerIssues.length) * 100)
                          : 100}%`
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 2. Facilities */}
          <TabsContent value="assets" className="space-y-12 outline-none">
            {propertiesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
              </div>
            ) : filteredProps.map((property: any) => (
              <div key={property.id}>
                <h2 className="text-3xl font-serif text-white tracking-tighter uppercase mb-6">{property.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 p-px">
                  {(property.rooms || []).map((room: any) => (
                    <div key={room.id} className="bg-[#0A0A0C] p-6">
                      <div className="flex justify-between mb-4">
                        <p className="text-2xl font-serif text-white">R-{room.room_number}</p>
                        <Badge className={`rounded-none px-2 py-0 text-[8px] font-black uppercase border ${STATUS_THEME[room.status] || STATUS_THEME['vacant']}`}>
                          {room.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-2">
                        ₹{(room.rent_per_bed || 0).toLocaleString()}/bed
                      </p>
                      <p className="text-[9px] font-mono text-white/30">
                        {(room.beds || []).filter((b: any) => b.status === 'vacant').length}/{room.beds?.length || 0} beds free
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredProps.length === 0 && !propertiesLoading && (
              <div className="text-center py-20 text-white/30">
                <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-mono text-sm uppercase tracking-widest">No facilities linked to your account</p>
                <p className="text-xs mt-2 opacity-60">Submit a new asset above to get started.</p>
              </div>
            )}
          </TabsContent>

          {/* 3. Tenants — REAL DATA */}
          <TabsContent value="tenants" className="outline-none">
            <div className="bg-[#0A0A0C] border-t-2 border-emerald-500 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-[#121215] flex justify-between items-center">
                <h3 className="font-serif text-xl italic text-white">Active Leases</h3>
                <Badge variant="outline" className="border-white/10 text-white/40 font-mono text-[9px]">
                  {activeTenants.length} active
                </Badge>
              </div>
              {tenantsLoading ? (
                <div className="p-12 flex justify-center"><Loader2 size={24} className="animate-spin text-[#D4AF37]" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#121215]">
                      <tr>
                        {['Tenant', 'Property / Unit', 'Move-in', 'Rent', 'Status', 'Actions'].map(h => (
                          <th key={h} className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(tenants || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="py-4 px-6">
                            <p className="font-serif text-white text-base">{t.leads?.name || 'Unknown'}</p>
                            <p className="text-[10px] font-mono text-white/40">{t.leads?.phone}</p>
                          </td>
                          <td className="py-4 px-6 text-[11px] font-mono text-white/60">
                            {t.properties?.name} · Rm {t.rooms?.room_number} · Bed {t.beds?.bed_number}
                          </td>
                          <td className="py-4 px-6 text-[10px] font-mono text-white/40">
                            {t.move_in_date ? format(new Date(t.move_in_date), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="py-4 px-6 font-mono text-sm text-[#D4AF37]">
                            ₹{(t.monthly_rent || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-6">
                            <Badge variant="outline" className={`rounded-none px-2 py-1 text-[8px] font-black uppercase border ${BOOKING_STATUS_THEME[t.booking_status] || 'border-white/10'}`}>
                              {t.booking_status?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-4 px-6">
                            {t.booking_status === 'checked_in' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-none border-[#A62639]/30 text-[#A62639] hover:bg-[#A62639]/20 text-[9px] font-black uppercase tracking-widest"
                                onClick={() => handleCheckout(t.id, t.leads?.name || 'Tenant')}
                                disabled={checkoutTenant.isPending}
                              >
                                {checkoutTenant.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Checkout'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(tenants || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-16 text-center font-mono text-[10px] uppercase tracking-widest text-white/20">
                            No active tenants
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 4. Maintenance — Real tenant_issues */}
          <TabsContent value="maintenance" className="outline-none">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl italic text-white">Maintenance & Issues</h3>
                <Badge variant="outline" className="border-orange-500/30 text-orange-500 font-mono text-[9px]">
                  {pendingIssues.length} pending
                </Badge>
              </div>
              {issuesLoading ? (
                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#D4AF37]" /></div>
              ) : ownerIssues.length === 0 ? (
                <div className="text-center py-16 text-white/20 font-mono text-[10px] uppercase tracking-widest">
                  <CheckCheck size={32} className="mx-auto mb-3" />
                  No issues reported — all clear!
                </div>
              ) : (
                ownerIssues.map((issue: any) => (
                  <div key={issue.id} className="bg-[#121215] border border-white/10 p-6 hover:border-orange-500/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest capitalize">{issue.category}</span>
                          <Badge variant="outline" className={`rounded-none px-2 text-[8px] font-black uppercase border ${ISSUE_STATUS_THEME[issue.status]}`}>
                            {issue.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="font-serif text-lg text-white">{issue.title}</p>
                        <p className="text-[10px] font-mono text-white/40 mt-1">{issue.tenant_name} · {issue.properties?.name}</p>
                        {issue.description && <p className="text-sm text-white/60 mt-2">{issue.description}</p>}
                      </div>
                      <span className="text-[9px] font-mono text-white/30">
                        {format(new Date(issue.created_at), 'MMM d')}
                      </span>
                    </div>
                    {issue.admin_response && (
                      <div className="mt-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                        <p className="text-[9px] font-mono text-[#D4AF37] uppercase tracking-widest mb-1">Admin Response</p>
                        <p className="text-sm text-white/70">{issue.admin_response}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* 5. House Rules */}
          <TabsContent value="rules" className="outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Rule Form */}
              <div className="bg-[#121215] border border-white/10 p-8">
                <h3 className="font-serif text-xl italic text-white mb-6">Add House Rule</h3>
                <form onSubmit={handleAddRule} className="space-y-4">
                  {properties && properties.length > 1 && (
                    <div>
                      <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Property</Label>
                      <Select value={rulePropertyId || properties[0]?.id} onValueChange={setRulePropertyId}>
                        <SelectTrigger className="mt-2 h-10 rounded-none bg-[#0A0A0C] border-white/10 text-white font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121215] border-[#D4AF37]">
                          {properties.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="font-mono text-xs">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Category</Label>
                    <Select value={ruleForm.category} onValueChange={v => setRuleForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="mt-2 h-10 rounded-none bg-[#0A0A0C] border-white/10 text-white font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121215] border-[#D4AF37]">
                        {['timing', 'food', 'guests', 'cleanliness', 'noise', 'payments', 'general'].map(c => (
                          <SelectItem key={c} value={c} className="font-mono text-xs capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Rule</Label>
                    <Textarea
                      className="mt-2 rounded-none bg-[#0A0A0C] border-white/10 text-white font-mono text-xs min-h-[80px]"
                      placeholder="e.g. No guests after 10 PM"
                      value={ruleForm.rule_text}
                      onChange={e => setRuleForm(f => ({ ...f, rule_text: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={upsertRule.isPending} className="w-full h-10 rounded-none bg-[#D4AF37] text-black font-black uppercase tracking-widest text-[10px]">
                    {upsertRule.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
                    Add Rule
                  </Button>
                </form>
              </div>

              {/* Rules List */}
              <div className="bg-[#0A0A0C] border border-white/10 p-8">
                <h3 className="font-serif text-xl italic text-white mb-6">Active Rules</h3>
                {!rules || rules.length === 0 ? (
                  <div className="text-center py-8 text-white/20 font-mono text-[10px] uppercase tracking-widest">
                    <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                    No rules added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule: any) => (
                      <div key={rule.id} className="flex items-start justify-between gap-4 p-4 border border-white/10 hover:border-white/20 transition-all">
                        <div>
                          <span className="text-[8px] font-mono uppercase tracking-widest text-[#D4AF37] mb-1 block">{rule.category}</span>
                          <p className="text-sm text-white/80">{rule.rule_text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none text-white/20 hover:text-[#A62639] hover:bg-[#A62639]/10 shrink-0"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <AlertTriangle size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

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
        <p className="text-[10px] font-mono text-white/50 mb-8 uppercase tracking-widest leading-relaxed">
          Identity <strong>{user?.email}</strong> is not an authorized asset partner.
        </p>
        <div className="flex flex-col gap-4">
          <Button className="h-12 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px]"
            onClick={() => navigate('/auth?mode=owner_signup')}>
            Register as Property Owner
          </Button>
          <Button variant="ghost" className="h-12 rounded-none text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white"
            onClick={() => signOut()}>
            Purge Session
          </Button>
        </div>
      </div>
    </div>
  );
}