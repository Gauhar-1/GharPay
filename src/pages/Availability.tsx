import { useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAllBeds } from '@/hooks/useInventoryData';
import { usePropertiesWithOwners } from '@/hooks/useInventoryData';
import { Badge } from '@/components/ui/badge';
import { Crosshair, Map, Database, Activity, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const Availability = () => {
  const { data: beds, isLoading: bedsLoading } = useAllBeds();
  const { data: properties } = usePropertiesWithOwners();

  // Group by area → property with vacancy counts
  const areaData = useMemo(() => {
    if (!beds || !properties) return [];

    const propMap: Record<string, { name: string; area: string; vacantBeds: number; totalBeds: number; avgRent: number; nextVacancy: string | null }> = {};

    for (const bed of beds as any[]) {
      const propId = bed.rooms?.property_id;
      if (!propId) continue;
      const prop = properties.find((p: any) => p.id === propId);
      if (!prop) continue;

      if (!propMap[propId]) {
        propMap[propId] = { name: prop.name, area: (prop as any).area || 'Unknown', vacantBeds: 0, totalBeds: 0, avgRent: 0, nextVacancy: null };
      }
      propMap[propId].totalBeds++;
      if (bed.status === 'vacant') propMap[propId].vacantBeds++;
      if (bed.status === 'vacating_soon' && bed.move_out_date) {
        if (!propMap[propId].nextVacancy || bed.move_out_date < propMap[propId].nextVacancy!) {
          propMap[propId].nextVacancy = bed.move_out_date;
        }
      }
      const rent = Number(bed.rooms?.rent_per_bed || bed.rooms?.expected_rent || 0);
      if (rent > 0) propMap[propId].avgRent = rent;
    }

    // Group by area
    const areaMap: Record<string, typeof propMap[string][]> = {};
    for (const p of Object.values(propMap)) {
      if (!areaMap[p.area]) areaMap[p.area] = [];
      areaMap[p.area].push(p);
    }

    return Object.entries(areaMap)
      .map(([area, props]) => ({
        area,
        totalVacant: props.reduce((s, p) => s + p.vacantBeds, 0),
        totalBeds: props.reduce((s, p) => s + p.totalBeds, 0),
        properties: props.sort((a, b) => b.vacantBeds - a.vacantBeds),
      }))
      .sort((a, b) => b.totalVacant - a.totalVacant);
  }, [beds, properties]);

  const getHeatmapTheme = (pct: number) => {
    if (pct > 40) return { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-500', glow: 'shadow-[inset_0_2px_10px_rgba(16,185,129,0.1)]' };
    if (pct > 15) return { bg: 'bg-[#D4AF37]/5', border: 'border-[#D4AF37]/30', text: 'text-[#D4AF37]', glow: 'shadow-[inset_0_2px_10px_rgba(212,175,55,0.1)]' };
    return { bg: 'bg-[#A62639]/5', border: 'border-[#A62639]/30', text: 'text-[#A62639]', glow: 'shadow-[inset_0_2px_10px_rgba(166,38,57,0.1)]' };
  };

  return (
    <AppLayout title="Tactical Operations" subtitle="Sales intelligence — priority targets for deployment">
      
      {/* Texture: Subtle Victorian Wallpaper Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-[1600px] mx-auto space-y-16">
        
        {/* Top Control Bar */}
        <div className="p-6 border-b border-white/10 bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <Crosshair size={24} className="text-[#A62639]" />
            <div>
              <h3 className="font-serif text-xl text-white tracking-tight">Sector Capacity Matrix</h3>
              <p className="text-[10px] font-mono tracking-[0.2em] text-white/40 mt-1 uppercase">Live Heatmap Diagnostic</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-mono tracking-widest uppercase">
             <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500" /> Optimal</span>
             <span className="flex items-center gap-2"><div className="w-2 h-2 bg-[#D4AF37]" /> Warning</span>
             <span className="flex items-center gap-2"><div className="w-2 h-2 bg-[#A62639]" /> Critical</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="px-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {bedsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-none bg-white/5 animate-pulse border border-white/10" />
              ))
            ) : areaData.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-[#0A0A0C] border border-white/5">
                <Activity size={32} className="mx-auto mb-4 text-white/20" />
                <p className="font-serif text-xl italic text-white mb-1">Grid Offline</p>
                <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">No inventory data detected</p>
              </div>
            ) : (
              <AnimatePresence>
                {areaData.map((area, i) => {
                  const pct = area.totalBeds > 0 ? (area.totalVacant / area.totalBeds) * 100 : 0;
                  const theme = getHeatmapTheme(pct);
                  
                  return (
                    <motion.div
                      key={area.area}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: i * 0.05 }}
                      className={`p-6 bg-[#0A0A0C] border-t-2 border-b border-x border-x-white/5 border-b-white/5 relative overflow-hidden group ${theme.border} ${theme.bg} ${theme.glow}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <Map size={14} className="text-white/30 group-hover:text-white transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Z-{i+1}</span>
                      </div>
                      <p className="text-[11px] font-mono font-bold text-white uppercase tracking-widest truncate mb-2">{area.area}</p>
                      <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-serif italic tracking-tighter ${theme.text}`}>{area.totalVacant}</p>
                        <p className="text-[10px] font-mono text-white/40">/ {area.totalBeds}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Zonal Dossiers (Tables) */}
        <div className="space-y-12 px-2">
          {areaData.map((area) => (
            <div key={area.area} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-3xl text-white tracking-tighter uppercase">{area.area}</h2>
                <div className="h-[1px] flex-1 bg-white/10" />
                <Badge variant="outline" className="rounded-none border-[#D4AF37]/30 text-[#D4AF37] bg-[#D4AF37]/5 px-3 py-1 font-mono text-[9px] uppercase tracking-widest">
                  {area.totalVacant} Units Clear
                </Badge>
              </div>
              
              <div className="bg-[#0A0A0C] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-[#121215]">
                      <tr>
                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 w-12">
                          <Hash size={10} />
                        </th>
                        <th className="py-4 px-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Asset Designation</th>
                        <th className="py-4 px-6 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Capacity Status</th>
                        <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Target Yield/Unit</th>
                        <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Projected Clearance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {area.properties.map((p, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 px-6 text-[10px] font-mono text-white/20">
                            {(i + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="py-4 px-6 font-serif text-base text-white group-hover:italic transition-all">
                            {p.name}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex items-baseline gap-1">
                              <span className={`font-mono text-sm font-bold ${p.vacantBeds > 0 ? 'text-emerald-500' : 'text-[#A62639]'}`}>
                                {p.vacantBeds.toString().padStart(2, '0')}
                              </span>
                              <span className="font-mono text-[9px] text-white/30">/ {p.totalBeds.toString().padStart(2, '0')}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-xs text-[#D4AF37] tracking-widest">
                            {p.avgRent > 0 ? `₹${p.avgRent.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-[10px] text-white/50 tracking-widest uppercase">
                            {p.nextVacancy || 'SECURED'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  );
};

export default Availability;