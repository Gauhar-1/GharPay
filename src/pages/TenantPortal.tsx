import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Loader2, Home, AlertCircle, BookOpen, Wifi, Coffee, Shield, Clock, Plus, 
  CheckCircle2, AlertTriangle, Building2, Calendar, LogOut, Star, Wrench, 
  CreditCard, MessageSquare, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  useTenantBooking, useTenantIssues, useSubmitIssue, usePgRules
} from '@/hooks/useTenantPortal';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.5, ease: [0.32, 0.72, 0, 1] };

const ISSUE_CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing', icon: '🚿' },
  { value: 'electrical', label: 'Electrical', icon: '⚡' },
  { value: 'hvac', label: 'AC / Heating', icon: '❄️' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'internet', label: 'Internet / WiFi', icon: '📶' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
  { value: 'general', label: 'General', icon: '📝' },
];

const ISSUE_STATUS_THEME: Record<string, string> = {
  open: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  in_progress: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  closed: 'bg-secondary text-muted-foreground border-border',
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={20} />, Food: <Coffee size={20} />, Security: <Shield size={20} />,
  Cleaning: <Star size={20} />, Laundry: <Wrench size={20} />,
};

type PgRule = {
  id: string; property_id: string; rule_text: string;
  category: string; is_active: boolean; created_at: string;
};

