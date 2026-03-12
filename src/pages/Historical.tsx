import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import CsvImport from '@/components/CsvImport';
import { useLeads } from '@/hooks/useCrmData';
import { Database, Search, UploadCloud, MapPin, User, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SOURCE_LABELS, PIPELINE_STAGES } from '@/types/crm';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const Historical = () => {
  const { data: leads } = useLeads();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Sort oldest first for historical view
  const sorted = [...(leads || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const filtered = sorted.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search) ||
    (l.preferred_location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="The Archive" subtitle="Systematic processing of historical data protocols">
      
      {/* Texture: Subtle Victorian Wallpaper Grain */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CSV Import Terminal (Left Sidebar) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="lg:col-span-4 space-y-6"
        >
          <motion.div variants={fadeUp} className="bg-[#0A0A0C] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]" />
            
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4 border border-[#D4AF37]/20">
                <UploadCloud size={24} className="text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-2xl text-white italic">Data Ingestion</h3>
              <p className="text-[10px] tracking-[0.2em] font-mono text-white/40 mt-2 uppercase">Bulk Import Protocol Active</p>
            </div>
            
            <div className="bg-[#121215] border border-white/5 p-4 rounded-sm">
              <CsvImport onComplete={() => qc.invalidateQueries({ queryKey: ['leads'] })} />
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
               <h4 className="text-[10px] tracking-widest text-[#D4AF37] font-bold uppercase mb-4">Required Parameters</h4>
               <div className="flex flex-wrap gap-2">
                 {['Name', 'Phone', 'Source', 'Status'].map(param => (
                   <span key={param} className="px-2 py-1 bg-white/5 text-[9px] font-mono text-white/50 tracking-widest uppercase border border-white/10">{param}</span>
                 ))}
               </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Lead Database Ledger */}
        <motion.div
          className="lg:col-span-8 bg-[#0A0A0C] border-t-4 border-[#A62639] shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[600px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Ledger Control Strip */}
          <div className="p-6 border-b border-white/10 bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Database size={20} className="text-[#A62639]" />
              <div>
                <h3 className="font-serif text-xl text-white tracking-tight">The Forensic Ledger</h3>
                <p className="text-[10px] font-mono tracking-widest text-white/40 mt-1 uppercase">Total Processed: {filtered.length}</p>
              </div>
            </div>
            
            <div className="relative w-full sm:w-72 flex items-center border border-white/10 bg-[#0A0A0C] focus-within:border-[#D4AF37] transition-colors">
              <Search size={14} className="absolute left-4 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="QUERY DATABASE..."
                className="w-full bg-transparent text-[11px] font-mono tracking-widest text-white placeholder:text-white/20 h-10 pl-10 pr-4 outline-none"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#121215] z-10 shadow-md">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10 w-16">
                    <Hash size={12} />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Entity Identity</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Origin Point</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Current Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/10">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((l, i) => {
                  const stage = PIPELINE_STAGES.find(s => s.key === l.status);
                  
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[10px] font-mono text-white/20 group-hover:text-[#D4AF37] transition-colors">
                        {(i + 1).toString().padStart(4, '0')}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-none border border-white/10 flex items-center justify-center text-white/40 bg-white/5 shrink-0 mt-0.5">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-serif text-base text-white group-hover:italic transition-all">{l.name}</p>
                            <p className="text-[10px] font-mono text-[#D4AF37] mt-1 tracking-widest">{l.phone}</p>
                            {l.preferred_location && (
                              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                <MapPin size={10} /> {l.preferred_location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[9px] font-mono tracking-widest uppercase border-white/10 text-white/50 bg-black rounded-none">
                          {SOURCE_LABELS[l.source as keyof typeof SOURCE_LABELS] || l.source}
                        </Badge>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded-none ${
                          stage?.color.includes('warning') ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' :
                          stage?.color.includes('success') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                          stage?.color.includes('destructive') ? 'bg-[#A62639]/10 text-[#A62639] border-[#A62639]/30' :
                          'bg-white/5 text-white/60 border-white/10'
                        }`}>
                          {stage?.label || l.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <p className="text-xs font-serif text-white/80">{format(new Date(l.created_at), 'MMM do, yyyy')}</p>
                        <p className="text-[9px] font-mono text-white/30 tracking-widest mt-1 uppercase">{format(new Date(l.created_at), 'HH:mm:ss')}</p>
                      </td>
                    </tr>
                  );
                })}
                
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-32 text-center">
                      <Database size={32} className="mx-auto mb-4 text-white/10" />
                      <p className="text-lg font-serif text-white italic">No records match the query</p>
                      <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase mt-2">Adjust search parameters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
};

export default Historical;