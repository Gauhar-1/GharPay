import AppLayout from '@/components/AppLayout';
import { useAgentStats, useLeads, useVisits } from '@/hooks/useCrmData';
import { PIPELINE_STAGES, SOURCE_LABELS } from '@/types/crm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Trophy, TrendingDown, Target, Activity, Users, Zap, Search, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const springTransition = { type: 'spring', bounce: 0, duration: 0.7, ease: [0.32, 0.72, 0, 1] };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const Analytics = () => {
  const { data: agentStats, isLoading: agentsLoading } = useAgentStats();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: visits } = useVisits();

  if (agentsLoading || leadsLoading) {
    return (
      <AppLayout title="Intelligence" subtitle="Real-time performance metrics">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[400px] rounded-[2rem]" />)}
        </div>
      </AppLayout>
    );
  }

  // --- Data Crunching ---
  const totalLeads = leads?.length || 0;
  const totalBookings = leads?.filter(l => l.status === 'booked').length || 0;

  // 1. Conversion Funnel
  const funnelData = PIPELINE_STAGES.filter(s => s.key !== 'lost').map((stage, i, arr) => {
    const count = leads?.filter(l => l.status === stage.key).length || 0;
    const prevCount = i > 0 ? (leads?.filter(l => l.status === arr[i - 1].key).length || 0) : count;
    const dropOff = i > 0 && prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
    return { name: stage.label, count, dropOff };
  });
  const maxFunnel = Math.max(...funnelData.map(f => f.count), 1);

  // 2. Source ROI
  const sourceROI = Object.entries(SOURCE_LABELS).map(([key, label]) => {
    const srcLeads = leads?.filter(l => l.source === key) || [];
    return {
      source: label,
      leads: srcLeads.length,
      bookings: srcLeads.filter(l => l.status === 'booked').length,
    };
  }).filter(s => s.leads > 0);

  // 3. Agent Leaderboard
  const leaderboard = [...(agentStats || [])].sort((a, b) => {
    const rateA = a.totalLeads ? a.conversions / a.totalLeads : 0;
    const rateB = b.totalLeads ? b.conversions / b.totalLeads : 0;
    return rateB - rateA;
  });

  // 4. Weekly Trends
  const weekMap: Record<string, { leads: number; bookings: number }> = {};
  (leads || []).forEach(l => {
    const d = new Date(l.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weekMap[key]) weekMap[key] = { leads: 0, bookings: 0 };
    weekMap[key].leads++;
    if (l.status === 'booked') weekMap[key].bookings++;
  });
  const weeklyTrends = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, data]) => ({
      week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...data,
    }));

  const chartTooltipStyle = {
    borderRadius: '16px',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
    fontSize: '12px',
    fontWeight: 600,
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    padding: '12px',
  };

  return (
    <AppLayout title="Intelligence" subtitle="Real-time performance and pipeline insights">
      
      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
      </div>

      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Velocity Trends */}
        <motion.div variants={fadeUp} className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-border/50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Activity size={20} className="text-accent" /> Velocity Trends
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Lead generation vs successful bookings over time</p>
            </div>
            <Badge variant="secondary" className="bg-background/50 border-none px-3 py-1.5">Last 8 Weeks</Badge>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" name="Total Leads" />
                <Area type="monotone" dataKey="bookings" stroke="hsl(var(--success))" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pipeline Funnel */}
        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Target size={20} className="text-info" /> Pipeline Funnel
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Stage-by-stage drop-off analysis</p>
            </div>
            <p className="text-2xl font-black text-foreground">{totalLeads}</p>
          </div>
          
          <div className="flex-1 space-y-6">
            {funnelData.map((stage, i) => (
              <div key={stage.name} className="relative group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stage.name}</span>
                  <span className="text-sm font-extrabold text-foreground">{stage.count}</span>
                </div>
                <div className="h-4 bg-secondary/50 rounded-full overflow-hidden relative border border-border/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-info/80 to-info rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
                  />
                </div>
                {stage.dropOff > 0 && (
                  <div className="absolute right-0 -bottom-5 text-[10px] font-bold text-destructive flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingDown size={12} /> {stage.dropOff}% drop
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Source ROI */}
        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Search size={20} className="text-success" /> Acquisition ROI
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Lead volume vs closed bookings</p>
            </div>
            <p className="text-2xl font-black text-foreground">{totalBookings}</p>
          </div>
          
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceROI} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="source" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} />
                <Bar dataKey="leads" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} name="Total Leads" barSize={16} />
                <Bar dataKey="bookings" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} name="Bookings" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Agent Leaderboard - Spans 2 columns */}
        <motion.div variants={fadeUp} className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-border/50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Trophy size={20} className="text-warning" /> Agent Roster
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Top performers ranked by conversion rate</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaderboard.map((agent, i) => {
              const rate = agent.totalLeads ? Math.round((agent.conversions / agent.totalLeads) * 100) : 0;
              return (
                <div key={agent.id} className="relative flex items-center gap-4 p-5 rounded-2xl bg-background/40 border border-border/40 hover:bg-background/80 transition-colors group overflow-hidden">
                  
                  {/* Top 3 Glow Effect */}
                  {i < 3 && <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl opacity-20 ${i===0 ? 'bg-warning' : i===1 ? 'bg-slate-400' : 'bg-amber-600'}`} />}

                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 shadow-sm relative z-10 ${
                    i === 0 ? 'bg-gradient-to-br from-warning to-orange-500 text-white shadow-warning/20' : 
                    i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
                    i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    #{i + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-sm font-extrabold text-foreground truncate group-hover:text-accent transition-colors">{agent.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Users size={10}/> {agent.activeLeads} active</span>
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Clock size={10}/> {agent.avgResponseTime}m</span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 relative z-10">
                    <p className="text-xl font-black text-foreground tracking-tight">{rate}%</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{agent.conversions}/{agent.totalLeads}</p>
                  </div>
                </div>
              );
            })}
            
            {leaderboard.length === 0 && (
              <div className="col-span-full py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-3xl">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4"><Users size={24} className="text-muted-foreground/50" /></div>
                <p className="text-lg font-bold text-foreground">No agent data recorded</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">Stats will populate as leads are processed.</p>
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </AppLayout>
  );
};

export default Analytics;