export default function TenantPortal() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const { data: booking, isLoading: bookingLoading } = useTenantBooking();
  const { data: issues, isLoading: issuesLoading } = useTenantIssues(booking?.id);
  const { data: rules } = usePgRules((booking as any)?.properties?.id || (booking as any)?.property_id);
  const submitIssue = useSubmitIssue();

  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'rules'>('overview');
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' });
  const [stayDays, setStayDays] = useState('');
  const [updatingDays, setUpdatingDays] = useState(false);

  if (authLoading || bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">Syncing Portal Data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-6 border border-border">
            <Home size={40} className="text-muted-foreground/50" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Awaiting Lease Activation</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Your profile is verified, but no active property lease is linked to this account. Browse available spaces to generate a contract.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/explore')} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg">
              Explore Available Properties <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button variant="ghost" onClick={() => signOut()} className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground">
              Sign Out
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const property = (booking as any).properties;
  const room = (booking as any).rooms;
  const bed = (booking as any).beds;
  const lead = (booking as any).leads;

  const moveInDate = booking.move_in_date ? new Date(booking.move_in_date) : null;
  const checkoutDate = (booking as any).checkout_date ? new Date((booking as any).checkout_date) :
    (moveInDate && stayDays ? addDays(moveInDate, parseInt(stayDays)) : null);
  const daysRemaining = checkoutDate ? differenceInDays(checkoutDate, new Date()) : null;

  const openIssuesCount = issues?.filter(i => i.status === 'open' || i.status === 'in_progress').length || 0;

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.title.trim()) { toast.error('Please describe the issue'); return; }
    try {
      await submitIssue.mutateAsync({
        booking_id: booking.id,
        property_id: property?.id,
        tenant_name: lead?.name || user.user_metadata?.full_name || user.email || 'Tenant',
        tenant_phone: lead?.phone,
        title: issueForm.title,
        description: issueForm.description,
        category: issueForm.category,
        priority: issueForm.priority,
      });
      toast.success('Ticket submitted to property management.');
      setIssueForm({ title: '', description: '', category: 'general', priority: 'medium' });
      setIssueOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdateStayDuration = async () => {
    if (!stayDays || isNaN(parseInt(stayDays))) { toast.error('Please enter a valid number of days'); return; }
    setUpdatingDays(true);
    try {
      await supabase.from('bookings').update({ stay_duration_days: parseInt(stayDays) } as any).eq('id', booking.id);
      qc.invalidateQueries({ queryKey: ['tenant-booking'] });
      toast.success('Lease duration updated.');
    } catch (e: any) { toast.error(e.message); } finally { setUpdatingDays(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-background">
      {/* App Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-black text-lg">G</span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Gharpayy</span>
              <Badge variant="secondary" className="ml-2 text-[10px] uppercase tracking-widest font-semibold bg-secondary/50">Resident</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-border/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">{user.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:bg-destructive/10 hover:text-destructive rounded-full">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Top Section: Lease Card & Financials */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Primary Identity Card */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1">
                      <CheckCircle2 size={14} className="mr-1.5" /> Active Lease
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">ID: {booking.id.split('-')[0]}</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-foreground">{property?.name || 'Unnamed Property'}</h1>
                  <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                    <Building2 size={16} /> Unit {room?.room_number} <span className="text-border mx-1">|</span> Bed {bed?.bed_number}
                    {property?.area && <><span className="text-border mx-1">|</span> {property.area}</>}
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Entry Date</p>
                  <p className="font-medium text-foreground">{moveInDate ? format(moveInDate, 'dd MMM yyyy') : 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Lease Expiry</p>
                  <p className="font-medium text-foreground">{checkoutDate ? format(checkoutDate, 'dd MMM yyyy') : 'Open Ended'}</p>
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                      <Clock size={12} /> Stay Extension
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="h-9 w-24 bg-secondary/30 border-border/50 focus-visible:ring-primary/50 text-sm"
                        placeholder="Days"
                        value={stayDays || (booking as any).stay_duration_days || ''}
                        onChange={e => setStayDays(e.target.value)}
                      />
                      <Button size="sm" variant="secondary" className="h-9 px-4 text-xs font-semibold" onClick={handleUpdateStayDuration} disabled={updatingDays}>
                        {updatingDays ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  </div>
                  {daysRemaining !== null && (
                    <div className={`px-4 py-2 rounded-xl text-center min-w-24 ${daysRemaining < 15 ? 'bg-destructive/10 text-destructive' : 'bg-secondary/50 text-foreground'}`}>
                      <p className="text-xl font-black leading-none">{daysRemaining}</p>
                      <p className="text-[10px] uppercase tracking-widest mt-1 font-semibold opacity-70">Days Left</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-card rounded-3xl border border-border shadow-sm p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <CreditCard size={24} />
              </div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Monthly Obligation</p>
              <h2 className="text-4xl font-black tracking-tight text-foreground flex items-baseline">
                ₹{(booking.monthly_rent || 0).toLocaleString()} <span className="text-sm font-medium text-muted-foreground ml-2">/mo</span>
              </h2>
            </div>
            
            <div className="mt-8 space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/30 border border-border/50">
                <span className="text-sm text-muted-foreground font-medium">Status</span>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold">Cleared</Badge>
              </div>
              <Button className="w-full h-12 rounded-xl font-semibold shadow-sm" variant="outline">
                View Payment History
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Pill Style) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview', label: 'Property Overview', icon: Building2 },
            { id: 'issues', label: 'Maintenance Hub', icon: Wrench, badge: openIssuesCount },
            { id: 'rules', label: 'Facility Policies', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-card text-muted-foreground border border-border hover:bg-secondary/80'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.badge ? (
                <span className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-destructive text-white'}`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* TAB: OVERVIEW (Amenities) */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springTransition}>
              <h2 className="text-xl font-bold mb-4">Included Amenities</h2>
              {property?.amenities && property.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {property.amenities.map((amenity: string) => {
                    const schedules: Record<string, string> = {
                      Food: 'Breakfast, Lunch, Dinner', Laundry: 'Mon/Thu/Sat pickup', Cleaning: 'Daily Room Service',
                      WiFi: 'High-speed Fiber', Security: '24/7 CCTV + Guards'
                    };
                    return (
                      <div key={amenity} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {AMENITY_ICONS[amenity] || <Star size={20} />}
                        </div>
                        <h3 className="font-bold text-foreground mb-1">{amenity}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{schedules[amenity] || 'Standard Access'}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
                  <Wifi size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                  <p className="font-semibold text-lg">No Amenity Data Available</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact management for a list of included services.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: ISSUES (Maintenance) */}
          {activeTab === 'issues' && (
            <motion.div key="issues" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springTransition} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
                <div>
                  <h2 className="text-xl font-bold">Service Requests</h2>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Track maintenance and lodge new tickets.</p>
                </div>
                <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-12 px-6 rounded-xl font-bold shadow-md shadow-primary/20">
                      <Plus size={18} className="mr-2" /> Lodge Ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border rounded-3xl">
                    <div className="p-6 bg-secondary/30 border-b border-border">
                      <DialogTitle className="text-xl font-bold">New Service Request</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-1">Our ops team usually responds within 4 hours.</p>
                    </div>
                    <form onSubmit={handleSubmitIssue} className="p-6 space-y-6">
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Classify Issue</Label>
                        <div className="grid grid-cols-4 gap-3">
                          {ISSUE_CATEGORIES.map(cat => (
                            <button
                              key={cat.value} type="button" onClick={() => setIssueForm(f => ({ ...f, category: cat.value }))}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                issueForm.category === cat.value ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:bg-secondary/50 bg-card'
                              }`}
                            >
                              <span className="text-xl">{cat.icon}</span>
                              <span className="text-[10px] font-semibold">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="font-semibold text-foreground">Headline Summary</Label>
                          <Input className="mt-1.5 h-12 rounded-xl bg-card" placeholder="E.g., Water pressure low in bathroom" value={issueForm.title} onChange={e => setIssueForm(f => ({ ...f, title: e.target.value }))} required />
                        </div>
                        <div>
                          <Label className="font-semibold text-foreground">Detailed Description</Label>
                          <Textarea className="mt-1.5 min-h-[100px] rounded-xl bg-card resize-none" placeholder="Provide specifics to help our team resolve it faster..." value={issueForm.description} onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border flex justify-end gap-3">
                        <Button type="button" variant="ghost" className="rounded-xl font-semibold" onClick={() => setIssueOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitIssue.isPending} className="rounded-xl font-bold px-8">
                          {submitIssue.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Submit Ticket'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {issuesLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-primary/50" /></div>
              ) : issues?.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500/30" />
                  <p className="font-semibold text-lg">System Nominal</p>
                  <p className="text-sm text-muted-foreground mt-1">No active service requests for your unit.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {issues?.map((issue) => (
                    <div key={issue.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase border ${ISSUE_STATUS_THEME[issue.status]}`}>
                              {issue.status.replace('_', ' ')}
                            </Badge>
                            {issue.priority === 'urgent' && <Badge className="bg-destructive text-white text-[10px] uppercase font-bold rounded-md">URGENT</Badge>}
                            <span className="text-xs font-mono text-muted-foreground tracking-wider">{format(new Date(issue.created_at), 'dd MMM, HH:mm')}</span>
                          </div>
                          <h3 className="text-lg font-bold text-foreground mb-1">{issue.title}</h3>
                          {issue.description && <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>}
                        </div>
                        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/50 text-2xl border border-border/50">
                          {ISSUE_CATEGORIES.find(c => c.value === issue.category)?.icon || '📝'}
                        </div>
                      </div>
                      
                      {issue.admin_response && (
                        <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl relative">
                          <div className="absolute -left-[5px] top-6 bottom-6 w-[2px] bg-primary rounded-full" />
                          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                            <MessageSquare size={14} /> Management Response
                          </p>
                          <p className="text-sm text-foreground/90 font-medium">{issue.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: RULES */}
          {activeTab === 'rules' && (
            <motion.div key="rules" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springTransition}>
              <h2 className="text-xl font-bold mb-6">Facility Guidelines</h2>
              {rules && rules.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {Object.entries(
                    rules.reduce((acc: Record<string, PgRule[]>, rule) => {
                      (acc[rule.category] = acc[rule.category] || []).push(rule);
                      return acc;
                    }, {})
                  ).map(([category, catRules]) => (
                    <div key={category} className="bg-card border border-border rounded-3xl p-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                        <BookOpen size={16} /> {category}
                      </h3>
                      <ul className="space-y-4">
                        {catRules.map((rule) => (
                          <li key={rule.id} className="flex items-start gap-3">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            <p className="text-sm text-foreground/80 font-medium leading-relaxed">{rule.rule_text}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
                  <Shield size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                  <p className="font-semibold text-lg">No Formal Policies Listed</p>
                  <p className="text-sm text-muted-foreground mt-1">Please consult with management for standard operating procedures.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}