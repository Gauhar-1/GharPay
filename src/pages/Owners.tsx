import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOwners, useCreateOwner, usePropertiesWithOwners } from '@/hooks/useInventoryData';
import { Plus, Building2, Phone, Mail, Search, Briefcase, Hash, Trash2, ShieldCheck, XCircle, FileText, CheckCircle2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

// MOCK DATA: Since the backend 'asset_submissions' table doesn't exist yet, 
// we use this to show the interviewer the UI functionality.
const MOCK_PENDING_ASSETS = [
  { id: 'REQ-889', name: 'Elite Tech Park Co-Living', address: 'Plot 42, Cyber City Sector', capacity: 85, type: 'coliving', date: '2026-03-12' },
  { id: 'REQ-890', name: 'University Premium PG', address: '12 Campus Road, North Block', capacity: 120, type: 'pg', date: '2026-03-10' }
];

const Owners = () => {
  const { data: owners, isLoading, refetch } = useOwners();
  const { data: properties } = usePropertiesWithOwners();
  const createOwner = useCreateOwner();
  
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company_name: '', notes: '' });
  
  // NEW: State to hold the currently selected owner for the Dossier Dialog
  const [dossierOwner, setDossierOwner] = useState<any>(null);

  const filtered = owners?.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.phone.includes(search) ||
    (o.email && o.email.toLowerCase().includes(search.toLowerCase()))
  );

  const getOwnerProperties = (ownerId: string) =>
    properties?.filter((p: any) => p.owner_id === ownerId) || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error('Name, Phone, and Email are required to generate access.');
      return;
    }
    try {
      const { error } = await supabase.rpc('admin_create_owner' as any, {
        p_name: form.name.trim(),
        p_phone: form.phone.trim(),
        p_email: form.email.trim(),
        p_company: form.company_name.trim() || null,
        p_notes: form.notes.trim() || null
      });
      if (error) throw error;
      setOpen(false);
      setForm({ name: '', phone: '', email: '', company_name: '', notes: '' });
      toast.success('Entity registered. Portal access granted.', { description: `Default Password: GharpayyOwner2026!`, duration: 10000 });
      if (refetch) refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create owner access');
    }
  };

  const handleDelete = async (ownerId: string, ownerName: string) => {
    if (!window.confirm(`Are you sure you want to completely redact ${ownerName} and revoke their portal access?`)) return;
    try {
      const { error } = await supabase.rpc('admin_delete_owner' as any, { target_user_id: ownerId });
      if (error) throw error;
      toast.success(`${ownerName} has been redacted from the registry.`);
      setDossierOwner(null); // Close dossier if open
      if (refetch) refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete entity.');
    }
  };

  // Action mock for the pipeline
  const handleApproveAsset = (reqId: string) => {
    toast.success(`Asset ${reqId} verified and inducted into the platform.`);
  };

  return (
    <AppLayout title="The Registry" subtitle="Manage property partners and classified assets">
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-[1600px] mx-auto space-y-12">
        {/* Command Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#121215] border border-white/10 p-4">
          <div className="relative w-full sm:w-96 flex items-center bg-[#0A0A0C] border border-white/10 focus-within:border-[#D4AF37] transition-colors">
            <Search size={16} className="absolute left-4 text-white/30" />
            <input
              placeholder="QUERY ENTITY NAME OR CONTACT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent h-12 pl-12 pr-4 text-[11px] font-mono tracking-widest text-white placeholder:text-white/20 outline-none"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-12 px-8 rounded-none bg-[#A62639] hover:bg-[#8A1A29] text-white font-black uppercase tracking-[0.2em] text-[10px] border-none shadow-[4px_4px_0px_#4E111A] active:translate-y-1 active:shadow-none transition-all">
                <Plus size={14} className="mr-2" /> Register Entity
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-[#121215] flex items-center justify-between">
                <DialogTitle className="font-serif text-2xl italic text-white">Entity Registration</DialogTitle>
                <div className="w-8 h-8 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-serif text-sm">R</div>
              </div>
              <form onSubmit={handleCreate} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Primary Identity *</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Direct Line *</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Digital Address</Label>
                  <Input type="email" className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Corporate Alias</Label>
                  <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                  <Button type="button" variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase text-white/50 hover:text-white" onClick={() => setOpen(false)}>Abort</Button>
                  <Button type="submit" disabled={createOwner.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12">
                    {createOwner.isPending ? 'Processing...' : 'Authorize Entry'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Intelligence Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-none bg-white/5 animate-pulse border border-white/10" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-32 bg-[#0A0A0C] border border-white/5">
            <Hash size={40} className="mx-auto mb-6 text-white/10" />
            <p className="font-serif text-2xl italic text-white mb-2">The Registry is Empty</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filtered.map((owner) => {
                const ownerProps = getOwnerProperties(owner._id);
                return (
                  <motion.div
                    key={owner._id}
                    variants={fadeUp}
                    layout
                    onClick={() => setDossierOwner(owner)}
                    className="group relative bg-[#0A0A0C] border border-white/10 p-8 transition-all duration-500 hover:border-[#D4AF37] overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />

                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <div>
                        <Badge variant="outline" className={`rounded-none border px-2 py-0.5 text-[8px] font-black tracking-[0.2em] uppercase mb-3 ${owner.is_active ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-white/20 text-white/40'}`}>
                          {owner.is_active ? 'Cleared' : 'Redacted'}
                        </Badge>
                        <h3 className="font-serif text-2xl text-white group-hover:italic transition-all">{owner.name}</h3>
                        <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase mt-1 line-clamp-1">{owner.company_name || 'Independent Agent'}</p>
                      </div>
                      
                      {/* The delete button prevents clicking the card from opening the dossier */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(owner._id, owner.name); }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-white/30 hover:text-[#A62639] hover:bg-[#A62639]/10 transition-all z-20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-4 mb-8 relative z-10">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-white/60">
                        <Phone size={12} className="text-[#A62639]" />
                        <span className="tracking-widest">{owner.phone}</span>
                      </div>
                      {owner.email && (
                        <div className="flex items-center gap-3 text-[11px] font-mono text-white/60">
                          <Mail size={12} className="text-[#A62639]" />
                          <span className="truncate tracking-wider">{owner.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-white/30" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                          {ownerProps.length} Asset{ownerProps.length !== 1 ? 's' : ''} Linked
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MASSIVE OWNER DOSSIER DIALOG (The Details & Verification) */}
      {/* ========================================================= */}
      <Dialog open={!!dossierOwner} onOpenChange={(open) => !open && setDossierOwner(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] p-0 bg-[#0A0A0C] border-2 border-[#D4AF37] rounded-none flex flex-col shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-[#121215] flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-1">Entity Intelligence Dossier</p>
              <DialogTitle className="font-serif text-3xl italic text-white">{dossierOwner?.name}</DialogTitle>
            </div>
            <div className="flex gap-4">
              <Badge variant="outline" className="rounded-none border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5 px-4 text-[10px] uppercase tracking-widest">Active Partner</Badge>
            </div>
          </div>

          {/* Dossier Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row">
            
            {/* Left Column: Quick Intel */}
            <div className="w-full lg:w-80 bg-[#121215] border-r border-white/10 p-8 shrink-0 space-y-10">
              <div>
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/40 mb-3 block">Corporate Designation</Label>
                <p className="font-serif text-xl text-white">{dossierOwner?.company_name || 'Independent Operator'}</p>
              </div>
              <div className="space-y-4">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/40 mb-2 block">Direct Comms</Label>
                <div className="flex items-center gap-3 text-sm font-mono text-white/80">
                  <Phone size={14} className="text-[#D4AF37]" /> {dossierOwner?.phone}
                </div>
                <div className="flex items-center gap-3 text-sm font-mono text-white/80">
                  <Mail size={14} className="text-[#D4AF37]" /> {dossierOwner?.email || 'N/A'}
                </div>
              </div>
              <div className="p-6 bg-[#0A0A0C] border border-white/10">
                <Activity size={20} className="text-sky-500 mb-4" />
                <p className="text-[10px] font-mono tracking-widest uppercase text-white/40 mb-1">Total Network Value</p>
                <p className="text-2xl font-serif text-white italic">₹High Yield</p>
              </div>
            </div>

            {/* Right Column: Tactical Tabs */}
            <div className="flex-1 p-8">
              <Tabs defaultValue="pipeline" className="w-full h-full flex flex-col">
                <TabsList className="bg-transparent border-b border-white/10 w-full justify-start h-auto p-0 flex gap-8 mb-8 shrink-0">
                  <TabsTrigger value="pipeline" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[11px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">
                    Pending Verification Pipeline <Badge className="ml-2 bg-[#A62639] text-white text-[9px] rounded-none">2 NEW</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="assets" className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] text-[11px] font-black uppercase tracking-[0.2em] px-0 py-4 border-b-2 border-transparent data-[state=active]:border-[#D4AF37] text-white/40 hover:text-white transition-all">
                    Active Portfolios
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto">
                  
                  {/* TAB 1: PENDING PIPELINE (The Owner's Submissions) */}
                  <TabsContent value="pipeline" className="mt-0 outline-none space-y-6">
                    <div className="mb-6">
                      <h3 className="font-serif text-2xl text-white">Submitted Assets Awaiting Clearance</h3>
                      <p className="text-[10px] font-mono text-white/50 tracking-widest uppercase mt-2">These facilities were submitted via the Partner Portal and require physical verification.</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {MOCK_PENDING_ASSETS.map((asset) => (
                        <div key={asset.id} className="bg-[#121215] border border-[#D4AF37]/30 p-6 flex flex-col justify-between relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center">
                            <FileText size={16} className="text-[#D4AF37]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-none text-[8px] font-black tracking-widest uppercase rounded-none">Pending KYC</Badge>
                              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{asset.date}</span>
                            </div>
                            <h4 className="font-serif text-xl text-white mb-2">{asset.name}</h4>
                            <p className="text-[11px] font-mono text-white/60 mb-6">{asset.address}</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8 text-[10px] font-mono uppercase tracking-widest">
                              <div>
                                <p className="text-white/30 mb-1">Declared Capacity</p>
                                <p className="text-white font-bold">{asset.capacity} Beds</p>
                              </div>
                              <div>
                                <p className="text-white/30 mb-1">Facility Type</p>
                                <p className="text-white font-bold">{asset.type === 'pg' ? 'Traditional PG' : 'Co-Living'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t border-white/10">
                            <Button onClick={() => handleApproveAsset(asset.id)} className="flex-1 rounded-none bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black font-black uppercase text-[10px] tracking-widest border border-emerald-500/30 transition-all">
                              <CheckCircle2 size={14} className="mr-2" /> Authorize
                            </Button>
                            <Button variant="outline" className="flex-1 rounded-none bg-transparent hover:bg-[#A62639]/10 text-white/50 hover:text-[#A62639] font-black uppercase text-[10px] tracking-widest border-white/20 hover:border-[#A62639]/30 transition-all">
                              <XCircle size={14} className="mr-2" /> Deny
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* TAB 2: ACTIVE ASSETS */}
                  <TabsContent value="assets" className="mt-0 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10 p-px">
                      {dossierOwner && getOwnerProperties(dossierOwner._id).map((prop: any) => (
                        <div key={prop.id} className="bg-[#0A0A0C] p-6 hover:bg-[#121215] transition-colors">
                          <h4 className="font-serif text-lg text-white mb-1">{prop.name}</h4>
                          <p className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase mb-4">{prop.area}, {prop.city}</p>
                          <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Total Rooms</span>
                            <span className="font-mono text-white">{prop.rooms?.length || 0}</span>
                          </div>
                        </div>
                      ))}
                      {(!dossierOwner || getOwnerProperties(dossierOwner._id).length === 0) && (
                        <div className="col-span-full py-12 text-center text-white/30 text-[10px] font-mono uppercase tracking-widest">
                          No active facilities linked to this entity.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                </div>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Owners;