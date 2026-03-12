import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAllRoomsWithDetails, useCreateRoom, useConfirmRoomStatus, useUpdateRoom } from '@/hooks/useInventoryData';
import { usePropertiesWithOwners } from '@/hooks/useInventoryData';
import { Plus, Search, Bed, Lock, Unlock, CheckCircle2, AlertTriangle, Home, Filter, RefreshCw, Hash, Database } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  vacant: { label: 'VACANT', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 },
  vacating: { label: 'VACATING', color: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30', icon: AlertTriangle },
  occupied: { label: 'OCCUPIED', color: 'bg-sky-500/10 text-sky-500 border-sky-500/30', icon: Home },
  blocked: { label: 'BLOCKED', color: 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30', icon: Lock },
};

const Inventory = () => {
  const { data: rooms, isLoading } = useAllRoomsWithDetails();
  const { data: properties } = usePropertiesWithOwners();
  const createRoom = useCreateRoom();
  const confirmStatus = useConfirmRoomStatus();
  const updateRoom = useUpdateRoom();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lockedFilter, setLockedFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ property_id: '', room_number: '', floor: '', bed_count: '1', room_type: '', expected_rent: '', actual_rent: '', notes: '' });
  const [confirmForm, setConfirmForm] = useState({ status: 'vacant', notes: '' });

  const filtered = useMemo(() => {
    if (!rooms) return [];
    return rooms.filter((r: any) => {
      const matchSearch = r.room_number.toLowerCase().includes(search.toLowerCase()) ||
        r.properties?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.properties?.owners?.name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchLocked = lockedFilter === 'all' ||
        (lockedFilter === 'locked' && r.auto_locked) ||
        (lockedFilter === 'unlocked' && !r.auto_locked);
      return matchSearch && matchStatus && matchLocked;
    });
  }, [rooms, search, statusFilter, lockedFilter]);

  const stats = useMemo(() => {
    if (!rooms) return { total: 0, vacant: 0, vacating: 0, occupied: 0, blocked: 0, locked: 0 };
    return {
      total: rooms.length,
      vacant: rooms.filter((r: any) => r.status === 'vacant' && !r.auto_locked).length,
      vacating: rooms.filter((r: any) => r.status === 'vacating').length,
      occupied: rooms.filter((r: any) => r.status === 'occupied').length,
      blocked: rooms.filter((r: any) => r.status === 'blocked').length,
      locked: rooms.filter((r: any) => r.auto_locked).length,
    };
  }, [rooms]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.property_id || !form.room_number.trim()) { toast.error('Property mapping and room designation required'); return; }
    try {
      await createRoom.mutateAsync({
        property_id: form.property_id,
        room_number: form.room_number.trim(),
        floor: form.floor.trim() || null,
        bed_count: parseInt(form.bed_count) || 1,
        room_type: form.room_type.trim() || null,
        expected_rent: form.expected_rent ? parseFloat(form.expected_rent) : null,
        actual_rent: form.actual_rent ? parseFloat(form.actual_rent) : null,
        notes: form.notes.trim() || null,
      });
      setAddOpen(false);
      setForm({ property_id: '', room_number: '', floor: '', bed_count: '1', room_type: '', expected_rent: '', actual_rent: '', notes: '' });
      toast.success('Asset cell successfully mapped to registry.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirm = async (roomId: string) => {
    try {
      await confirmStatus.mutateAsync({
        room_id: roomId,
        status: confirmForm.status,
        notes: confirmForm.notes.trim() || null,
      });
      setConfirmOpen(null);
      setConfirmForm({ status: 'vacant', notes: '' });
      toast.success('Intelligence log updated. Status confirmed.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout title="Asset Database" subtitle="Real-time structural inventory & capacity tracking">
      
      {/* Texture: Subtle Victorian Wallpaper Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-[1600px] mx-auto space-y-12">
        
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#121215] border border-white/10 p-4">
          
          {/* Diagnostic Stats */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase">
             <div className="flex items-center gap-2"><span className="text-white">{stats.total}</span> Cells</div>
             <span className="w-1 h-1 bg-white/20 rounded-full" />
             <div className="flex items-center gap-2 text-emerald-500"><span className="font-bold">{stats.vacant}</span> Vacant</div>
             <span className="w-1 h-1 bg-white/20 rounded-full" />
             <div className="flex items-center gap-2 text-[#D4AF37]"><span className="font-bold">{stats.vacating}</span> Vacating</div>
             <span className="w-1 h-1 bg-white/20 rounded-full" />
             <div className="flex items-center gap-2 text-[#A62639]"><span className="font-bold">{stats.locked}</span> Secured Locks</div>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto h-12 px-8 rounded-none bg-[#A62639] hover:bg-[#8A1A29] text-white font-black uppercase tracking-[0.2em] text-[10px] border-none shadow-[4px_4px_0px_#4E111A] active:translate-y-1 active:shadow-none transition-all">
                <Plus size={14} className="mr-2" /> Map New Cell
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[600px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-[#121215] flex items-center justify-between">
                <DialogTitle className="font-serif text-2xl italic text-white">Asset Registration Protocol</DialogTitle>
                <Hash className="text-[#D4AF37]" size={20} />
              </div>
              
              <form onSubmit={handleAddRoom} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Designated Property *</Label>
                  <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                    <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37]">
                      <SelectValue placeholder="Select primary asset..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-none bg-[#121215] border border-[#D4AF37]">
                      {properties?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white">
                          {p.name} {p.area ? `[${p.area}]` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Cell ID *</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="e.g. 301" value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Level</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="e.g. 3rd" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Capacity</Label>
                    <Input type="number" min={1} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" value={form.bed_count} onChange={e => setForm(f => ({ ...f, bed_count: e.target.value }))} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Class</Label>
                    <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="Single / Double" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Target Value ₹</Label>
                    <Input type="number" className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="e.g. 15000" value={form.expected_rent} onChange={e => setForm(f => ({ ...f, expected_rent: e.target.value }))} />
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                  <Button type="button" variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase hover:bg-white/5 text-white/50 hover:text-white" onClick={() => setAddOpen(false)}>Abort</Button>
                  <Button type="submit" disabled={createRoom.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12 transition-colors">
                    {createRoom.isPending ? 'Processing...' : 'Authorize Cell'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Database Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0A0A0C] border-y border-white/10 py-4 px-2">
          <div className="relative w-full sm:max-w-md flex items-center border border-white/10 bg-[#121215] focus-within:border-[#D4AF37] transition-colors">
            <Search size={14} className="absolute left-4 text-white/30" />
            <input 
              placeholder="QUERY CELL DESIGNATION OR ASSET..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full bg-transparent h-10 pl-10 pr-4 text-[11px] font-mono tracking-widest text-white placeholder:text-white/20 outline-none" 
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-none bg-[#121215] border-white/10 text-[10px] font-mono tracking-widest uppercase focus:ring-1 focus:ring-[#D4AF37]">
              <Filter size={12} className="mr-2 text-[#D4AF37]" /> <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
              <SelectItem value="all" className="text-[10px] font-mono tracking-widest uppercase">All States</SelectItem>
              <SelectItem value="vacant" className="text-[10px] font-mono tracking-widest uppercase text-emerald-500 focus:text-emerald-400">Vacant</SelectItem>
              <SelectItem value="vacating" className="text-[10px] font-mono tracking-widest uppercase text-[#D4AF37] focus:text-[#D4AF37]">Vacating</SelectItem>
              <SelectItem value="occupied" className="text-[10px] font-mono tracking-widest uppercase text-sky-500 focus:text-sky-400">Occupied</SelectItem>
              <SelectItem value="blocked" className="text-[10px] font-mono tracking-widest uppercase text-[#A62639] focus:text-[#A62639]">Blocked</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={lockedFilter} onValueChange={setLockedFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-none bg-[#121215] border-white/10 text-[10px] font-mono tracking-widest uppercase focus:ring-1 focus:ring-[#D4AF37]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
              <SelectItem value="all" className="text-[10px] font-mono tracking-widest uppercase">All Clearance</SelectItem>
              <SelectItem value="locked" className="text-[10px] font-mono tracking-widest uppercase text-[#A62639] focus:text-[#A62639]">System Locked</SelectItem>
              <SelectItem value="unlocked" className="text-[10px] font-mono tracking-widest uppercase text-white/50 focus:text-white">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asset Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-48 rounded-none bg-white/5 animate-pulse border border-white/10" />)}
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-32 bg-[#0A0A0C] border border-white/5">
            <Database size={40} className="mx-auto mb-6 text-white/10" />
            <p className="font-serif text-2xl italic text-white mb-2">No Cells Located</p>
            <p className="text-[11px] font-mono tracking-widest text-white/40 uppercase">Adjust search parameters</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 bg-white/10 border border-white/10 p-px">
            <AnimatePresence>
              {filtered.map((room: any) => {
                const sc = STATUS_CONFIG[room.status] || STATUS_CONFIG.vacant;
                const StatusIcon = sc.icon;
                const lastConfirmed = room.last_confirmed_at ? formatDistanceToNow(new Date(room.last_confirmed_at), { addSuffix: true }) : 'NO LOGS';

                return (
                  <motion.div 
                    key={room.id} 
                    variants={fadeUp}
                    layout
                    className={`group relative bg-[#0A0A0C] p-6 transition-all duration-500 overflow-hidden ${room.auto_locked ? 'shadow-[inset_0_0_0_2px_rgba(166,38,57,0.5)]' : 'hover:bg-[#121215]'}`}
                  >
                    {/* Auto-Locked Visual Glitch */}
                    {room.auto_locked && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#A62639] to-transparent opacity-50" />}

                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-serif text-3xl text-white tracking-tighter">{room.room_number}</h3>
                          {room.auto_locked && <span title="System Lock Engaged"><Lock size={14} className="text-[#A62639]" /></span>}
                        </div>
                        <p className="text-[10px] font-mono text-[#D4AF37] tracking-[0.2em] uppercase line-clamp-1">{room.properties?.name || 'UNKNOWN ASSET'}</p>
                      </div>
                      <Badge className={`rounded-none px-2 py-1 text-[8px] font-black tracking-widest border ${sc.color}`}>
                        {sc.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[10px] font-mono tracking-widest uppercase text-white/40 mb-8 relative z-10">
                      <div><span className="block text-white/20 mb-0.5">Capacity</span><span className="text-white/80">{room.bed_count} BEDS</span></div>
                      {room.room_type && <div><span className="block text-white/20 mb-0.5">Class</span><span className="text-white/80">{room.room_type}</span></div>}
                      {room.expected_rent && <div><span className="block text-white/20 mb-0.5">Target Value</span><span className="text-white/80">₹{room.expected_rent}</span></div>}
                      {room.actual_rent && <div><span className="block text-white/20 mb-0.5">Current Yield</span><span className="text-white/80">₹{room.actual_rent}</span></div>}
                    </div>

                    {/* Footer Confirmation Terminal */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Last Verification</p>
                        <p className="text-[10px] font-mono text-white/50 tracking-widest uppercase">{lastConfirmed}</p>
                      </div>
                      
                      <Dialog open={confirmOpen === room.id} onOpenChange={v => setConfirmOpen(v ? room.id : null)}>
                        <DialogTrigger asChild>
                          <button className="flex items-center justify-center w-8 h-8 rounded-none bg-white/5 border border-white/10 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all">
                            <RefreshCw size={12} />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                          <div className="p-6 border-b border-white/10 bg-[#121215]">
                            <DialogTitle className="font-serif text-xl italic text-white">Log Intelligence: Cell {room.room_number}</DialogTitle>
                          </div>
                          <div className="p-8 space-y-6">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Visual Confirmation Status</Label>
                              <Select value={confirmForm.status} onValueChange={v => setConfirmForm(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none bg-[#121215] border border-[#D4AF37]">
                                  <SelectItem value="vacant" className="font-mono text-xs focus:bg-emerald-500/20 focus:text-emerald-500">Vacant - Clear</SelectItem>
                                  <SelectItem value="vacating" className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-[#D4AF37]">Vacating - Pending</SelectItem>
                                  <SelectItem value="occupied" className="font-mono text-xs focus:bg-sky-500/20 focus:text-sky-500">Occupied - Active</SelectItem>
                                  <SelectItem value="blocked" className="font-mono text-xs focus:bg-[#A62639]/20 focus:text-[#A62639]">Blocked - Inaccessible</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Agent Notes (Optional)</Label>
                              <Input className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" placeholder="Record physical state..." value={confirmForm.notes} onChange={e => setConfirmForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                            <div className="pt-4 border-t border-white/10">
                              <Button className="w-full h-12 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors" onClick={() => handleConfirm(room.id)} disabled={confirmStatus.isPending}>
                                {confirmStatus.isPending ? 'Encrypting Log...' : 'Confirm Verification'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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

export default Inventory;