import { useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { usePropertiesWithOwners } from '@/hooks/useInventoryData';
import { useAllRoomsWithDetails } from '@/hooks/useInventoryData';
import { Building2, Bed, TrendingUp, Eye, CalendarCheck, ThumbsUp, MapPin, Activity, ShieldAlert, Crosshair } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const EffortDashboard = () => {
  const { data: properties, isLoading: propsLoading } = usePropertiesWithOwners();
  const { data: rooms } = useAllRoomsWithDetails();

  // Get visits per property
  const { data: visits } = useQuery({
    queryKey: ['visits-by-property'],
    queryFn: async () => {
      const { data, error } = await supabase.from('visits').select('property_id, outcome, lead_id');
      if (error) throw error;
      return data;
    },
  });

  // Get leads per property
  const { data: leads } = useQuery({
    queryKey: ['leads-by-property'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('property_id, status');
      if (error) throw error;
      return data;
    },
  });

  const propertyEffort = useMemo(() => {
    if (!properties) return [];
    return properties.map((p: any) => {
      const pRooms = rooms?.filter((r: any) => r.property_id === p.id) || [];
      const pVisits = visits?.filter((v: any) => v.property_id === p.id) || [];
      const pLeads = leads?.filter((l: any) => l.property_id === p.id) || [];

      return {
        ...p,
        roomCount: pRooms.length,
        vacantRooms: pRooms.filter((r: any) => r.status === 'vacant' && !r.auto_locked).length,
        lockedRooms: pRooms.filter((r: any) => r.auto_locked).length,
        totalLeads: pLeads.length,
        totalVisits: pVisits.length,
        booked: pVisits.filter((v: any) => v.outcome === 'booked').length,
        considering: pVisits.filter((v: any) => v.outcome === 'considering').length,
        notInterested: pVisits.filter((v: any) => v.outcome === 'not_interested').length,
      };
    }).sort((a, b) => b.totalLeads - a.totalLeads); // Sort by highest activity
  }, [properties, rooms, visits, leads]);

  return (
    <AppLayout title="Partner Intelligence" subtitle="Transparent asset performance and agency effort metrics">
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-[1600px] mx-auto space-y-12">

        {/* Command Strip */}
        <div className="p-6 border-b border-white/10 bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <Activity size={24} className="text-[#D4AF37]" />
            <div>
              <h3 className="font-serif text-xl text-white tracking-tight">Deployment & Pitch Metrics</h3>
              <p className="text-[10px] font-mono tracking-[0.2em] text-white/40 mt-1 uppercase">Asset Level Breakdown</p>
            </div>
          </div>
        </div>

        {/* Intelligence Feed */}
        {propsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-none bg-white/5 animate-pulse border border-white/10" />)}
          </div>
        ) : !propertyEffort.length ? (
          <div className="text-center py-32 bg-[#0A0A0C] border border-white/5">
            <TrendingUp size={40} className="mx-auto mb-6 text-white/10" />
            <p className="font-serif text-2xl italic text-white mb-2">No active assets</p>
            <p className="text-[11px] font-mono tracking-widest text-white/40 uppercase">Map properties to track deployment effort</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">
            <AnimatePresence>
              {propertyEffort.map((p: any) => (
                <motion.div 
                  key={p.id} 
                  variants={fadeUp}
                  layout
                  className="bg-[#0A0A0C] border border-white/10 p-8 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/50 transition-colors duration-500"
                >
                  {/* Subtle Grain Overlay */}
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />

                  {/* Header / Identity */}
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 size={18} className="text-[#D4AF37]" />
                        <h2 className="font-serif text-2xl text-white group-hover:italic transition-all">{p.name}</h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono tracking-widest uppercase text-white/50">
                        {p.area && <span className="flex items-center gap-1"><MapPin size={10} className="text-[#A62639]"/> {p.area}, {p.city}</span>}
                        {p.owners?.name && <span className="border-l border-white/20 pl-3">OWNER: {p.owners.name}</span>}
                      </div>
                    </div>
                    {p.lockedRooms > 0 && (
                      <Badge variant="outline" className="rounded-none border-[#A62639]/30 text-[#A62639] bg-[#A62639]/10 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.2em] flex items-center gap-1.5 shrink-0">
                        <ShieldAlert size={10} /> {p.lockedRooms} System Lock
                      </Badge>
                    )}
                  </div>

                  {/* Tactical Pipeline */}
                  <div className="bg-[#121215] border border-white/5 p-6 mb-8 relative z-10">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Engagement Pipeline</h4>
                    <div className="flex items-center justify-between">
                      <PipelineNode icon={Crosshair} label="Leads Targeted" value={p.totalLeads} color="text-sky-500" />
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-sky-500/20 via-violet-500/20 to-emerald-500/20 mx-4" />
                      <PipelineNode icon={CalendarCheck} label="Tours Deployed" value={p.totalVisits} color="text-violet-500" />
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-violet-500/20 to-emerald-500/20 mx-4" />
                      <PipelineNode icon={ThumbsUp} label="Units Secured" value={p.booked} color="text-emerald-500" />
                    </div>
                  </div>

                  {/* Operational Diagnostics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4 border-t border-white/10 pt-6 relative z-10">
                    <DiagnosticStat label="Total Capacity" value={`${p.roomCount} UNITS`} />
                    <DiagnosticStat label="Current Vacancy" value={`${p.vacantRooms} CLEAR`} color={p.vacantRooms > 0 ? "text-emerald-500" : "text-white/40"} />
                    <DiagnosticStat label="In Negotiation" value={`${p.considering} LEADS`} color={p.considering > 0 ? "text-[#D4AF37]" : "text-white/40"} />
                    <DiagnosticStat label="Dropped/Lost" value={`${p.notInterested} LEADS`} color={p.notInterested > 0 ? "text-[#A62639]" : "text-white/40"} />
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

// --- Subcomponents for strict aesthetic control ---

const PipelineNode = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => (
  <div className="flex flex-col items-center text-center w-24 shrink-0">
    <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 ${color}`}>
      <Icon size={16} />
    </div>
    <p className={`font-serif text-2xl tracking-tighter ${color} leading-none mb-1`}>{value}</p>
    <p className="text-[8px] font-mono tracking-widest text-white/40 uppercase">{label}</p>
  </div>
);

const DiagnosticStat = ({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) => (
  <div>
    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{label}</p>
    <p className={`text-xs font-mono font-bold tracking-widest ${color}`}>{value}</p>
  </div>
);

export default EffortDashboard;