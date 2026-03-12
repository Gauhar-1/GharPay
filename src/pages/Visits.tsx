import AppLayout from '@/components/AppLayout';
import AddVisitDialog from '@/components/AddVisitDialog';
import { useVisits } from '@/hooks/useCrmData';
import { format, isToday, isTomorrow } from 'date-fns';
import { CalendarCheck, CheckCircle, XCircle, HelpCircle, Clock, MapPin, User, Navigation, Zap, AlertCircle, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };


const outcomeIcons: Record<string, { icon: JSX.Element; label: string; theme: string }> = {
  booked: { icon: <CheckCircle size={14} />, label: 'Secured', theme: 'bg-success/10 text-success border-success/20' },
  considering: { icon: <HelpCircle size={14} />, label: 'In Pipeline', theme: 'bg-warning/10 text-warning border-warning/20' },
  not_interested: { icon: <XCircle size={14} />, label: 'Dropped', theme: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const formatRelativeDate = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM do');
};

const Visits = () => {
  const { data: visits, isLoading } = useVisits();
  const qc = useQueryClient();

  const upcoming = visits?.filter(v => !v.outcome).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) || [];
  const past = visits?.filter(v => v.outcome).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()) || [];

  // Tactical Stats
  const successfulBooks = past.filter(v => v.outcome === 'booked').length;
  const hitRate = past.length > 0 ? Math.round((successfulBooks / past.length) * 100) : 0;
  const unconfirmedCount = upcoming.filter(v => !v.confirmed).length;

  const handleOutcome = async (visitId: string, outcome: string) => {
    try {
      const { error } = await supabase.from('visits').update({ outcome: outcome as any }).eq('id', visitId);
      if (error) throw error;
      toast.success('Tour outcome officially logged');
      qc.invalidateQueries({ queryKey: ['visits'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirm = async (visitId: string) => {
    try {
      const { error } = await supabase.from('visits').update({ confirmed: true }).eq('id', visitId);
      if (error) throw error;
      toast.success('Tour confirmed securely');
      qc.invalidateQueries({ queryKey: ['visits'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Field Operations" subtitle="Loading site tour schedules...">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[400px] rounded-[2rem]" />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Field Operations" subtitle="Manage site tours and track conversion rates" actions={<AddVisitDialog />}>
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[10%] left-[40%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
      </div>

      {/* Tactical Overview Strip */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-info/10 text-info flex items-center justify-center"><Navigation size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Active Scheduled</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-foreground">{upcoming.length}</p>
              {unconfirmedCount > 0 && <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md">{unconfirmedCount} unconfirmed</span>}
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center"><CheckCircle size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Tours Closed</p>
            <p className="text-2xl font-extrabold text-foreground">{successfulBooks} <span className="text-sm font-medium text-muted-foreground">/ {past.length}</span></p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center"><Zap size={20} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Hit Rate</p>
            <p className="text-2xl font-extrabold text-foreground">{hitRate}%</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Upcoming Tours */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <CalendarCheck size={20} className="text-accent" /> Upcoming Missions
          </h2>
          <Badge variant="outline" className="bg-background/50 backdrop-blur-md">{upcoming.length} In Queue</Badge>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {upcoming.map((visit) => {
              const visitDate = new Date(visit.scheduled_at);
              return (
                <motion.div
                  key={visit.id}
                  variants={fadeUp}
                  layout
                  className={`relative bg-card/40 backdrop-blur-xl border ${visit.confirmed ? 'border-border/50' : 'border-warning/30 shadow-warning/5'} p-0 rounded-[2rem] overflow-hidden shadow-sm flex flex-col group`}
                >
                  {/* Left Edge Status Indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${visit.confirmed ? 'bg-success/80' : 'bg-warning/80'}`} />

                  {/* Header: Date & Status */}
                  <div className="p-5 border-b border-border/40 flex justify-between items-start bg-background/30">
                    <div className="pl-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{formatRelativeDate(visitDate)}</p>
                      <p className="text-xl font-black text-foreground tracking-tight">{format(visitDate, 'h:mm a')}</p>
                    </div>
                    {visit.confirmed ? (
                      <Badge className="bg-success/10 text-success border-success/20 gap-1.5 shadow-none pointer-events-none">
                        <CheckCircle size={12} /> Confirmed
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleConfirm(visit.id)} className="h-8 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-bold shadow-md shadow-warning/20 active:scale-95 transition-all">
                        Confirm Tour
                      </Button>
                    )}
                  </div>

                  {/* Body: Entities */}
                  <div className="p-5 flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Prospect</p>
                      <p className="text-sm font-extrabold text-foreground flex items-center gap-2">
                        <User size={14} className="text-muted-foreground" /> {visit.leads?.name || 'Unknown Lead'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Target Property</p>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <MapPin size={14} className="text-accent" /> {visit.properties?.name || 'Unspecified'}
                      </p>
                    </div>
                  </div>

                  {/* Footer: Outcome Action */}
                  <div className="p-4 bg-secondary/30 mt-auto">
                    <Select onValueChange={v => handleOutcome(visit.id, v)}>
                      <SelectTrigger className="w-full h-10 bg-background/80 border-border/50 rounded-xl font-bold text-xs focus:ring-accent/20">
                        <SelectValue placeholder="Log final outcome..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/50 shadow-xl">
                        <SelectItem value="booked" className="font-bold text-success focus:text-success focus:bg-success/10"><span className="flex items-center gap-2"><CheckCircle size={14}/> Successfully Booked</span></SelectItem>
                        <SelectItem value="considering" className="font-bold text-warning focus:text-warning focus:bg-warning/10"><span className="flex items-center gap-2"><HelpCircle size={14}/> Left to Consider</span></SelectItem>
                        <SelectItem value="not_interested" className="font-bold text-destructive focus:text-destructive focus:bg-destructive/10"><span className="flex items-center gap-2"><XCircle size={14}/> Not Interested</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {upcoming.length === 0 && (
            <motion.div variants={fadeUp} className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-card/20 border border-dashed border-border/50 rounded-[2.5rem]">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4"><CalendarCheck size={24} className="text-muted-foreground/50" /></div>
              <p className="text-lg font-extrabold">Schedule Clear</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">No upcoming site tours assigned to your command.</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Historical Logs */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight mb-6">Historical Logs</h2>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springTransition, delay: 0.2 }} className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
          {past.length > 0 ? (
            <div className="divide-y divide-border/40">
              {past.map(visit => {
                const outcome = outcomeIcons[visit.outcome || ''] || outcomeIcons.not_interested;
                return (
                  <div key={visit.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors group">
                    <div className="flex items-center gap-5">
                      <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-secondary items-center justify-center shrink-0 group-hover:bg-background transition-colors border border-border/50">
                        <Building2 size={18} className="text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-extrabold text-foreground">{visit.leads?.name}</p>
                          <span className="text-border/50">•</span>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(visit.scheduled_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1.5"><MapPin size={12} className="text-accent" /> {visit.properties?.name}</span>
                          <span className="flex items-center gap-1.5"><User size={12} /> {visit.agents?.name?.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Badge className={`px-3 py-1.5 font-bold uppercase tracking-widest text-[9px] gap-1.5 border ${outcome.theme}`}>
                        {outcome.icon} {outcome.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">No historical data found</p>
            </div>
          )}
        </motion.div>
      </div>

    </AppLayout>
  );
};

export default Visits;