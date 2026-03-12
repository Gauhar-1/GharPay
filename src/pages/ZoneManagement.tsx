import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useZones, useCreateZone, useTeamQueues, useCreateTeamQueue, useEscalations, useUpdateEscalation } from '@/hooks/useZones';
import { useAgents } from '@/hooks/useCrmData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, Plus, Users, AlertTriangle, Shield, GitMerge, Crosshair, Target, CheckSquare, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const ZONE_COLORS = ['#D4AF37', '#A62639', '#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#64748b'];

const ZoneManagement = () => {
  const { data: zones, isLoading } = useZones();
  const { data: agents } = useAgents();
  const { data: queues } = useTeamQueues();
  const { data: escalations } = useEscalations('open');
  const createZone = useCreateZone();
  const createQueue = useCreateTeamQueue();
  const updateEsc = useUpdateEscalation();

  const [newZone, setNewZone] = useState({ name: '', city: 'Bangalore', areas: '', manager_id: '', color: ZONE_COLORS[0] });
  const [newQueue, setNewQueue] = useState({ zone_id: '', team_name: '', owner_agent_id: '' });
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);

  const handleCreateZone = async () => {
    if (!newZone.name || !newZone.areas) { toast.error('Territory designation and boundaries required'); return; }
    try {
      await createZone.mutateAsync({
        name: newZone.name,
        city: newZone.city,
        areas: newZone.areas.split(',').map(a => a.trim()).filter(Boolean),
        manager_id: newZone.manager_id || undefined,
        color: newZone.color,
      });
      setNewZone({ name: '', city: 'Bangalore', areas: '', manager_id: '', color: ZONE_COLORS[0] });
      setZoneDialogOpen(false);
      toast.success('Territory successfully mapped.');
    } catch(e:any) { toast.error(e.message); }
  };

  const handleCreateQueue = async () => {
    if (!newQueue.zone_id || !newQueue.team_name) { toast.error('Target Zone and Unit Name required'); return; }
    try {
      await createQueue.mutateAsync({
        zone_id: newQueue.zone_id,
        team_name: newQueue.team_name,
        owner_agent_id: newQueue.owner_agent_id || undefined,
      });
      setNewQueue({ zone_id: '', team_name: '', owner_agent_id: '' });
      setQueueDialogOpen(false);
      toast.success('Tactical unit deployed.');
    } catch(e:any) { toast.error(e.message); }
  };

  const handleResolveEscalation = async (id: string) => {
    try {
      await updateEsc.mutateAsync({ id, status: 'resolved', resolved_at: new Date().toISOString() });
      toast.success('Incident resolved and archived.');
    } catch(e:any) { toast.error(e.message); }
  };

  if (isLoading) {
    return (
      <AppLayout title="Territory Command" subtitle="Loading sector topologies...">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-none bg-white/5" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Territory Command" subtitle="Geographic routing, deployment queues, and incident reports">
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-[1600px] mx-auto">
        <Tabs defaultValue="zones" className="space-y-8">
          
          <div className="border-b border-white/10 bg-[#121215] p-2 flex overflow-x-auto custom-scrollbar">
            <TabsList className="bg-transparent h-12 p-0 flex gap-2">
              <TabsTrigger value="zones" className="rounded-none data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8 transition-colors border border-transparent data-[state=inactive]:border-white/10 data-[state=inactive]:text-white/50 data-[state=inactive]:hover:bg-white/5">
                <Map size={14} className="mr-2" /> Sector Topology
              </TabsTrigger>
              <TabsTrigger value="queues" className="rounded-none data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black text-[10px] font-black uppercase tracking-widest px-8 transition-colors border border-transparent data-[state=inactive]:border-white/10 data-[state=inactive]:text-white/50 data-[state=inactive]:hover:bg-white/5">
                <Users size={14} className="mr-2" /> Tactical Units
              </TabsTrigger>
              <TabsTrigger value="escalations" className="rounded-none data-[state=active]:bg-[#A62639] data-[state=active]:text-white text-[10px] font-black uppercase tracking-widest px-8 transition-colors border border-transparent data-[state=inactive]:border-white/10 data-[state=inactive]:text-white/50 data-[state=inactive]:hover:bg-white/5 relative">
                <AlertTriangle size={14} className="mr-2" /> Incident Reports
                {(escalations?.length || 0) > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[8px] rounded-none border-black">
                    {escalations?.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: ZONES */}
          <TabsContent value="zones" className="space-y-6 outline-none">
            <div className="flex items-center justify-between bg-[#0A0A0C] border border-white/10 p-4">
              <div className="flex items-center gap-3 text-white/50">
                <Target size={16} className="text-[#D4AF37]" />
                <span className="text-[10px] font-mono tracking-widest uppercase">{zones?.length || 0} Defined Sectors</span>
              </div>
              
              <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 px-6 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors">
                    <Plus size={14} className="mr-2" /> Define Sector
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                  <div className="p-6 border-b border-white/10 bg-[#121215]">
                    <DialogTitle className="font-serif text-xl italic text-white">Sector Designation Protocol</DialogTitle>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Designation ID *</label>
                        <Input placeholder="e.g. Sector-7" value={newZone.name} onChange={e => setNewZone({ ...newZone, name: e.target.value })} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Macro-Region</label>
                        <Input placeholder="City" value={newZone.city} onChange={e => setNewZone({ ...newZone, city: e.target.value })} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Territorial Boundaries *</label>
                      <Input placeholder="Comma separated targets (e.g. HSR, Koramangala)" value={newZone.areas} onChange={e => setNewZone({ ...newZone, areas: e.target.value })} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Sector Commander</label>
                      <Select value={newZone.manager_id} onValueChange={v => setNewZone({ ...newZone, manager_id: v })}>
                        <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-[#D4AF37]">
                          <SelectValue placeholder="Assign Commander..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                          {agents?.map(a => <SelectItem key={a.id} value={a.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white">{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Tactical Color</label>
                      <div className="flex gap-3">
                        {ZONE_COLORS.map(c => (
                          <button key={c} className={`w-8 h-8 rounded-none border-2 transition-all ${newZone.color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            style={{ background: c }} onClick={() => setNewZone({ ...newZone, color: c })} />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                      <Button type="button" variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase hover:bg-white/5 text-white/50 hover:text-white" onClick={() => setZoneDialogOpen(false)}>Abort</Button>
                      <Button onClick={handleCreateZone} disabled={createZone.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12 transition-colors">
                        {createZone.isPending ? 'Processing...' : 'Establish Sector'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {zones?.map((zone: any) => (
                  <motion.div key={zone.id} variants={fadeUp} layout className="bg-[#0A0A0C] border border-white/10 relative overflow-hidden group hover:border-white/30 transition-colors">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: zone.color }} />
                    <div className="p-6 pl-8">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[9px] font-mono tracking-[0.2em] text-[#D4AF37] uppercase mb-1">{zone.city}</p>
                          <h3 className="font-serif text-2xl text-white tracking-tighter">{zone.name}</h3>
                        </div>
                        <div className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/30 group-hover:text-white transition-colors">
                          <Map size={14} />
                        </div>
                      </div>
                      
                      <div className="mb-6 flex flex-wrap gap-2">
                        {(zone.areas || []).map((area: string) => (
                          <span key={area} className="text-[9px] font-mono tracking-widest px-2 py-1 bg-[#121215] border border-white/10 text-white/70 uppercase">
                            {area}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3 pt-4 border-t border-white/10 text-[10px] font-mono tracking-widest text-white/50 uppercase">
                        <Shield size={12} className="text-[#D4AF37]" />
                        <span>CMD: {zone.agents?.name || 'UNASSIGNED'}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </TabsContent>

          {/* TAB: QUEUES */}
          <TabsContent value="queues" className="space-y-6 outline-none">
            <div className="flex items-center justify-between bg-[#0A0A0C] border border-white/10 p-4">
              <div className="flex items-center gap-3 text-white/50">
                <GitMerge size={16} className="text-[#D4AF37]" />
                <span className="text-[10px] font-mono tracking-widest uppercase">{queues?.length || 0} Units Deployed</span>
              </div>
              
              <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 px-6 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors">
                    <Plus size={14} className="mr-2" /> Deploy Unit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl">
                  <div className="p-6 border-b border-white/10 bg-[#121215]">
                    <DialogTitle className="font-serif text-xl italic text-white">Unit Deployment Protocol</DialogTitle>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Target Sector *</label>
                      <Select value={newQueue.zone_id} onValueChange={v => setNewQueue({ ...newQueue, zone_id: v })}>
                        <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-[#D4AF37]">
                          <SelectValue placeholder="Select Sector" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                          {zones?.map((z: any) => <SelectItem key={z.id} value={z.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white">{z.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Callsign / Team Name *</label>
                      <Input placeholder="e.g. Alpha Squad" value={newQueue.team_name} onChange={e => setNewQueue({ ...newQueue, team_name: e.target.value })} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Unit Lead</label>
                      <Select value={newQueue.owner_agent_id} onValueChange={v => setNewQueue({ ...newQueue, owner_agent_id: v })}>
                        <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-[#D4AF37]">
                          <SelectValue placeholder="Assign Lead..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                          {agents?.map(a => <SelectItem key={a.id} value={a.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white">{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                      <Button type="button" variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase hover:bg-white/5 text-white/50 hover:text-white" onClick={() => setQueueDialogOpen(false)}>Abort</Button>
                      <Button onClick={handleCreateQueue} disabled={createQueue.isPending} className="rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-12 transition-colors">
                        {createQueue.isPending ? 'Processing...' : 'Deploy'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-[#0A0A0C] border border-white/10 overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#121215]">
                  <tr>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 w-12"><Hash size={10} /></th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Callsign</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Assigned Sector</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Unit Lead</th>
                    <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Protocol</th>
                    <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Personnel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {queues?.map((q: any, i: number) => (
                    <tr key={q.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-[10px] font-mono text-white/20">{(i+1).toString().padStart(2, '0')}</td>
                      <td className="py-4 px-6 font-serif text-base text-white group-hover:italic transition-all">{q.team_name}</td>
                      <td className="py-4 px-6 text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase">{q.zones?.name}</td>
                      <td className="py-4 px-6 text-[10px] font-mono text-white/60 uppercase">{q.agents?.name || '—'}</td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="rounded-none border-white/20 text-white/60 text-[8px] font-mono tracking-widest uppercase">
                          {q.dispatch_rule}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-[11px] text-white/50 tracking-widest">
                        {(q.member_ids || []).length} AGTS
                      </td>
                    </tr>
                  ))}
                  {queues?.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-16 text-[10px] font-mono tracking-widest text-white/30 uppercase">No tactical units deployed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB: ESCALATIONS */}
          <TabsContent value="escalations" className="space-y-6 outline-none">
            <div className="grid gap-px bg-white/10 border border-white/10 p-px">
              <AnimatePresence>
                {escalations?.map((esc: any) => (
                  <motion.div 
                    key={esc.id} 
                    variants={fadeUp}
                    layout
                    className={`bg-[#0A0A0C] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group hover:bg-[#121215] transition-colors`}
                  >
                    {/* Left Threat Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${esc.priority === 'high' ? 'bg-[#A62639]' : 'bg-[#D4AF37]'}`} />

                    <div className="flex items-start gap-6 pl-2 flex-1">
                      <div className="flex flex-col gap-2">
                        <Badge className={`rounded-none px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] border self-start ${
                          esc.priority === 'high' ? 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30' : 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30'
                        }`}>
                          {esc.priority} THREAT
                        </Badge>
                        <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">{esc.entity_type}</span>
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-serif text-lg text-white mb-2">{esc.description || 'INCIDENT DESCRIPTION REDACTED.'}</p>
                        <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono tracking-widest text-white/40 uppercase">
                          <span className="flex items-center gap-1.5 text-[#D4AF37]"><Map size={10}/> {esc.zones?.name || 'UNKNOWN SECTOR'}</span>
                          <span className="border-l border-white/20 pl-4">Raised By: {esc.raised?.name || 'SYS'}</span>
                          <span className="border-l border-white/20 pl-4">Assigned To: {esc.assigned?.name || 'UNASSIGNED'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 md:border-l border-white/10 md:pl-6 pl-2">
                      <Button onClick={() => handleResolveEscalation(esc.id)} className="h-12 px-6 rounded-none bg-white/5 border border-white/10 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 text-white font-black uppercase tracking-widest text-[9px] transition-all">
                        <CheckSquare size={12} className="mr-2" /> Resolve Incident
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {escalations?.length === 0 && (
                <div className="text-center py-32 bg-[#0A0A0C]">
                  <Shield size={40} className="mx-auto mb-6 text-white/10" />
                  <p className="font-serif text-2xl italic text-white mb-2">No Active Threats</p>
                  <p className="text-[11px] font-mono tracking-widest text-white/40 uppercase">All sectors operating within normal parameters.</p>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ZoneManagement;