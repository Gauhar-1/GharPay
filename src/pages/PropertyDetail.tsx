import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Shield, MapPin, Bed, Wifi, Coffee, Shirt, ShieldCheck, Sparkles, Users, MessageCircle, Video, CalendarCheck, CreditCard, Clock, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicProperty, useCreateReservation, useConfirmReservation, useSimilarProperties, useCreateVisitRequest, useCreatePaymentIntent, useCreatePaymentTransaction } from '@/hooks/usePublicData';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PropertyChat from '@/components/PropertyChat';
import NearbyLandmarks from '@/components/NearbyLandmarks';

const AMENITY_ICONS: Record<string, any> = {
  WiFi: Wifi, Food: Coffee, Laundry: Shirt, Security: ShieldCheck, Cleaning: Sparkles,
};

type ActionMode = null | 'chat' | 'virtual_tour' | 'schedule_visit' | 'pre_book';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };

export default function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading } = usePublicProperty(propertyId);
  const createReservation = useCreateReservation();
  const confirmReservation = useConfirmReservation();
  const createPaymentIntent = useCreatePaymentIntent();
  const createTransaction = useCreatePaymentTransaction();

  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', moveInDate: '' });
  const [scheduleForm, setScheduleForm] = useState({ name: '', phone: '', date: '', time: '' });
  const [virtualForm, setVirtualForm] = useState({ name: '', phone: '', slot: '' });
  const [reservationResult, setReservationResult] = useState<any>(null);
  const [heroIdx, setHeroIdx] = useState(0);

  const { data: similarProperties } = useSimilarProperties(property?.area, property?.city, propertyId);
  const createVisitRequest = useCreateVisitRequest();

  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Property not found</h2>
          <Button onClick={() => navigate('/explore')}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  const allRooms = property.rooms || [];
  const vacantBeds = allRooms.flatMap((r: any) => (r.beds || []).filter((b: any) => b.status === 'vacant'));
  const totalBeds = allRooms.reduce((s: number, r: any) => s + (r.beds?.length || 0), 0);

  const getSimRent = (p: any) => {
    const rents = (p.rooms || []).map((r: any) => r.rent_per_bed || r.expected_rent).filter(Boolean);
    if (!rents.length) return p.price_range || '—';
    return `₹${Math.min(...rents).toLocaleString()}`;
  };
  const getSimBeds = (p: any) => (p.rooms || []).flatMap((r: any) => (r.beds || []).filter((b: any) => b.status === 'vacant')).length;

  const handlePreBook = async () => {
    if (!selectedBed || !selectedRoom || !customerForm.name || !customerForm.phone) {
      toast.error('Please fill in all required fields and select a bed.');
      return;
    }
    try {
      const result = await createReservation.mutateAsync({
        property_id: property.id,
        bed_id: selectedBed.id,
        room_id: selectedRoom.id,
        customer_name: customerForm.name,
        customer_phone: customerForm.phone,
        customer_email: customerForm.email || undefined,
        move_in_date: customerForm.moveInDate || undefined,
        room_type: selectedRoom.room_type || undefined,
        monthly_rent: selectedRoom.rent_per_bed || selectedRoom.expected_rent || undefined,
      });
      setReservationResult(result);
      toast.success('Bed reserved! Complete payment within 10 minutes.');
    } catch (e: any) {
      toast.error(e.message);
    }
  };


  const handleConfirmPayment = async () => {
    if (!reservationResult?.reservation_id) return;
    try {
      // 1. Call Deno Edge Function to Initialize Order
      const intentData = await createPaymentIntent.mutateAsync(reservationResult.reservation_id);

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: intentData.key, 
        amount: intentData.amount, 
        currency: intentData.currency,
        name: "Gharpayy",
        description: "PG Bed Reservation",
        order_id: intentData.order_id,
        prefill: {
            name: intentData.customer_name,
            email: intentData.customer_email,
            contact: intentData.customer_phone
        },
        theme: { color: "#F97316" }, // Gharpayy accent color (or similar)
        
        handler: async function (response: any) {
          // 3. User paid successfully! Razorpay returns the payload
          toast.success("Payment successful! Finalizing booking...", { duration: 5000 });
          
          try {
             // 4. Log the transaction in our database
             await createTransaction.mutateAsync({
                 reservation_id: reservationResult.reservation_id,
                 amount: intentData.amount / 100, // Storing in INR, not paise
                 gateway_transaction_id: response.razorpay_payment_id,
                 status: 'success'
             });

             // 5. Update Reservation Status & Create Lead/Booking
             await confirmReservation.mutateAsync({
                 reservation_id: reservationResult.reservation_id,
                 payment_reference: response.razorpay_payment_id
             });
             
             toast.success('Booking confirmed! Welcome to Gharpayy!');
             setActionMode(null);
             setReservationResult(null);

          } catch (dbErr: any) {
             toast.error("Payment authorized but booking failed: " + dbErr.message);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
          toast.error("Payment failed. Please try again.");
      });
      rzp.open();

    } catch (e: any) {
      toast.error("Failed to initialize payment: " + e.message);
    }
  };

  const handleScheduleVisit = async () => {
    if (!scheduleForm.name || !scheduleForm.phone || !scheduleForm.date) {
      toast.error('Please provide name, phone, and date.');
      return;
    }
    try {
      await createVisitRequest.mutateAsync({
        property_id: property.id,
        name: scheduleForm.name,
        phone: scheduleForm.phone,
        visit_type: 'physical',
        requested_date: `${scheduleForm.date} ${scheduleForm.time}`.trim(),
      });
      toast.success("Visit request submitted! We'll confirm shortly.");
      setScheduleForm({ name: '', phone: '', date: '', time: '' });
      setActionMode(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleVirtualTour = async () => {
    if (!virtualForm.name || !virtualForm.phone || !virtualForm.slot) {
      toast.error('Please provide name, phone, and preferred slot.');
      return;
    }
    try {
      await createVisitRequest.mutateAsync({
        property_id: property.id,
        name: virtualForm.name,
        phone: virtualForm.phone,
        visit_type: 'virtual',
        requested_date: virtualForm.slot,
      });
      toast.success('Virtual tour booked! Check WhatsApp for the link.');
      setVirtualForm({ name: '', phone: '', slot: '' });
      setActionMode(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const photos = property.photos || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/explore')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back to search
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xs">G</span>
            </div>
            <span className="font-semibold text-sm">Gharpayy</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Gallery */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl overflow-hidden">
            <div className="aspect-[4/3] bg-muted relative cursor-pointer" onClick={() => setHeroIdx((heroIdx + 1) % Math.max(photos.length, 1))}>
              {photos.length > 0 ? (
                <img src={photos[heroIdx % photos.length]} alt={property.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Bed size={64} className="text-muted-foreground/20" /></div>
              )}
              {photos.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-[11px] font-medium">
                  {heroIdx + 1}/{photos.length}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/3] bg-muted rounded-lg overflow-hidden cursor-pointer" onClick={() => photos[i] && setHeroIdx(i)}>
                  {photos[i] ? (
                    <img src={photos[i]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Bed size={24} className="text-muted-foreground/15" /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {(property as any).is_verified && (
                  <Badge variant="secondary" className="text-[11px] gap-1"><Shield size={11} className="text-success" /> Verified by Gharpayy</Badge>
                )}
                {property.gender_allowed && property.gender_allowed !== 'any' && (
                  <Badge variant="secondary" className="text-[11px] capitalize">{property.gender_allowed} only</Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">{property.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin size={14} /> {[property.area, property.city].filter(Boolean).join(', ')}</span>
                {(property as any).rating && (
                  <span className="flex items-center gap-1"><Star size={14} className="fill-accent text-accent" /> {(property as any).rating} ({(property as any).total_reviews || 0} reviews)</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{vacantBeds.length}</p>
                <p className="text-[11px] text-muted-foreground">Beds Available</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{allRooms.length}</p>
                <p className="text-[11px] text-muted-foreground">Rooms</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{totalBeds}</p>
                <p className="text-[11px] text-muted-foreground">Total Beds</p>
              </CardContent></Card>
            </div>

            <Separator />

            {/* Description */}
            {(property as any).description && (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-3">About this property</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{(property as any).description}</p>
                </div>
                <Separator />
              </>
            )}

            {/* Amenities */}
            {property.amenities?.length > 0 && (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-4">What this place offers</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {property.amenities.map((amenity: string) => {
                      const Icon = AMENITY_ICONS[amenity] || Check;
                      return (
                        <div key={amenity} className="flex items-center gap-3 py-2">
                          <Icon size={18} className="text-muted-foreground" />
                          <span className="text-sm">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Rooms */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Available rooms</h2>
              <div className="space-y-3">
                {allRooms.map((room: any) => {
                  const roomVacant = (room.beds || []).filter((b: any) => b.status === 'vacant').length;
                  const rent = room.rent_per_bed || room.expected_rent;
                  return (
                    <Card key={room.id} className={`transition-all ${selectedRoom?.id === room.id ? 'ring-2 ring-accent' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">Room {room.room_number}</h3>
                            {room.room_type && <Badge variant="secondary" className="text-[11px] capitalize">{room.room_type}</Badge>}
                            {room.floor && <span className="text-[10px] text-muted-foreground">Floor {room.floor}</span>}
                          </div>
                          <Badge variant={roomVacant > 0 ? 'default' : 'secondary'} className="text-[11px]">
                            {roomVacant} / {room.bed_count} beds free
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-xl font-semibold">{rent ? `₹${rent.toLocaleString()}` : '—'}</span>
                          <span className="text-[11px] text-muted-foreground">/bed/month</span>
                        </div>
                        {room.furnishing && <p className="text-[11px] text-muted-foreground mb-2">{room.furnishing} · {room.bathroom_type || 'Shared'} bathroom</p>}
                        {roomVacant > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {(room.beds || []).filter((b: any) => b.status === 'vacant').map((bed: any) => (
                              <button
                                key={bed.id}
                                onClick={() => { setSelectedRoom(room); setSelectedBed(bed); }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  selectedBed?.id === bed.id
                                    ? 'bg-accent text-accent-foreground border-accent'
                                    : 'bg-secondary text-secondary-foreground border-border hover:border-muted-foreground/30'
                                }`}
                              >
                                <Bed size={12} className="inline mr-1" />{bed.bed_number}
                              </button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Nearby Landmarks */}
            <NearbyLandmarks latitude={(property as any).latitude} longitude={(property as any).longitude} city={property.city || undefined} />

            {/* Confidence Signals */}
            <div className="rounded-xl bg-secondary/50 p-5 flex flex-wrap gap-6">
              {(property as any).is_verified && <div className="flex items-center gap-2 text-sm"><Shield size={16} className="text-success" /> Verified by Gharpayy</div>}
              <div className="flex items-center gap-2 text-sm"><Clock size={16} className="text-muted-foreground" /> Updated recently</div>
              <div className="flex items-center gap-2 text-sm"><Users size={16} className="text-muted-foreground" /> {vacantBeds.length} beds remaining</div>
            </div>

            {/* Similar Properties */}
            {similarProperties && similarProperties.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold mb-4">Similar properties nearby</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {similarProperties.slice(0, 3).map((sp: any) => (
                      <div
                        key={sp.id}
                        className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-sm hover:border-muted-foreground/20 transition-all"
                        onClick={() => navigate(`/property/${sp.id}`)}
                      >
                        <div className="aspect-[4/3] bg-muted overflow-hidden">
                          {sp.photos?.[0] ? (
                            <img src={sp.photos[0]} alt={sp.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Bed size={24} className="text-muted-foreground/20" /></div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-base text-foreground line-clamp-1 mb-1">{sp.name}</h3>
                          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5"><MapPin size={12} /> {sp.area}</p>
                          <div className="flex-1" />

                          {sp.rooms && sp.rooms.length > 0 && (
                            <div className="mb-3 space-y-1.5">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Available Rooms</p>
                              <div className="flex flex-col gap-1">
                                {sp.rooms.slice(0, 2).map((room: any) => {
                                  const availableBeds = (room.beds || []).filter((b: any) => b.status === "vacant").length;
                                  return (
                                    <div key={room.id} className="flex items-center justify-between text-[11px] bg-muted/40 rounded-lg p-1.5 border border-border/40">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-foreground">{room.room_type || 'Private'}</span>
                                        {availableBeds > 0 ? (
                                          <span className="text-[9px] text-success font-medium">{availableBeds} beds left</span>
                                        ) : (
                                          <span className="text-[9px] text-destructive font-medium">Sold out</span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <span className="font-bold text-foreground">₹{(room.rent_per_bed || room.expected_rent || 0).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {sp.rooms.length > 2 && (
                                  <div className="text-[9px] text-center text-muted-foreground py-0.5 font-medium bg-muted/20 rounded-lg border border-border/20 mt-0.5">
                                    + {sp.rooms.length - 2} more options
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-baseline justify-between pt-3 border-t border-border/50">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Starts at </span>
                              <span className="text-base font-bold text-foreground">{getSimRent(sp)}</span>
                            </div>
                            <span className="text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-md">{getSimBeds(sp)} beds left</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <Card className="shadow-md">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-base mb-1">Interested in this PG?</h3>
                  <p className="text-[11px] text-muted-foreground mb-4">Choose how you'd like to proceed</p>

                  <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setChatOpen(true)}>
                    <MessageCircle size={18} className="text-info" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Chat with Gharpayy</p>
                      <p className="text-[11px] text-muted-foreground">Get instant answers</p>
                    </div>
                  </Button>

                  <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setActionMode('virtual_tour')}>
                    <Video size={18} className="text-accent" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Book a Virtual Tour</p>
                      <p className="text-[11px] text-muted-foreground">See it from home</p>
                    </div>
                  </Button>

                  <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => setActionMode('schedule_visit')}>
                    <CalendarCheck size={18} className="text-success" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Schedule a Visit</p>
                      <p className="text-[11px] text-muted-foreground">Visit in person</p>
                    </div>
                  </Button>

                  <Separator />

                  <Button className="w-full h-12 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setActionMode('pre_book')}>
                    <CreditCard size={18} />
                    Pre-Book Now — ₹1,000
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">Reserve a bed instantly. Fully refundable within 24h.</p>
                </CardContent>
              </Card>

              {/* Nearby areas */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Explore nearby areas</h4>
                <div className="flex flex-wrap gap-2">
                  {['Bellandur', 'Brookefield', 'Whitefield', 'Marathahalli', 'Sarjapur Road', 'HSR Layout'].map(area => (
                    <Badge key={area} variant="secondary" className="cursor-pointer text-[11px]" onClick={() => navigate(`/explore?area=${area}`)}>
                      {area} <ChevronRight size={10} className="ml-0.5" />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <PropertyChat propertyName={property.name} isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Pre-Book Dialog */}
      <Dialog open={actionMode === 'pre_book'} onOpenChange={(o) => { if (!o) { setActionMode(null); setReservationResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{reservationResult ? 'Complete Payment' : 'Pre-Book a Bed'}</DialogTitle>
          </DialogHeader>
          {!reservationResult ? (
            <div className="space-y-4">
              {selectedBed ? (
                <div className="p-3 rounded-lg bg-secondary text-sm">
                  <strong>{property.name}</strong> · Room {selectedRoom?.room_number} · Bed {selectedBed.bed_number}
                  <br /><span className="text-muted-foreground">₹{(selectedRoom?.rent_per_bed || selectedRoom?.expected_rent || 0).toLocaleString()}/month</span>
                </div>
              ) : (
                <p className="text-sm text-destructive">Please select a bed from the rooms section first.</p>
              )}
              <div className="space-y-3">
                <div><Label>Full Name *</Label><Input value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Phone *</Label><Input value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Move-in Date</Label><Input type="date" value={customerForm.moveInDate} onChange={e => setCustomerForm(f => ({ ...f, moveInDate: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button onClick={handlePreBook} disabled={!selectedBed || !customerForm.name || !customerForm.phone || createReservation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {createReservation.isPending ? 'Reserving...' : 'Reserve Bed — ₹1,000'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                <Check size={32} className="mx-auto text-success mb-2" />
                <p className="font-medium text-sm">Bed Reserved!</p>
                <p className="text-[11px] text-muted-foreground mt-1">Complete payment within 10 minutes to confirm.</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">₹1,000</p>
                <p className="text-[11px] text-muted-foreground">Reservation Fee (adjusted against first month rent)</p>
              </div>
              <DialogFooter>
                <Button onClick={handleConfirmPayment} disabled={confirmReservation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {confirmReservation.isPending ? 'Processing...' : 'Simulate Payment ₹1,000'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Visit Dialog */}
      <Dialog open={actionMode === 'schedule_visit'} onOpenChange={(o) => !o && setActionMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule a Visit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Your Name *</Label><Input placeholder="Full name" value={scheduleForm.name} onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Phone *</Label><Input placeholder="+91..." value={scheduleForm.phone} onChange={e => setScheduleForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Preferred Date *</Label><Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Preferred Time</Label>
              <Select value={scheduleForm.time} onValueChange={v => setScheduleForm(f => ({ ...f, time: v }))}>
                <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
                <SelectContent>
                  {['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={createVisitRequest.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleScheduleVisit}>
              {createVisitRequest.isPending ? 'Submitting...' : 'Request Visit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Virtual Tour Dialog */}
      <Dialog open={actionMode === 'virtual_tour'} onOpenChange={(o) => !o && setActionMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Book a Virtual Tour</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">See the property from the comfort of your home. A Gharpayy agent will give you a live video walkthrough.</p>
            <div><Label>Your Name *</Label><Input placeholder="Full name" value={virtualForm.name} onChange={e => setVirtualForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Phone / WhatsApp *</Label><Input placeholder="+91..." value={virtualForm.phone} onChange={e => setVirtualForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Preferred Slot *</Label>
              <Select value={virtualForm.slot} onValueChange={v => setVirtualForm(f => ({ ...f, slot: v }))}>
                <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today_now">Today - As soon as possible</SelectItem>
                  <SelectItem value="today_eve">Today - Evening (5-7 PM)</SelectItem>
                  <SelectItem value="tomorrow_morn">Tomorrow - Morning (10-12 PM)</SelectItem>
                  <SelectItem value="tomorrow_eve">Tomorrow - Evening (5-7 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button disabled={createVisitRequest.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleVirtualTour}>
              {createVisitRequest.isPending ? 'Booking...' : 'Book Virtual Tour'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
