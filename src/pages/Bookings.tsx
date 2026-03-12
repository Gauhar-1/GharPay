import AppLayout from '@/components/AppLayout';
import { useBookings, useUpdateBooking, useBookingStats } from '@/hooks/useBookings';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, CheckCircle, Clock, IndianRupee, XCircle, TrendingUp, AlertTriangle, Building2, User, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };

const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: springTransition } };

const STATUS_THEME: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  confirmed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  checked_in: 'bg-info/10 text-info border-info/20',
  checked_out: 'bg-secondary text-muted-foreground border-border/50',
};

const PAYMENT_THEME: Record<string, string> = {
  unpaid: 'text-destructive',
  partial: 'text-warning',
  paid: 'text-success',
};

const NEXT_STATUS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
};

const Bookings = () => {
  const { data: bookings, isLoading } = useBookings();
  const { data: stats } = useBookingStats();
  const updateBooking = useUpdateBooking();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [cancelId, setCancelId] = useState<string | null>(null);

  const filtered = bookings?.filter(b => filterStatus === 'all' || (b as any).booking_status === filterStatus) || [];

  const handleStatusChange = async (id: string, status: string) => {
    if (status === 'cancelled') { setCancelId(id); return; }
    try {
      await updateBooking.mutateAsync({ id, booking_status: status });
      toast.success(`Booking ${status.replace('_', ' ')}`);
    } catch(e:any) { toast.error(e.message); }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    try {
      await updateBooking.mutateAsync({ id: cancelId, booking_status: 'cancelled' });
      setCancelId(null);
      toast.success('Booking cancelled and inventory released');
    } catch(e:any) { toast.error(e.message); }
  };

  const handlePaymentChange = async (id: string, status: string) => {
    try {
      await updateBooking.mutateAsync({ id, payment_status: status });
      toast.success('Payment ledger updated');
    } catch(e:any) { toast.error(e.message); }
  };

  if (isLoading) {
    return (
      <AppLayout title="Ledger" subtitle="Loading financial data...">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[500px] rounded-[2rem]" />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Ledger & Tenancy" subtitle="Manage active bookings and track revenue">
      
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-success/5 blur-[120px] mix-blend-screen" />
      </div>

      {/* Executive Financial KPIs */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><Receipt size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Total Volumes</span></div>
          <p className="text-3xl font-extrabold text-foreground">{stats?.total ?? 0}</p>
        </motion.div>
        
        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-warning/10 rounded-full blur-xl" />
          <div className="flex items-center gap-2 text-warning mb-2 relative z-10"><Clock size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Awaiting</span></div>
          <p className="text-3xl font-extrabold text-foreground relative z-10">{stats?.pending ?? 0}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card/40 backdrop-blur-xl border border-border/50 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-success/10 rounded-full blur-xl" />
          <div className="flex items-center gap-2 text-success mb-2 relative z-10"><CheckCircle size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Secured</span></div>
          <p className="text-3xl font-extrabold text-foreground relative z-10">{stats?.confirmed ?? 0}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-gradient-to-br from-success/10 to-success/5 backdrop-blur-xl border border-success/20 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-success"><IndianRupee size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Realized Revenue</span></div>
            <div className="flex items-center gap-2 text-warning"><TrendingUp size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">+₹{((stats?.pendingRevenue ?? 0) / 1000).toFixed(1)}k Pipeline</span></div>
          </div>
          <p className="text-4xl font-black text-foreground tracking-tight">₹{((stats?.revenue ?? 0) / 1000).toFixed(1)}<span className="text-xl text-muted-foreground ml-1">k</span></p>
        </motion.div>
      </motion.div>

      {/* Control Strip */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md border border-border/50 p-1.5 rounded-2xl shadow-sm">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] h-10 bg-background/50 border-none rounded-xl font-bold text-xs focus:ring-accent/20">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50 shadow-xl">
              <SelectItem value="all" className="font-bold text-xs py-2">All Tenancies</SelectItem>
              <SelectItem value="pending" className="font-bold text-xs py-2 text-warning focus:text-warning">Pending Review</SelectItem>
              <SelectItem value="confirmed" className="font-bold text-xs py-2 text-success focus:text-success">Confirmed Booking</SelectItem>
              <SelectItem value="checked_in" className="font-bold text-xs py-2 text-info focus:text-info">Checked In</SelectItem>
              <SelectItem value="cancelled" className="font-bold text-xs py-2 text-destructive focus:text-destructive">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="bg-background/50 backdrop-blur-md h-10 px-4 rounded-xl border-border/50 shadow-sm text-xs font-bold">
          {filtered.length} Record{filtered.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* The Ledger (Table) */}
      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border/50 bg-background/40">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tenant / Lead</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inventory Details</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Move-in Date</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financials</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lifecycle</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((booking: any) => {
                  const nextStatuses = NEXT_STATUS[booking.booking_status] || [];
                  return (
                    <motion.tr
                      key={booking.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={springTransition}
                      className="border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-background transition-colors border border-border/50">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-foreground">{booking.leads?.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{booking.leads?.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-xs text-foreground flex items-center gap-1.5"><Building2 size={12} className="text-muted-foreground"/> {booking.properties?.name || 'Unassigned'}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-1">
                          Room {booking.rooms?.room_number || '—'} {booking.beds?.bed_number ? ` • Bed ${booking.beds.bed_number}` : ''}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-xs font-bold text-foreground">
                          {booking.move_in_date ? format(new Date(booking.move_in_date), 'MMM do, yyyy') : 'TBD'}
                        </p>
                      </td>

                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <p className="font-black text-sm text-foreground mb-1">
                          {booking.monthly_rent ? `₹${Number(booking.monthly_rent).toLocaleString()}` : '—'} <span className="text-[10px] font-medium text-muted-foreground">/mo</span>
                        </p>
                        <div className="relative inline-flex items-center">
                          <select
                            value={booking.payment_status}
                            onChange={e => handlePaymentChange(booking.id, e.target.value)}
                            className={`appearance-none font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 pr-6 rounded bg-background border border-border/50 cursor-pointer outline-none focus:ring-1 focus:ring-accent/30 transition-all ${PAYMENT_THEME[booking.payment_status]}`}
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 pointer-events-none opacity-50" />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <Badge className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border shadow-sm ${STATUS_THEME[booking.booking_status]}`}>
                          {booking.booking_status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        {nextStatuses.length > 0 ? (
                          <div className="flex justify-end gap-2">
                            {nextStatuses.map(s => (
                              <Button
                                key={s}
                                variant={s === 'cancelled' ? 'outline' : 'default'}
                                size="sm"
                                className={`h-8 rounded-xl px-3 font-bold text-xs shadow-sm ${
                                  s === 'cancelled' 
                                    ? 'border-destructive/30 text-destructive hover:bg-destructive hover:text-white' 
                                    : 'bg-accent hover:bg-accent/90 text-accent-foreground active:scale-95'
                                }`}
                                onClick={() => handleStatusChange(booking.id, s)}
                                disabled={updateBooking.isPending}
                              >
                                {s === 'cancelled' ? <XCircle size={14} className="mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />}
                                {s.replace('_', ' ')}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest pr-4 opacity-50">
                            Locked
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <Receipt size={32} className="mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-lg font-bold text-foreground">No records found</p>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Adjust your filters to see historical data.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* High-Impact Cancel Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent className="rounded-[2rem] bg-card/95 backdrop-blur-3xl border-destructive/20 shadow-2xl p-0 overflow-hidden sm:max-w-[400px]">
          <div className="p-8 bg-destructive/10 border-b border-destructive/10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-destructive">Terminate Booking?</AlertDialogTitle>
          </div>
          <div className="p-8 pb-10 text-center">
            <AlertDialogDescription className="text-base font-medium text-foreground mb-8">
              This action will permanently cancel the tenancy, delete the ledger entry, and release the locked bed back to the public inventory.
            </AlertDialogDescription>
            <div className="flex flex-col gap-3">
              <AlertDialogAction onClick={confirmCancel} className="h-14 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-black text-base shadow-xl shadow-destructive/20">
                Yes, Terminate Protocol
              </AlertDialogAction>
              <AlertDialogCancel className="h-14 rounded-2xl border-border/50 font-bold text-base hover:bg-secondary">
                Keep Active
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
};

export default Bookings;