import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AddLeadDialog from '@/components/AddLeadDialog';
import LeadDetailDrawer from '@/components/LeadDetailDrawer';
import { useLeadsPaginated, useUpdateLead, useAgents, type LeadWithRelations } from '@/hooks/useCrmData';
import { useBulkUpdateLeads, useDeleteLeads } from '@/hooks/useLeadDetails';
import { PIPELINE_STAGES, SOURCE_LABELS } from '@/types/crm';
import { Filter, Download, Star, Trash2, PhoneCall, MessageCircle, ChevronDown, CheckSquare, Zap, MapPin, UserSquare2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const scoreTheme = (score: number) => {
  if (score >= 70) return { text: 'text-warning', bg: 'bg-warning/10', icon: Zap };
  if (score >= 40) return { text: 'text-info', bg: 'bg-info/10', icon: Star };
  return { text: 'text-muted-foreground', bg: 'bg-secondary', icon: Star };
};

const getStageTheme = (key: string) => {
  const stage = PIPELINE_STAGES.find(s => s.key === key);
  if (!stage) return 'bg-secondary text-muted-foreground';
  // Mapping original colors to subtle glassmorphic equivalents
  if (stage.color.includes('warning')) return 'bg-warning/10 text-warning border-warning/20';
  if (stage.color.includes('success')) return 'bg-success/10 text-success border-success/20';
  if (stage.color.includes('destructive')) return 'bg-destructive/10 text-destructive border-destructive/20';
  if (stage.color.includes('info')) return 'bg-info/10 text-info border-info/20';
  return 'bg-accent/10 text-accent border-accent/20';
};

const Leads = () => {
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  
  const { data: paginatedData, isLoading } = useLeadsPaginated(page, PAGE_SIZE);
  const leads = paginatedData?.leads;
  const totalLeads = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(totalLeads / PAGE_SIZE);
  
  const { data: agents } = useAgents();
  const bulkUpdate = useBulkUpdateLeads();
  const deleteLeads = useDeleteLeads();
  const updateLead = useUpdateLead();

  const filtered = (leads || [])
    .filter(l => {
      if (filterSource !== 'all' && l.source !== filterSource) return false;
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'score_high': return (b.lead_score ?? 0) - (a.lead_score ?? 0);
        case 'score_low': return (a.lead_score ?? 0) - (b.lead_score ?? 0);
        case 'response': return (a.first_response_time_min ?? 999) - (b.first_response_time_min ?? 999);
        default: return 0;
      }
    });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(l => l.id)));
  };

  const handleBulkAssign = async (agentId: string) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), updates: { assigned_agent_id: agentId } });
      toast.success(`${selectedIds.size} leads successfully reassigned`);
      setSelectedIds(new Set());
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), updates: { status: status as any } });
      toast.success(`Pipeline stage updated for ${selectedIds.size} leads`);
      setSelectedIds(new Set());
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.size} leads? This action cannot be reversed.`)) return;
    try {
      await deleteLeads.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} records purged`);
      setSelectedIds(new Set());
    } catch (err: any) { toast.error(err.message); }
  };

  const handleInlineStatus = async (leadId: string, newStatus: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus as any });
      toast.success('Pipeline stage updated');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Phone', 'Email', 'Source', 'Status', 'Agent', 'Location', 'Budget', 'Score'].join(','),
      ...filtered.map(l => [l.name, l.phone, l.email || '', l.source, l.status, l.agents?.name || '', l.preferred_location || '', l.budget || '', l.lead_score ?? 0].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gharpayy-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const openDetail = (lead: LeadWithRelations) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout title="Lead Pipeline" subtitle="Loading secure records...">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-[2rem]" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Lead Pipeline" subtitle={`Managing ${totalLeads} active inquiries`} actions={<AddLeadDialog />}>
      
      {/* Control Center (Filters) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md border border-border/50 p-2 rounded-2xl shadow-sm flex-wrap">
          <div className="flex items-center px-3 text-muted-foreground"><Filter size={16} /></div>
          
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-10 w-[160px] bg-background/50 border-none rounded-xl font-medium text-xs focus:ring-accent/20">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50 shadow-xl">
              <SelectItem value="all" className="text-xs font-medium">All Sources</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs font-medium">{v}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border/50 hidden sm:block" />

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10 w-[160px] bg-background/50 border-none rounded-xl font-medium text-xs focus:ring-accent/20">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50 shadow-xl">
              <SelectItem value="all" className="text-xs font-medium">All Stages</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key} className="text-xs font-medium">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border/50 hidden sm:block" />

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-10 w-[160px] bg-background/50 border-none rounded-xl font-medium text-xs focus:ring-accent/20">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50 shadow-xl">
              <SelectItem value="newest" className="text-xs font-medium">Newest First</SelectItem>
              <SelectItem value="oldest" className="text-xs font-medium">Oldest First</SelectItem>
              <SelectItem value="score_high" className="text-xs font-medium">AI Score (High &rarr; Low)</SelectItem>
              <SelectItem value="score_low" className="text-xs font-medium">AI Score (Low &rarr; High)</SelectItem>
              <SelectItem value="response" className="text-xs font-medium">Response Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" className="h-12 px-6 gap-2 rounded-2xl border-border/50 bg-card/40 backdrop-blur-sm shadow-sm hover:bg-background/80 font-bold active:scale-95 transition-all" onClick={handleExport}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {/* Floating Bulk Actions Panel */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="sticky top-20 z-40 flex items-center gap-4 mb-6 p-4 bg-foreground text-background rounded-2xl shadow-2xl flex-wrap"
          >
            <div className="flex items-center gap-2 px-3 bg-background/10 rounded-xl h-10">
              <CheckSquare size={16} />
              <span className="text-sm font-extrabold">{selectedIds.size} Selected</span>
            </div>
            
            <div className="flex-1" />

            <Select onValueChange={handleBulkAssign}>
              <SelectTrigger className="h-10 w-[160px] bg-background/10 border-none text-background rounded-xl font-bold text-xs">
                <SelectValue placeholder="Assign Agent..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-border/50">
                {agents?.map(a => <SelectItem key={a.id} value={a.id} className="text-xs font-bold">{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select onValueChange={handleBulkStatus}>
              <SelectTrigger className="h-10 w-[160px] bg-background/10 border-none text-background rounded-xl font-bold text-xs">
                <SelectValue placeholder="Move Stage..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-border/50">
                {PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key} className="text-xs font-bold">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="destructive" className="h-10 px-5 text-xs font-bold gap-2 rounded-xl" onClick={handleBulkDelete}>
              <Trash2 size={14} /> Purge
            </Button>
            
            <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-background/50 hover:text-background transition-colors px-2">
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Data Grid */}
      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-background/40">
                <th className="px-6 py-5 w-12 text-center">
                  <Checkbox 
                    className="border-muted-foreground/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                    checked={selectedIds.size === filtered.length && filtered.length > 0} 
                    onCheckedChange={toggleAll} 
                  />
                </th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prospect Info</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source & Origin</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pipeline Stage</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Score</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Agent</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {filtered.map(lead => {
                const sTheme = scoreTheme(lead.lead_score ?? 0);
                const ScoreIcon = sTheme.icon;
                
                return (
                  <motion.tr 
                    variants={fadeUp}
                    key={lead.id} 
                    className="border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer group"
                    onClick={() => openDetail(lead)}
                  >
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <Checkbox 
                        className="border-muted-foreground/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent transition-all"
                        checked={selectedIds.has(lead.id)} 
                        onCheckedChange={() => toggleSelect(lead.id)} 
                      />
                    </td>
                    
                    <td className="px-4 py-4">
                      <p className="font-extrabold text-sm text-foreground mb-1 group-hover:text-accent transition-colors">{lead.name}</p>
                      <p className="text-xs font-medium text-muted-foreground tracking-tight">{lead.phone}</p>
                    </td>
                    
                    <td className="px-4 py-4">
                      <Badge variant="secondary" className="bg-background/50 border border-border/50 text-[10px] font-bold uppercase tracking-wider">
                        {SOURCE_LABELS[lead.source as keyof typeof SOURCE_LABELS] || lead.source}
                      </Badge>
                      {lead.preferred_location && (
                        <p className="text-[10px] text-muted-foreground font-medium mt-2 flex items-center gap-1">
                          <MapPin size={10} /> {lead.preferred_location}
                        </p>
                      )}
                    </td>
                    
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      {/* Native Select styled as a premium Badge */}
                      <div className="relative inline-flex items-center">
                        <select
                          value={lead.status}
                          onChange={e => handleInlineStatus(lead.id, e.target.value)}
                          className={`appearance-none font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 pr-8 rounded-lg border cursor-pointer outline-none transition-all ${getStageTheme(lead.status)}`}
                        >
                          {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key} className="bg-background text-foreground">{s.label}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 pointer-events-none opacity-50" />
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-transparent font-black text-xs ${sTheme.bg} ${sTheme.text}`}>
                        <ScoreIcon size={12} className="fill-current" />
                        {lead.lead_score ?? 0}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                          {lead.agents?.name ? lead.agents.name.charAt(0) : <UserSquare2 size={10} />}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                          {lead.agents?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`tel:${lead.phone}`} className="w-9 h-9 flex items-center justify-center rounded-xl bg-background border border-border/50 hover:bg-info/10 hover:text-info hover:border-info/30 transition-all shadow-sm" title="Call Prospect">
                          <PhoneCall size={14} />
                        </a>
                        <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-xl bg-background border border-border/50 hover:bg-success/10 hover:text-success hover:border-success/30 transition-all shadow-sm" title="WhatsApp Message">
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/50 mb-4">
                      <Search size={24} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-lg font-bold text-foreground">No leads found</p>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>

      {/* Modern Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-card/40 px-4 py-2 rounded-xl border border-border/50">
            Showing <span className="text-foreground">{page * PAGE_SIZE + 1}</span> – <span className="text-foreground">{Math.min((page + 1) * PAGE_SIZE, totalLeads)}</span> of {totalLeads}
          </p>
          <div className="flex gap-2 p-1.5 bg-card/40 border border-border/50 rounded-2xl backdrop-blur-sm">
            <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs font-bold hover:bg-background" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs font-bold hover:bg-background" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <LeadDetailDrawer lead={selectedLead} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </AppLayout>
  );
};

export default Leads;