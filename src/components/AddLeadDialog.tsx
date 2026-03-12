import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, AlertTriangle, Cpu, Phone, Mail, MapPin, IndianRupee, User, FileText, ScanText, Crosshair } from 'lucide-react';
import { useCreateLead, useAgents } from '@/hooks/useCrmData';
import { SOURCE_LABELS } from '@/types/crm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseLeadText, type ParsedLead } from '@/lib/parseLeadText';
import { motion, AnimatePresence } from 'framer-motion';

const AddLeadDialog = () => {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedLead | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'whatsapp' as string,
    budget: '', preferred_location: '', notes: '', assigned_agent_id: '' as string,
  });
  const [duplicate, setDuplicate] = useState<{ id: string; name: string; phone: string; status: string } | null>(null);

  const createLead = useCreateLead();
  const { data: agents } = useAgents();

  const checkDuplicate = async (phone: string) => {
    if (!phone || phone.length < 5) { setDuplicate(null); return; }
    const { data } = await supabase.from('leads').select('id, name, phone, status').eq('phone', phone).limit(1);
    if (data && data.length > 0) setDuplicate(data[0]);
    else setDuplicate(null);
  };

  const handleParse = useCallback((text: string) => {
    setRawText(text);
    if (!text.trim()) { setParsed(null); return; }
    const result = parseLeadText(text);
    setParsed(result);
    setForm(f => ({
      ...f,
      name: result.name || f.name,
      phone: result.phone || f.phone,
      email: result.email || f.email,
      budget: result.budget || f.budget,
      preferred_location: result.preferred_location || f.preferred_location,
      notes: result.notes || f.notes,
    }));
    if (result.phone) checkDuplicate(result.phone);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Primary identifiers (Name & Phone) required');
      return;
    }
    try {
      const agentId = form.assigned_agent_id || agents?.[0]?.id || null;
      await createLead.mutateAsync({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        source: form.source as any,
        budget: form.budget || null,
        preferred_location: form.preferred_location || null,
        notes: form.notes || null,
        assigned_agent_id: agentId,
        status: 'new',
      });
      toast.success('Subject dossier successfully cataloged.');
      setOpen(false);
      setDuplicate(null);
      setParsed(null);
      setRawText('');
      setForm({ name: '', phone: '', email: '', source: 'whatsapp', budget: '', preferred_location: '', notes: '', assigned_agent_id: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to catalog subject');
    }
  };

  const chips = parsed ? [
    { icon: User, label: 'Identity', value: parsed.name, conf: parsed.confidence.name, color: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
    { icon: Phone, label: 'Comms', value: parsed.phone, conf: parsed.confidence.phone, color: 'text-emerald-500', border: 'border-emerald-500/30' },
    { icon: Mail, label: 'Digital', value: parsed.email, conf: parsed.confidence.email, color: 'text-sky-500', border: 'border-sky-500/30' },
    { icon: IndianRupee, label: 'Value', value: parsed.budget, conf: parsed.confidence.budget, color: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30' },
    { icon: MapPin, label: 'Sector', value: parsed.preferred_location, conf: parsed.confidence.location, color: 'text-[#A62639]', border: 'border-[#A62639]/30' },
    { icon: FileText, label: 'Intel', value: parsed.notes, conf: 0.5, color: 'text-white/50', border: 'border-white/20' },
  ].filter(f => f.value) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDuplicate(null); setParsed(null); setRawText(''); } }}>
      <DialogTrigger asChild>
        <Button className="h-10 px-4 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors">
          <Plus size={14} className="mr-2" /> Log Subject
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] rounded-none bg-[#0A0A0C] border-2 border-[#D4AF37] p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <DialogHeader className="p-6 border-b border-white/10 bg-[#121215] flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="font-serif text-xl italic text-white flex items-center gap-3">
              <ScanText size={20} className="text-[#D4AF37]" /> Subject Intake Protocol
            </DialogTitle>
            <p className="text-[9px] font-mono tracking-widest text-white/40 uppercase mt-1">Manual Dossier Creation</p>
          </div>
        </DialogHeader>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          
          {/* Smart Parser / Intercept Module */}
          <div className="space-y-3 bg-[#121215] border border-white/5 p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]/50" />
            <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37] flex items-center gap-2 mb-2">
              <Cpu size={12} /> Raw Intercept Decoder
            </Label>
            <Textarea
              placeholder={"PASTE RAW INTEL HERE...\n[ FORMAT: Name | Comms | Target Sector | Value ]"}
              value={rawText}
              onChange={e => handleParse(e.target.value)}
              rows={3}
              className="rounded-none text-[11px] font-mono tracking-wider resize-none border border-white/10 focus:border-[#D4AF37] bg-black text-white placeholder:text-white/20 transition-all"
            />
            
            <AnimatePresence>
              {chips.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap gap-2 pt-2">
                  {chips.map((f, i) => (
                    <motion.span
                      key={f.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-black text-[9px] font-mono tracking-widest uppercase border ${f.border}`}
                    >
                      <f.icon size={10} className={f.color} />
                      <span className="text-white/70">{f.label}:</span>
                      <span className="text-white font-bold truncate max-w-[120px]">{f.value}</span>
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Matrix */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Subject Designation *</Label>
                <Input placeholder="Legal Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Direct Line *</Label>
                <Input
                  placeholder="+91 Mobile"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  onBlur={() => checkDuplicate(form.phone)}
                  className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs transition-colors"
                />
              </div>
            </div>

            <AnimatePresence>
              {duplicate && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="bg-[#A62639]/10 border border-[#A62639]/30 p-4 flex items-start gap-3 text-[#A62639]">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Entity Conflict Detected</p>
                    <p className="text-[10px] font-mono text-white/70 uppercase">
                      Match: <span className="text-white font-bold">{duplicate.name}</span> [{duplicate.phone}]<br/>
                      Current State: <span className="text-[#A62639]">{duplicate.status.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Digital Address</Label>
                <Input type="email" placeholder="email@domain.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Acquisition Vector</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-[#D4AF37]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white uppercase">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Authorized Value (₹)</Label>
                <Input placeholder="e.g. 15000" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs transition-colors" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Target Sector</Label>
                <Input placeholder="Locality" value={form.preferred_location} onChange={e => setForm(f => ({ ...f, preferred_location: e.target.value }))} className="h-12 rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Assign Operative</Label>
              <Select value={form.assigned_agent_id} onValueChange={v => setForm(f => ({ ...f, assigned_agent_id: v }))}>
                <SelectTrigger className="h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-xs focus:ring-[#D4AF37]">
                  <SelectValue placeholder="System Auto-Routing (Round Robin)" />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-[#121215] border-[#D4AF37]">
                  {agents?.map(a => (
                    <SelectItem key={a.id} value={a.id} className="font-mono text-xs focus:bg-[#D4AF37]/20 focus:text-white uppercase">{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-mono tracking-widest uppercase text-white/50">Intelligence Notes</Label>
              <Textarea placeholder="Append additional directives..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-none bg-[#121215] border-white/10 focus:border-[#D4AF37] text-white font-mono text-xs transition-colors resize-none" />
            </div>

          </form>
        </div>
        
        {/* Command Footer */}
        <div className="p-6 border-t border-white/10 bg-[#121215] flex justify-end gap-4 shrink-0">
          <Button type="button" variant="ghost" className="rounded-none text-[10px] font-black tracking-widest uppercase hover:bg-white/5 text-white/50 hover:text-white" onClick={() => setOpen(false)}>
            Abort
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createLead.isPending}
            className="h-10 px-8 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors"
          >
            {createLead.isPending ? 'Encrypting...' : 'Log Dossier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;