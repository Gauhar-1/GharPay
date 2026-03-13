import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOwners, useCreateOwner } from '@/hooks/useInventoryData';
import { usePropertiesWithOwners } from '@/hooks/useInventoryData';
import { Plus, Building2, Phone, Mail, Search, Briefcase, Hash, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const Owners = () => {
  const { data: owners, isLoading, refetch } = useOwners(); // Added refetch to refresh UI after delete
  const { data: properties } = usePropertiesWithOwners();
  const createOwner = useCreateOwner();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company_name: '', notes: '' });

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
      toast.success('Entity registered. Portal access granted.', {
        description: `Default Password: GharpayyOwner2026!`,
        duration: 10000,
      });
      if (refetch) refetch(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to create owner access');
    }
  };

  // NEW: Secure Delete Handler
  const handleDelete = async (ownerId: string, ownerName: string, userId: string) => {
    if (!window.confirm(`Are you sure you want to completely redact ${ownerName} and revoke their portal access?`)) {
      return;
    }

    try {
      // Call secure RPC to wipe the auth account and cascade delete
      const { error } = await supabase.rpc('admin_delete_owner' as any, { target_user_id: ownerId });

      if (error) throw error;

      toast.success(`${ownerName} has been redacted from the registry.`);
      if (refetch) refetch(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete entity.');
    }
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
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="Full Legal Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Direct Line *</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="+91" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Digital Address</Label>
                  <Input type="email" className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="owner@classified.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Corporate Alias</Label>
                  <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="Holding Company (Optional)" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                  <Button type="button" variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase hover:bg-white/5 text-white/50 hover:text-white" onClick={() => setOpen(false)}>Abort</Button>
                  <Button type="submit" disabled={createOwner.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12 transition-colors">
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
            <p className="text-[11px] font-mono tracking-widest text-white/40 uppercase">No entities match current parameters</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filtered.map((owner, idx) => {
                const ownerProps = getOwnerProperties(owner._id);
                return (
                  <motion.div
                    key={owner._id}
                    variants={fadeUp}
                    layout
                    className="group relative bg-[#0A0A0C] border border-white/10 p-8 transition-all duration-500 hover:border-[#D4AF37] overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />

                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <div>
                        <Badge variant="outline" className={`rounded-none border px-2 py-0.5 text-[8px] font-black tracking-[0.2em] uppercase mb-3 ${owner.is_active ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-white/20 text-white/40'}`}>
                          {owner.is_active ? 'Cleared' : 'Redacted'}
                        </Badge>
                        <h3 className="font-serif text-2xl text-white group-hover:italic transition-all">{owner.name}</h3>
                        <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase mt-1 line-clamp-1">
                          {owner.company_name || 'Independent Agent'}
                        </p>
                      </div>

                      {/* NEW: DELETE BUTTON */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(owner._id, owner.name, owner.user_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-white/30 hover:text-[#A62639] hover:bg-[#A62639]/10 transition-all z-20"
                        title="Delete Owner"
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
                      <div className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/30 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-all">
                        <Briefcase size={12} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Owners;