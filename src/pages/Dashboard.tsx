import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import OnboardingCard from '@/components/OnboardingCard';
import { useDashboardStats, useLeads, useAgentStats } from '@/hooks/useCrmData';
import { useAllReminders, useCompleteFollowUp } from '@/hooks/useLeadDetails';
import { useBookingStats } from '@/hooks/useBookings';
import { PIPELINE_STAGES, SOURCE_LABELS } from '@/types/crm';
import { Users, Clock, CalendarCheck, CheckCircle, TrendingUp, AlertTriangle, Timer, Star, IndianRupee, ChevronRight, Activity, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = [
  'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))', 
  'hsl(262, 55%, 55%)', 'hsl(var(--success))', 'hsl(var(--destructive))',
];

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };
const staggerContainer: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: agentStats } = useAgentStats();
  const { data: bookingStats } = useBookingStats();
  const { data: reminders } = useAllReminders();
  const completeFollowUp = useCompleteFollowUp();
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        qc.invalidateQueries({ queryKey: ['leads'] });
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
        qc.invalidateQueries({ queryKey: ['agent-stats'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const pipelineData = PIPELINE_STAGES.map(stage => ({
    name: stage.label.split(' ')[0],
    count: leads?.filter(l => l.status === stage.key).length || 0,
  }));

  const sourceData = leads
    ? Object.entries(
        leads.reduce((acc, l) => {
          acc[l.source] = (acc[l.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([key, value]) => ({ name: SOURCE_LABELS[key as keyof typeof SOURCE_LABELS] || key, value }))
    : [];

  const newLeads = leads?.filter(l => l.status === 'new') || [];
  const hotLeads = leads?.filter(l => ((l as any).lead_score ?? 0) >= 70).sort((a: any, b: any) => b.lead_score - a.lead_score).slice(0, 4) || [];
  const activeReminders = reminders?.filter(r => !r.is_completed).sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()) || [];
  const overdueReminders = activeReminders.filter(r => isPast(new Date(r.reminder_date)));

  const handleComplete = async (id: string) => {
    try {
      await completeFollowUp.mutateAsync(id);
      toast.success('Task marked as complete');
    } catch (err: any) { toast.error(err.message); }
  };

  if (statsLoading || leadsLoading) {
    return (
      <AppLayout title="Overview" subtitle="Loading real-time command center...">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-[120px] rounded-[2rem]" />
            <Skeleton className="h-[300px] rounded-[2rem]" />
          </div>
          <Skeleton className="h-[500px] rounded-[2rem]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Overview" subtitle="Real-time command center">
      <OnboardingCard />

      {overdueReminders.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse"><AlertTriangle size={16} className="text-destructive" /></div>
              <span className="text-sm font-bold text-destructive">System Alert: {overdueReminders.length} overdue follow-up{overdueReminders.length > 1 ? 's require' : ' requires'} immediate attention.</span>
            </div>
            <Button variant="outline" size="sm" className="h-8 border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-colors" onClick={() => navigate('/leads')}>View Tasks</Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main Dash (Spans 8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Revenue Forecast (High Priority) */}
          {bookingStats && (bookingStats.revenue > 0 || bookingStats.pendingRevenue > 0) && (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-[30px] -mr-10 -mt-10 group-hover:bg-success/20 transition-colors" />
                <div className="flex items-center gap-2 mb-3 text-muted-foreground"><CheckCircle size={14} className="text-success" /><span className="text-[10px] font-bold uppercase tracking-widest">Secured</span></div>
                <p className="text-2xl font-extrabold tracking-tight">₹{(bookingStats.revenue / 1000).toFixed(0)}k</p>
              </motion.div>
              <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-[30px] -mr-10 -mt-10 group-hover:bg-warning/20 transition-colors" />
                <div className="flex items-center gap-2 mb-3 text-muted-foreground"><TrendingUp size={14} className="text-warning" /><span className="text-[10px] font-bold uppercase tracking-widest">Pipeline</span></div>
                <p className="text-2xl font-extrabold tracking-tight">₹{(bookingStats.pendingRevenue / 1000).toFixed(0)}k</p>
              </motion.div>
              <motion.div variants={fadeUp} className="col-span-2 bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur-xl border border-accent/20 p-5 rounded-[1.5rem] relative overflow-hidden flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-accent"><Activity size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Projected Total</span></div>
                  <p className="text-3xl font-extrabold tracking-tight text-accent-foreground">₹{((bookingStats.revenue + bookingStats.pendingRevenue * 0.6) / 1000).toFixed(1)}k</p>
                </div>
                <div className="text-right border-l border-accent/20 pl-6 py-2">
                  <p className="text-xl font-extrabold text-accent-foreground">{bookingStats.confirmed + bookingStats.checkedIn}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Active Tenancies</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Operational KPIs */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <KpiCard title="Total Pipeline" value={stats?.totalLeads ?? 0} icon={<Users size={16} />} />
             <KpiCard title="Conversion" value={stats?.conversionRate ?? 0} suffix="%" icon={<TrendingUp size={16} />} color="hsl(262, 55%, 55%)" />
             <KpiCard title="Response SLA" value={stats?.slaCompliance ?? 0} suffix="%" icon={<Timer size={16} />} color="hsl(var(--info))" />
             <KpiCard title="Avg Response" value={stats?.avgResponseTime ?? 0} suffix="m" icon={<Clock size={16} />} color="hsl(var(--warning))" />
          </motion.div>

          {/* Pipeline Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-[2rem]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-extrabold text-sm tracking-tight">Stage Distribution</h3>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => navigate('/leads')}>View Funnel</Button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.5 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-[2rem] flex flex-col">
              <h3 className="font-extrabold text-sm tracking-tight mb-2">Acquisition Sources</h3>
              <div className="flex-1 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', fontSize: '11px', fontWeight: 600 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="text-2xl font-black">{leads?.length || 0}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Total</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Agent Performance Mini-Roster */}
          <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 rounded-[2rem]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2"><Users size={16} className="text-info" /> Agent Force</h3>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => navigate('/analytics')}>Full Report</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(agentStats || []).slice(0, 3).map(agent => {
                const rate = agent.totalLeads ? Math.round((agent.conversions / agent.totalLeads) * 100) : 0;
                return (
                  <div key={agent.id} className="p-4 rounded-2xl bg-background/50 border border-border/40 flex items-center justify-between group hover:border-info/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center text-info font-black text-xs">{agent.name.charAt(0)}</div>
                      <div>
                        <p className="text-xs font-bold text-foreground line-clamp-1">{agent.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{agent.activeLeads} active leads</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{rate}%</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Win Rate</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: The Action Center (Spans 4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Action Center: Hot Leads */}
          <motion.div variants={fadeUp} className="bg-gradient-to-b from-card/60 to-card/20 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden flex flex-col h-[calc(50%-12px)] min-h-[300px]">
            <div className="p-5 border-b border-border/40 bg-background/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-warning/10 rounded-lg text-warning"><Star size={14} className="fill-current" /></div>
                <h3 className="font-extrabold text-sm tracking-tight">High Priority Leads</h3>
              </div>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-none text-[9px] uppercase tracking-widest px-2">Score &gt; 70</Badge>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              {hotLeads.map((lead: any) => (
                <div key={lead.id} className="p-4 rounded-2xl bg-background/50 border border-border/30 hover:border-warning/30 hover:bg-warning/5 transition-colors cursor-pointer flex items-center justify-between group" onClick={() => navigate(`/leads/${lead.id}`)}>
                  <div>
                    <p className="text-sm font-bold mb-0.5 text-foreground group-hover:text-warning transition-colors">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5"><MapPin size={10} /> {lead.preferred_location || 'Undecided'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-black text-warning">{lead.lead_score}</span>
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </div>
              ))}
              {hotLeads.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 opacity-50">
                  <Star size={32} className="mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">No hot leads detected</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Center: Task Queue */}
          <motion.div variants={fadeUp} className="bg-gradient-to-b from-card/60 to-card/20 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden flex flex-col h-[calc(50%-12px)] min-h-[300px]">
            <div className="p-5 border-b border-border/40 bg-background/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-info/10 rounded-lg text-info"><Clock size={14} /></div>
                <h3 className="font-extrabold text-sm tracking-tight">Task Queue</h3>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase tracking-widest px-2">{activeReminders.length} Pending</Badge>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              {activeReminders.slice(0, 6).map(r => {
                const past = isPast(new Date(r.reminder_date));
                return (
                  <div key={r.id} className={`p-4 rounded-2xl border transition-all ${past ? 'bg-destructive/5 border-destructive/20' : 'bg-background/50 border-border/30 hover:border-info/30'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground line-clamp-1 mb-1 cursor-pointer hover:underline" onClick={() => navigate(`/leads/${r.lead_id}`)}>
                          {(r as any).leads?.name || 'Unknown Lead'}
                        </p>
                        <p className={`text-[10px] font-medium flex items-center gap-1.5 ${past ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <CalendarCheck size={10} /> {format(new Date(r.reminder_date), 'MMM d, h:mm a')}
                        </p>
                        {r.note && <p className="text-[10px] text-muted-foreground mt-2 italic line-clamp-1">"{r.note}"</p>}
                      </div>
                      <Button variant={past ? "destructive" : "outline"} size="sm" className="h-8 rounded-xl text-[10px] font-bold px-4 shrink-0 shadow-sm" onClick={() => handleComplete(r.id)}>
                        Resolve
                      </Button>
                    </div>
                  </div>
                );
              })}
              {activeReminders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 opacity-50">
                  <CheckCircle size={32} className="mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Inbox Zero</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;