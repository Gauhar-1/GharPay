import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLeads } from '@/hooks/useCrmData';
import { useDbMatchBeds } from '@/hooks/useZones';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin, IndianRupee, Bed, Loader2, SearchCode, Target, Crosshair, ShieldCheck, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function parseBudget(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.toLowerCase().replace(/[₹,\s]/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(k|l|lakh|cr)?/);
  if (!match) return 0;
  let val = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === 'k') val *= 1000;
  else if (suffix === 'l' || suffix === 'lakh') val *= 100000;
  else if (suffix === 'cr') val *= 10000000;
  return val;
}

const springTransition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const Matching = () => {
  const { data: leads } = useLeads();
  const dbMatch = useDbMatchBeds();
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [matches, setMatches] = useState<any[]>([]);

  const activeLeads = (leads || []).filter(l => l.status !== 'booked' && l.status !== 'lost');
  const lead = activeLeads.find(l => l.id === selectedLead);

  const handleMatch = async () => {
    if (!lead) return;
    const budget = parseBudget(lead.budget || '');
    const result = await dbMatch.mutateAsync({
      location: lead.preferred_location || '',
      budget: budget || 10000,
      roomType: undefined,
    });
    setMatches(result || []);
  };

  const handleSelectLead = (id: string) => {
    setSelectedLead(id);
    setMatches([]);
  };

  return (
    <AppLayout title="Matching Protocol" subtitle="Algorithmic cross-referencing of prospect parameters against live inventory">
      
      {/* Ambient Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Control Terminal */}
        <div className="bg-[#121215] border border-white/10 p-6 shadow-2xl relative overflow-hidden">
          {/* Corner Target Accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#D4AF37]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#D4AF37]" />
          
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <label className="text-[9px] font-mono tracking-[0.2em] uppercase text-[#D4AF37] mb-2 flex items-center gap-2">
                <Target size={12} /> Designate Target Subject
              </label>
              <Select value={selectedLead} onValueChange={handleSelectLead}>
                <SelectTrigger className="h-14 rounded-none bg-[#0A0A0C] border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all">
                  <SelectValue placeholder="Select prospect profile..." />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-[#121215] border border-[#D4AF37]">
                  {activeLeads.map(l => (
                    <SelectItem key={l.id} value={l.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white py-3">
                      <span className="font-bold text-[#D4AF37]">{l.name}</span> <span className="text-white/40 ml-2">[{l.preferred_location || 'UNSPECIFIED'}] • [{l.budget || 'NO BUDGET'}]</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleMatch} 
              disabled={!lead || dbMatch.isPending} 
              className="h-14 px-10 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors w-full md:w-auto disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30"
            >
              {dbMatch.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-2" /> PROCESSING...</>
              ) : (
                <><SearchCode size={14} className="mr-2" /> INITIATE SCAN</>
              )}
            </Button>
          </div>
        </div>

        {/* Subject Profile (Lead Summary) */}
        <AnimatePresence mode="wait">
          {lead && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#0A0A0C] border-l-2 border-[#D4AF37] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Subject Designation</p>
                <h3 className="font-serif text-2xl text-white italic tracking-tight">{lead.name}</h3>
              </div>
              <div className="flex gap-8 text-[10px] font-mono tracking-widest uppercase">
                {lead.preferred_location && (
                  <div>
                    <p className="text-[#D4AF37] mb-1 flex items-center gap-1.5"><MapPin size={12} /> Target Area</p>
                    <p className="text-white/80">{lead.preferred_location}</p>
                  </div>
                )}
                {lead.budget && (
                  <div>
                    <p className="text-[#D4AF37] mb-1 flex items-center gap-1.5"><IndianRupee size={12} /> Authorized Value</p>
                    <p className="text-white/80">{lead.budget}</p>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <p className="text-[#D4AF37] mb-1 flex items-center gap-1.5"><Bed size={12} /> Intelligence Notes</p>
                    <p className="text-white/80 truncate max-w-[200px]">{lead.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Matches Database */}
        <AnimatePresence>
          {matches.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <Crosshair size={20} className="text-[#A62639]" />
                <h2 className="font-serif text-2xl text-white tracking-tighter">Identified Assets</h2>
                <Badge variant="outline" className="rounded-none border-[#A62639]/50 text-[#A62639] bg-[#A62639]/10 px-3 py-1 font-mono text-[9px] uppercase tracking-widest ml-auto">
                  {matches.length} Records Found
                </Badge>
              </div>
              
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-px bg-white/10 border border-white/10 p-px">
                {matches.map((m: any, i: number) => {
                  const isHighProbability = m.match_score >= 70;
                  const themeColor = isHighProbability ? 'text-emerald-500' : m.match_score >= 40 ? 'text-[#D4AF37]' : 'text-white/40';
                  const themeBorder = isHighProbability ? 'border-emerald-500/30' : m.match_score >= 40 ? 'border-[#D4AF37]/30' : 'border-white/10';
                  
                  return (
                    <motion.div
                      key={m.bed_id}
                      variants={fadeUp}
                      className="bg-[#0A0A0C] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#121215] transition-colors relative overflow-hidden group"
                    >
                      {/* Left Accent Line based on Match Strength */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isHighProbability ? 'bg-emerald-500' : m.match_score >= 40 ? 'bg-[#D4AF37]' : 'bg-white/10'}`} />

                      <div className="flex items-start gap-6">
                        <div className="text-[10px] font-mono text-white/20 pt-1 group-hover:text-[#D4AF37] transition-colors w-6">
                          {(i + 1).toString().padStart(2, '0')}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-serif text-xl text-white group-hover:italic transition-all">{m.property_name}</h3>
                            <Badge variant="outline" className="rounded-none border-white/10 text-white/50 bg-black font-mono text-[8px] uppercase tracking-widest">
                              {m.property_area}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-mono text-white/50 tracking-widest uppercase">
                            <span className="flex items-center gap-1.5"><Hash size={10} className="text-[#D4AF37]"/> Cell {m.room_number}</span>
                            <span className="flex items-center gap-1.5"><Bed size={10} className="text-[#D4AF37]"/> Bed {m.bed_number}</span>
                            {m.room_type && <span className="border-l border-white/20 pl-4">{m.room_type}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10 md:pl-6 md:border-l border-white/10 pl-12">
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Target Yield</p>
                          <p className="text-lg font-mono text-white">₹{Number(m.rent_per_bed || 0).toLocaleString()}</p>
                        </div>
                        
                        <div className={`text-right w-24 border ${themeBorder} bg-black/50 p-2`}>
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">Probability</p>
                          <p className={`text-2xl font-serif italic tracking-tighter ${themeColor}`}>{m.match_score}%</p>
                        </div>
                      </div>

                      {/* Absolute tag for strong match */}
                      {isHighProbability && (
                        <div className="absolute top-0 right-0 px-2 py-1 bg-emerald-500/10 border-b border-l border-emerald-500/20 flex items-center gap-1.5">
                          <ShieldCheck size={10} className="text-emerald-500" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Optimum Match</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty / Loading States */}
        {lead && matches.length === 0 && !dbMatch.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-[#0A0A0C] border border-white/5">
            <SearchCode size={40} className="mx-auto mb-4 text-white/10" />
            <p className="font-serif text-xl italic text-white mb-2">Awaiting Execution</p>
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase max-w-sm mx-auto">
              Initiate scan to cross-reference location, budget, and capacity against the global database.
            </p>
          </motion.div>
        )}

        {!lead && (
          <div className="text-center py-32 bg-[#0A0A0C] border border-white/5 opacity-50">
            <Target size={40} className="mx-auto mb-4 text-white/10" />
            <p className="font-serif text-xl italic text-white mb-2">Protocol Standby</p>
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Designate a target subject to begin</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Matching;