import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, Star, Bed, Shield, X, Map as MapIcon, LayoutGrid, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicProperties, useAvailableCities, useAvailableAreas, useLandmarks, type PropertyFilters } from '@/hooks/usePublicData';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence, Transition } from 'framer-motion';

const PropertyMap = lazy(() => import('@/components/PropertyMap'));

const SHARING_TYPES = ['Private', '2 Sharing', '3 Sharing', '4 Sharing'];
const GENDER_OPTIONS = [
  { value: 'any', label: 'Any Gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
const AREA_TAGS = ['Marathahalli', 'Whitefield', 'Koramangala', 'BTM Layout', 'HSR Layout', 'Electronic City', 'Bellandur', 'Indiranagar', 'Sarjapur Road', 'JP Nagar'];

const springTransition: Transition = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] as any };

// HELPER FUNCTIONS (Moved outside to prevent unnecessary re-renders)
const getAvailableBeds = (property: any) => {
  if (!property.rooms) return 0;
  return property.rooms.reduce((sum: number, room: any) => {
    if (!room.beds) return sum;
    return sum + room.beds.filter((b: any) => b.status === 'vacant').length;
  }, 0);
};

const getRentRange = (property: any) => {
  if (!property.rooms?.length) return property.price_range || '—';
  const rents = property.rooms.map((r: any) => r.rent_per_bed || r.expected_rent).filter(Boolean);
  if (!rents.length) return '—';
  const min = Math.min(...rents);
  const max = Math.max(...rents);
  return min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()}–${max.toLocaleString()}`;
};

const getAvailabilityColor = (beds: number) => {
  if (beds === 0) return 'bg-destructive/10 text-destructive';
  if (beds <= 3) return 'bg-warning/10 text-warning';
  return 'bg-success/10 text-success';
};

// COMPONENT EXTRACTED: Prevents React from unmounting/remounting on every render
const PropertyCard = ({ property, i, onClick }: { property: any; i: number, onClick: () => void }) => {
  const beds = getAvailableBeds(property);
  const rentRange = getRentRange(property);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, ...springTransition }}
      className="group cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="h-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-1 hover:border-accent/30 flex flex-col">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden shrink-0">
          {property.photos?.length > 0 ? (
            <img src={property.photos[0]} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/50"><Bed size={40} className="text-muted-foreground/30" /></div>
          )}
          <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${getAvailabilityColor(beds)}`}>
            {beds === 0 ? 'Full' : `${beds} beds left`}
          </div>
          {property.is_verified && (
            <div className="absolute top-3 right-3 px-2 py-1.5 rounded-full bg-background/90 backdrop-blur-sm text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Shield size={12} className="text-success" /> Verified
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-base text-foreground line-clamp-1">{property.name}</h3>
            {property.rating && (
              <div className="flex items-center gap-1 shrink-0 bg-accent/10 px-2 py-1 rounded-lg">
                <Star size={12} className="fill-accent text-accent" />
                <span className="text-xs font-bold text-accent-foreground">{property.rating}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5"><MapPin size={12} /> {[property.area, property.city].filter(Boolean).join(', ')}</p>
          
          <div className="flex-1" />

          {property.rooms && property.rooms.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Available Rooms</p>
              <div className="flex flex-col gap-1.5">
                {property.rooms.slice(0, 3).map((room: any) => {
                  const availableBeds = (room.beds || []).filter((b: any) => b.status === "vacant").length;
                  return (
                    <div key={room.id} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg p-2 border border-border/30">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{room.room_type || 'Private'}</span>
                        {availableBeds > 0 ? (
                           <span className="text-[10px] text-success font-medium">{availableBeds} beds left</span>
                        ) : (
                           <span className="text-[10px] text-destructive font-medium">Sold out</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">₹{(room.rent_per_bed || room.expected_rent || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">/mo</span>
                      </div>
                    </div>
                  );
                })}
                {property.rooms.length > 3 && (
                   <div className="text-[10px] text-center text-muted-foreground py-1 font-medium bg-muted/20 rounded-lg border border-border/20">
                     + {property.rooms.length - 3} more options
                   </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-baseline justify-between pt-4 border-t border-border/50 mt-2">
            <div>
              <span className="text-xs text-muted-foreground">Starts at </span>
              <span className="text-lg font-bold text-foreground">{rentRange}</span>
            </div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">/month</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Brought in Auth context
  const [searchParams] = useSearchParams();
  const initialArea = searchParams.get('area') || '';

  const [filters, setFilters] = useState<PropertyFilters>({ city: 'Bangalore', area: initialArea || undefined });
  const [searchQuery, setSearchQuery] = useState(initialArea);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSharing, setSelectedSharing] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'split'>('grid');

  const { data: cities } = useAvailableCities();
  const { data: areas } = useAvailableAreas(filters.city);
  const { data: properties, isLoading } = usePublicProperties({ ...filters, sharingTypes: selectedSharing.length ? selectedSharing : undefined });
  const { data: landmarks } = useLandmarks(filters.city);

  const mapProperties = useMemo(() =>
    (properties || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      latitude: p.latitude,
      longitude: p.longitude,
      photos: p.photos,
      rating: p.rating,
      vacantBeds: getAvailableBeds(p),
      rentRange: getRentRange(p),
    })),
    [properties]
  );

  const techParks = landmarks?.filter(l => l.type === 'tech_park') || [];

  return (
    <div className="min-h-screen bg-background relative selection:bg-accent/20 selection:text-accent-foreground">
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[500px] bg-accent/5 blur-[120px] rounded-full" />
      </div>

      {/* Header - Glassmorphic */}
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform duration-300">
                <span className="text-accent-foreground font-bold text-xs">G</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-foreground">Gharpayy</span>
            </button>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <button className="text-foreground transition-colors">Explore PGs</button>
              <button onClick={() => navigate('/owner-portal')} className="hover:text-foreground transition-colors">For Owners</button>
            </div>
            {user ? (
              <Button size="sm" className="font-medium rounded-xl" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <Button variant="outline" size="sm" className="font-medium rounded-xl border-border/50" onClick={() => navigate('/auth')}>Login</Button>
            )}
          </div>
        </div>
      </header>

      {/* Search Section - Elevated */}
      <section className="border-b border-border/50 bg-background/40 backdrop-blur-md relative z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={springTransition}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by area, tech park, or property name..."
                className="pl-11 h-12 text-sm rounded-xl bg-card/50 border-border/50 shadow-sm focus-visible:ring-1 focus-visible:ring-accent/50"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFilters(f => ({ ...f, area: e.target.value || undefined }));
                }}
              />
            </div>
            <Select value={filters.city || ''} onValueChange={(v) => setFilters(f => ({ ...f, city: v }))}>
              <SelectTrigger className="w-full sm:w-48 h-12 rounded-xl bg-card/50 border-border/50 shadow-sm">
                <MapPin size={16} className="mr-2 text-muted-foreground" />
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                {(cities || ['Bangalore']).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className={`h-12 gap-2 rounded-xl transition-all ${showFilters ? 'bg-secondary border-accent/30 text-accent' : 'bg-card/50 border-border/50 shadow-sm'}`} onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} />
              Filters
              {showFilters && <X size={14} />}
            </Button>
            
            {/* View Toggles */}
            <div className="hidden sm:flex items-center bg-card/50 border border-border/50 rounded-xl p-1 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <LayoutGrid size={18} />
              </button>
              <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <MapIcon size={18} />
              </button>
              <button onClick={() => setViewMode('split')} className={`p-2 rounded-lg transition-all ${viewMode === 'split' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <div className="flex gap-0.5 items-center justify-center">
                  <div className="w-2 h-4 bg-current rounded-sm opacity-60" />
                  <div className="w-2.5 h-4 bg-current rounded-sm" />
                </div>
              </button>
            </div>
          </motion.div>

          {/* Filters dropdown panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden"
              >
                <div className="mt-4 p-5 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 shadow-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gender</label>
                      <Select value={filters.gender || 'any'} onValueChange={(v) => setFilters(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="rounded-xl bg-background/50"><SelectValue placeholder="Gender" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {GENDER_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Area</label>
                      <Select onValueChange={(v) => setFilters(f => ({ ...f, area: v }))}>
                        <SelectTrigger className="rounded-xl bg-background/50"><SelectValue placeholder="Area" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {(areas || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max Budget</label>
                      <Input type="number" placeholder="₹" className="h-10 rounded-xl bg-background/50" onChange={(e) => setFilters(f => ({ ...f, budgetMax: Number(e.target.value) || undefined }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Move-in Date</label>
                      <Input type="date" className="h-10 rounded-xl bg-background/50 text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-5 mt-2 border-t border-border/50 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">Room Type:</span>
                    {SHARING_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedSharing(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selectedSharing.includes(type) 
                          ? 'bg-accent text-accent-foreground border-accent shadow-md shadow-accent/20' 
                          : 'bg-background/50 text-foreground border-border/50 hover:border-accent/30'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Tag Pills */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar relative z-30">
        {AREA_TAGS.map(area => (
          <button
            key={area}
            onClick={() => {
              setFilters(f => ({ ...f, area: f.area === area ? undefined : area }));
              setSearchQuery(filters.area === area ? '' : area);
            }}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
              filters.area === area 
              ? 'bg-foreground text-background border-foreground shadow-md' 
              : 'bg-card/40 backdrop-blur-sm text-muted-foreground border-border/50 hover:bg-secondary/80 hover:text-foreground'
            }`}
          >
            <MapPin size={12} /> {area}
          </button>
        ))}
        {techParks.length > 0 && (
          <>
            <div className="w-px bg-border/50 shrink-0 mx-2" />
            {techParks.slice(0, 4).map(tp => (
              <button
                key={tp.id}
                onClick={() => {
                  setSearchQuery(tp.area || tp.name);
                  setFilters(f => ({ ...f, area: tp.area || undefined }));
                }}
                className="flex items-center gap-1.5 whitespace-nowrap shrink-0 text-xs px-3 py-1.5 rounded-full border border-border/50 bg-info/5 text-info hover:bg-info/10 hover:border-info/30 transition-all"
              >
                <Building2 size={12} /> {tp.name}
              </button>
            ))}
          </>
        )}
      </section>

      {/* Main Content Area */}
      <motion.section 
        className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-20 pt-4 relative z-20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {isLoading ? (
              <span className="animate-pulse">Searching premium properties...</span>
            ) : (
              <>
                <span className="text-foreground font-bold">{properties?.length || 0}</span> properties found
                {filters.city && ` in ${filters.city}`}
                {filters.area && <span className="text-accent bg-accent/10 px-2 py-0.5 rounded-md">in {filters.area}</span>}
              </>
            )}
          </p>
        </div>

        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties?.map((property: any, i: number) => (
              <PropertyCard key={property.id} property={property} i={i} onClick={() => navigate(`/property/${property.id}`)} />
            ))}
          </div>
        )}

        {viewMode === 'map' && (
          <div className="rounded-2xl overflow-hidden border border-border/50 shadow-xl shadow-black/5 bg-card/40 backdrop-blur-sm" style={{ height: 'calc(100vh - 240px)' }}>
            <Suspense fallback={<div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>Loading map...</div>}>
              <PropertyMap properties={mapProperties} onPropertyClick={(id) => navigate(`/property/${id}`)} />
            </Suspense>
          </div>
        )}

        {viewMode === 'split' && (
          <div className="flex flex-col lg:flex-row gap-6" style={{ height: 'calc(100vh - 240px)' }}>
            <div className="w-full lg:w-[45%] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {properties?.map((property: any, i: number) => (
                <div key={property.id} className="h-44"> {/* Fixed height for split list view cards */}
                   <PropertyCard property={property} i={i} onClick={() => navigate(`/property/${property.id}`)} />
                </div>
              ))}
            </div>
            <div className="hidden lg:block w-[55%] rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card/40 backdrop-blur-sm sticky top-0">
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading map...</div>}>
                <PropertyMap properties={mapProperties} onPropertyClick={(id) => navigate(`/property/${id}`)} />
              </Suspense>
            </div>
          </div>
        )}

        {properties?.length === 0 && !isLoading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-32 bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl mt-8">
            <div className="w-20 h-20 bg-secondary/80 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bed size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No properties found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">Try adjusting your filters, budget, or search in a different neighborhood.</p>
            <Button variant="outline" className="mt-6 rounded-xl border-border/50" onClick={() => {setSearchQuery(''); setFilters({city: 'Bangalore'})}}>Clear all filters</Button>
          </motion.div>
        )}

        {/* PGs near tech parks */}
        {techParks.length > 0 && !filters.area && (
          <div className="mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8 flex items-center gap-2">
              <Building2 className="text-info" /> Popular Tech Hubs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {techParks.slice(0, 6).map((tp, i) => (
                <motion.button
                  key={tp.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, ...springTransition }}
                  onClick={() => {
                    setSearchQuery(tp.area || tp.name);
                    setFilters(f => ({ ...f, area: tp.area || undefined }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group flex items-center gap-5 p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/80 hover:border-info/30 hover:shadow-xl hover:shadow-info/5 hover:-translate-y-1 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Building2 size={20} className="text-info" />
                  </div>
                  <div>
                    <p className="font-bold text-base text-foreground mb-1">{tp.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{tp.area || tp.city} · Browse PGs nearby</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}