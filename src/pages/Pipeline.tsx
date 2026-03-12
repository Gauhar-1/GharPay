import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import LeadDetailDrawer from '@/components/LeadDetailDrawer';
import AddLeadDialog from '@/components/AddLeadDialog';
import { useLeads, useUpdateLead } from '@/hooks/useCrmData';
import { PIPELINE_STAGES, type PipelineStage } from '@/types/crm';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor,
  useSensor, useSensors, type DragStartEvent, type DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import type { LeadWithRelations } from '@/hooks/useCrmData';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Zap, UserSquare2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// --- CUSTOM INLINE KANBAN CARD ---
function KanbanCard({ lead, isDragging, onClick }: { lead: LeadWithRelations; isDragging?: boolean; onClick?: () => void }) {
  const isStale = new Date(lead.last_activity_at).getTime() < Date.now() - 7 * 86400000;
  const isHot = (lead.lead_score ?? 0) >= 70;

  return (
    <div 
      onClick={onClick}
      className={`relative bg-card border ${isDragging ? 'border-accent shadow-2xl shadow-accent/20' : 'border-border/50 hover:border-border'} p-4 rounded-2xl shadow-sm transition-all group ${isDragging ? 'rotate-2 scale-105 cursor-grabbing' : 'cursor-grab hover:shadow-md'}`}
    >
      {/* Decorative left accent line based on score */}
      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${isHot ? 'bg-warning' : isStale ? 'bg-destructive' : 'bg-transparent'}`} />
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-extrabold text-foreground tracking-tight group-hover:text-accent transition-colors">{lead.name}</h4>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{lead.phone}</p>
        </div>
        {lead.lead_score ? (
          <Badge variant="secondary" className={`px-1.5 py-0.5 text-[9px] font-bold border-none gap-1 ${isHot ? 'bg-warning/10 text-warning' : 'bg-background/50'}`}>
            <Zap size={8} className={isHot ? "fill-current" : ""} /> {lead.lead_score}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2 mb-4">
        {lead.preferred_location && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
            <MapPin size={12} /> <span className="truncate">{lead.preferred_location}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
            {lead.agents?.name ? lead.agents.name.charAt(0) : <UserSquare2 size={10} />}
          </div>
          <span className="text-[9px] font-bold text-foreground truncate max-w-[80px]">
            {lead.agents?.name?.split(' ')[0] || 'Unassigned'}
          </span>
        </div>
        
        <div className={`flex items-center gap-1 text-[9px] font-semibold ${isStale ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isStale ? <AlertCircle size={10} /> : <Clock size={10} />}
          {formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true }).replace('about ', '')}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex-1 p-3 space-y-3 transition-colors duration-300 rounded-b-[2rem] ${isOver ? 'bg-accent/5' : 'bg-transparent'}`}>
      {children}
    </div>
  );
}

function DraggableCardWrapper({ lead, onClick }: { lead: LeadWithRelations; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <KanbanCard lead={lead} isDragging={false} onClick={onClick} />
    </div>
  );
}

const Pipeline = () => {
  const { data: leads, isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeLead = leads?.find(l => l.id === activeId);

  const conversionRates = useMemo(() => {
    if (!leads) return {};
    const rates: Record<string, number> = {};
    for (let i = 0; i < PIPELINE_STAGES.length - 1; i++) {
      const current = leads.filter(l => PIPELINE_STAGES.findIndex(s => s.key === l.status) >= i).length;
      const next = leads.filter(l => PIPELINE_STAGES.findIndex(s => s.key === l.status) >= i + 1).length;
      rates[PIPELINE_STAGES[i].key] = current > 0 ? Math.round((next / current) * 100) : 0;
    }
    return rates;
  }, [leads]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    
    const leadId = active.id as string;
    const newStatus = over.id as PipelineStage;
    const lead = leads?.find(l => l.id === leadId);
    
    if (!lead || lead.status === newStatus) return;
    
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus });
      toast.success(`Transferred to ${PIPELINE_STAGES.find(s => s.key === newStatus)?.label}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pipeline');
    }
  };

  const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
  };

  if (isLoading) {
    return (
      <AppLayout title="Deal Pipeline" subtitle="Loading revenue engine...">
        <div className="flex gap-6 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[600px] min-w-[320px] rounded-[2rem]" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Deal Pipeline" subtitle="Drag and drop to accelerate revenue" actions={<AddLeadDialog />}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        
        {/* Horizontal Scroll Container */}
        <div className="overflow-x-auto pb-8 -mx-6 px-6 scrollbar-hide">
          <div className="flex min-w-max items-stretch h-[calc(100vh-220px)] min-h-[600px]">
            
            {PIPELINE_STAGES.map((stage, i) => {
              const stageLeads = leads?.filter(l => l.status === stage.key) || [];
              const rate = conversionRates[stage.key];
              const totalValue = stageLeads.reduce((acc, l) => acc + (parseInt(l.budget?.replace(/\D/g, '') || '0') || 0), 0);

              return (
                <div key={stage.key} className="flex relative">
                  
                  {/* The Glassmorphic Column */}
                  <motion.div
                    className="w-[320px] flex flex-col bg-background/40 backdrop-blur-xl border border-border/40 rounded-[2rem] shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: [0.32, 0.72, 0, 1] }}
                  >
                    {/* Column Header */}
                    <div className="p-5 border-b border-border/40 bg-card/60 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                            stage.color.includes('warning') ? 'bg-warning shadow-warning/50' :
                            stage.color.includes('success') ? 'bg-success shadow-success/50' :
                            stage.color.includes('destructive') ? 'bg-destructive shadow-destructive/50' :
                            stage.color.includes('info') ? 'bg-info shadow-info/50' : 'bg-accent shadow-accent/50'
                          }`} />
                          <h3 className="font-extrabold text-sm tracking-tight text-foreground">{stage.label}</h3>
                        </div>
                        <Badge variant="secondary" className="bg-background border-border/50 text-[10px] font-black">{stageLeads.length}</Badge>
                      </div>
                      
                      {/* Optional Value Indicator */}
                      {totalValue > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Pipeline Value</span>
                          <span className="text-foreground">₹{(totalValue / 1000).toFixed(1)}k</span>
                        </div>
                      )}
                    </div>

                    {/* Droppable Area */}
                    <DroppableColumn id={stage.key}>
                      {stageLeads.map(lead => (
                        <DraggableCardWrapper key={lead.id} lead={lead} onClick={() => { setSelectedLead(lead); setDrawerOpen(true); }} />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-2xl mx-1 mt-1 opacity-50">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Drop here</p>
                        </div>
                      )}
                    </DroppableColumn>
                  </motion.div>

                  {/* Intersecting Conversion Rate Node */}
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="flex flex-col justify-center items-center w-8 shrink-0 relative z-10 -mx-4 pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-card border border-border/60 shadow-lg flex items-center justify-center mt-12 mb-2">
                        <ArrowRight size={14} className="text-muted-foreground" />
                      </div>
                      {rate !== undefined && (
                        <div className={`px-2 py-1 rounded-md border text-[9px] font-black backdrop-blur-md shadow-sm ${
                          rate >= 50 ? 'bg-success/10 text-success border-success/20' : 
                          rate >= 25 ? 'bg-warning/10 text-warning border-warning/20' : 
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }`}>
                          {rate}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* The Dragged Item Overlay */}
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeLead ? <KanbanCard lead={activeLead} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <LeadDetailDrawer lead={selectedLead} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </AppLayout>
  );
};

export default Pipeline;