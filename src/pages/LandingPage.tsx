import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Shield, ArrowRight, Building2, ChevronRight, Sparkles, Home as HomeIcon, Map, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePublicProperties } from '@/hooks/usePublicData';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- UNDERSTANDABLE B2C DATA SETS ---
const CITIES = [
  { name: 'Bangalore', tagline: '300+ Verified PGs', active: true, img: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=800&auto=format&fit=crop' },
  { name: 'Hyderabad', tagline: 'Launching Soon', active: false, img: 'https://images.unsplash.com/photo-1587474260580-58955f9a65f1?q=80&w=800&auto=format&fit=crop' },
  { name: 'Pune', tagline: 'Waitlist Open', active: false, img: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Delhi NCR', tagline: 'Planning Phase', active: false, img: 'https://images.unsplash.com/photo-1587474260580-58955f9a65f1?q=80&w=800&auto=format&fit=crop' },
];

const POPULAR_AREAS = ['Marathahalli', 'Whitefield', 'Koramangala', 'HSR Layout', 'Bellandur'];

const TRUST_BRANDS = ['Tech Park Employees', 'Startup Founders', 'University Students', 'Freelancers', 'Consultants', 'Designers', 'Engineers'];

const TESTIMONIALS = [
  { name: "Rahul S.", role: "Software Engineer", auth: "VERIFIED", text: "Moved to Bangalore and found a place in 2 hours. Zero broker harassment. The virtual tour was exactly what I got when I moved in." },
  { name: "Priya D.", role: "Design Lead", auth: "VERIFIED", text: "Finally, a platform that actually verifies the properties. The security, fast WiFi, and hygiene standards are top-notch." },
  { name: "Amit K.", role: "Student", auth: "VERIFIED", text: "The app is so smooth. Paid my deposit online, got my room allocated instantly. Highly recommend Gharpayy to anyone moving cities." },
  { name: "Sarah M.", role: "Financial Analyst", auth: "VERIFIED", text: "I was worried about hidden fees, but Gharpayy is 100% transparent. What you see on the listing is exactly what you pay." },
  { name: "Vikram V.", role: "Marketing Manager", auth: "VERIFIED", text: "The premium co-living spaces feel like boutique hotels. Great community, amazing food, and zero maintenance headaches." },
  { name: "Neha R.", role: "Operations Lead", auth: "VERIFIED", text: "Bypassing the traditional broker system saved me thousands. The digital agreement process took less than 5 minutes." }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const { data: featured } = usePublicProperties({ city: 'Bangalore', limit: 6 });
  
  const mainRef = useRef<HTMLDivElement>(null);

  // Admin Check
  const isAdmin = user?.email === 'admin@gharpayy.com' || user?.user_metadata?.role === 'admin';

  // Scroll detection for Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Entrance - Fixed visibility issue using fromTo
      gsap.fromTo('.hero-element', 
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 0.1 }
      );

      // Trust Marquee
      gsap.to('.trust-track', {
        xPercent: -50,
        ease: 'none',
        duration: 25,
        repeat: -1,
      });

      // Scroll Fade-Ups
      gsap.utils.toArray('.gsap-fade-up').forEach((el: any) => {
        gsap.fromTo(el, 
          { y: 50, opacity: 0 },
          { scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }, y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
      });

      // Staggered Cards (Assets, Steps)
      gsap.utils.toArray('.gsap-stagger-grid').forEach((grid: any) => {
        const items = grid.querySelectorAll('.gsap-stagger-item');
        gsap.fromTo(items, 
          { y: 40, opacity: 0 },
          { scrollTrigger: { trigger: grid, start: 'top 80%' }, y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
        );
      });
    }, mainRef);

    return () => ctx.revert();
  }, [featured]);

  // Testimonial Carousel Auto-Play
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getAvailableBeds = (property: any) => {
    if (!property.rooms) return 0;
    return property.rooms.reduce((sum: number, room: any) => sum + (room.beds?.filter((b: any) => b.status === 'vacant').length || 0), 0);
  };

  const getRentRange = (property: any) => {
    if (!property.rooms?.length) return property.price_range || '—';
    const rents = property.rooms.map((r: any) => r.rent_per_bed || r.expected_rent).filter(Boolean);
    return rents.length ? `₹${Math.min(...rents).toLocaleString()}` : property.price_range || '—';
  };

  const handleSearch = () => {
    if(searchQuery.trim()) navigate(`/explore?area=${searchQuery}`);
  };

  return (
    <div ref={mainRef} className="min-h-screen bg-[#0A0A0C] text-[#E5E5E5] relative selection:bg-[#D4AF37]/30 selection:text-white font-sans overflow-hidden">
      
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[#D4AF37]/5 blur-[120px] mix-blend-screen" />
      </div>

      {/* Navigation */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/10 shadow-xl py-3' : 'bg-transparent py-6 border-b border-transparent'}`}>
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 border border-[#D4AF37] flex items-center justify-center bg-[#D4AF37]/5 transition-transform">
              <span className="text-[#D4AF37] font-serif font-black text-xl italic">G</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl tracking-tight font-bold text-white leading-none">Gharpayy</span>
              <span className="text-[7px] tracking-[0.4em] text-[#D4AF37] font-black uppercase mt-1.5">Premium Living</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 bg-[#121215] border border-white/10 px-8 py-3">
            {['Explore PGs', 'How it Works', 'List Property'].map((item) => (
              <button key={item} onClick={() => navigate(item === 'List Property' ? '/owner-portal' : '/explore')} className="text-[10px] font-mono uppercase tracking-widest text-white/50 hover:text-[#D4AF37] transition-colors">
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              isAdmin ? (
                <Button variant="ghost" className="hidden sm:flex rounded-none font-mono text-[10px] tracking-widest uppercase hover:bg-white/5 text-white border border-transparent hover:border-white/10" onClick={() => navigate('/dashboard')}>
                  Admin Dashboard
                </Button>
              ) : (
                ""
              )
            ) : (
              <Button variant="ghost" className="hidden sm:flex rounded-none font-mono text-[10px] tracking-widest uppercase hover:bg-white/5 text-white border border-transparent hover:border-white/10" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
            <Button className="rounded-none px-8 h-10 bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-widest text-[10px] transition-colors" onClick={() => navigate('/explore')}>
              Find a Home
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        
        {/* CLEARER HERO SECTION */}
        <section className="pt-40 pb-20 lg:pt-52 lg:pb-32 px-6">
          <div className="max-w-[1200px] mx-auto text-center">
            <div className="max-w-4xl mx-auto">
              
              <div className="hero-element opacity-0">
                <Badge variant="outline" className="mb-8 px-4 py-2 rounded-none bg-[#121215] border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-mono uppercase tracking-[0.2em]">
                  <CheckCircle2 size={12} className="inline mr-2" /> Over 5,000+ Happy Residents
                </Badge>
              </div>
              
              <h1 className="hero-element opacity-0 text-5xl sm:text-7xl lg:text-[90px] font-serif italic tracking-tighter leading-[1.05] mb-8 text-white">
                Find your perfect PG. <br className="hidden sm:block"/>
                <span className="text-[#D4AF37] not-italic font-sans font-black uppercase tracking-tight text-4xl sm:text-6xl lg:text-[70px]">Zero Brokerage.</span>
              </h1>
              
              <p className="hero-element opacity-0 text-sm sm:text-base text-white/60 mb-12 max-w-2xl mx-auto font-mono tracking-widest uppercase leading-relaxed">
                Discover premium, verified co-living spaces. Enjoy transparent pricing, high-speed WiFi, and an instant booking experience.
              </p>

              {/* User-Friendly Search Bar */}
              <div className="hero-element opacity-0 max-w-3xl mx-auto relative group">
                <div className="absolute -inset-1 bg-[#D4AF37]/20 blur-lg opacity-50 group-hover:opacity-100 transition duration-500" />
                <div className="relative flex flex-col sm:flex-row p-2 bg-[#121215] border border-[#D4AF37]/50 shadow-2xl">
                  <div className="flex-1 flex items-center px-4">
                    <Search className="text-[#D4AF37] shrink-0 mr-4" size={20} />
                    <Input
                      placeholder="Search by city, area, or tech park..."
                      className="h-14 text-sm font-mono tracking-widest text-white bg-transparent border-none focus-visible:ring-0 shadow-none placeholder:text-white/30"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} className="h-14 px-10 rounded-none bg-[#A62639] hover:bg-white text-white hover:text-black font-black uppercase tracking-[0.2em] text-[10px] w-full sm:w-auto transition-all">
                    Search <ArrowRight size={14} className="ml-2" />
                  </Button>
                </div>
              </div>

              <div className="hero-element opacity-0 mt-10 flex flex-wrap justify-center gap-3 items-center">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mr-2">Popular Areas</span>
                {POPULAR_AREAS.map(area => (
                  <Badge key={area} variant="outline" className="cursor-pointer rounded-none border-white/20 text-white/50 bg-black hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest" onClick={() => navigate(`/explore?area=${area}`)}>
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAND */}
        <section className="border-y border-white/10 bg-[#121215]/50 overflow-hidden py-6">
          <div className="flex items-center whitespace-nowrap opacity-50">
            <div className="trust-track flex items-center gap-16 px-8 w-max">
              {[...TRUST_BRANDS, ...TRUST_BRANDS, ...TRUST_BRANDS].map((brand, i) => (
                <span key={i} className="text-[11px] font-mono tracking-widest text-white uppercase">{brand}</span>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-32 px-6 max-w-[1400px] mx-auto">
          <div className="text-center mb-20 gsap-fade-up">
            <h2 className="text-4xl sm:text-5xl font-serif italic text-white tracking-tighter mb-4">Move in instantly.</h2>
            <p className="text-[#D4AF37] font-mono text-[10px] uppercase tracking-widest">A completely digitized process designed for your convenience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-1 relative gsap-stagger-grid">
            <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-px bg-white/10 -z-10" />
            {[
              { icon: Search, title: 'Find your fit', desc: 'Browse verified listings with high-res photos, honest reviews, and transparent pricing.' },
              { icon: Shield, title: 'Book securely', desc: 'Pay your token amount online. 100% safe, verified, and instantly confirmed.' },
              { icon: HomeIcon, title: 'Move right in', desc: 'Sign your digital agreement, grab your keys, and welcome to your new home.' }
            ].map((step, i) => (
              <div key={i} className="gsap-stagger-item bg-[#121215] border border-white/10 p-10 text-center relative group hover:border-[#D4AF37]/50 transition-colors">
                <div className="w-20 h-20 mx-auto bg-[#0A0A0C] border border-[#D4AF37]/30 flex items-center justify-center mb-8 relative z-10">
                  <step.icon size={28} className="text-[#D4AF37]" />
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#D4AF37] text-black flex items-center justify-center text-[10px] font-black font-mono">0{i+1}</div>
                </div>
                <h3 className="text-xl font-serif text-white mb-3 tracking-tight">{step.title}</h3>
                <p className="text-white/50 text-[11px] font-mono uppercase tracking-widest leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURED PGs */}
        <section className="py-32 px-6 bg-[#121215] border-y border-white/10">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 gsap-fade-up">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 bg-[#A62639] animate-pulse" />
                  <span className="text-[9px] font-mono tracking-widest uppercase text-[#A62639]">Top Rated Properties</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-serif italic tracking-tighter text-white">Featured Spaces.</h2>
              </div>
              <Button className="h-12 px-8 rounded-none border border-white/20 bg-transparent hover:bg-white text-white hover:text-black font-black uppercase tracking-widest text-[10px] transition-all" onClick={() => navigate('/explore')}>
                View All Properties <ArrowRight size={14} className="ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10 p-px gsap-stagger-grid">
              {featured?.slice(0, 6).map((property: any) => {
                const beds = getAvailableBeds(property);
                const isAvailable = beds > 0;
                return (
                  <div key={property.id} className="gsap-stagger-item group cursor-pointer bg-[#0A0A0C] relative overflow-hidden transition-all duration-500 hover:bg-[#121215]" onClick={() => navigate(`/property/${property.id}`)}>
                    <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10">
                      {property.photos?.length > 0 ? (
                        <img src={property.photos[0]} alt={property.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#121215]"><Building2 size={40} className="text-white/10" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-80" />
                      
                      <div className="absolute top-4 left-4">
                        {(property as any).is_verified && (
                          <Badge className="rounded-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1">
                            <Shield size={10} className="mr-1.5" /> Verified
                          </Badge>
                        )}
                      </div>
                      <Badge className={`absolute bottom-4 right-4 rounded-none text-[8px] font-black uppercase tracking-widest border px-2 py-1 ${isAvailable ? 'bg-black/80 text-white border-white/20' : 'bg-[#A62639]/80 text-white border-[#A62639]/50'}`}>
                        {isAvailable ? `${beds} BEDS LEFT` : 'SOLD OUT'}
                      </Badge>
                    </div>

                    <div className="p-6 relative z-10">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="font-serif text-2xl text-white line-clamp-1 group-hover:italic transition-all">{property.name}</h3>
                        {(property as any).rating && (
                          <div className="flex items-center gap-1 border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-1 shrink-0">
                            <Star size={10} className="fill-[#D4AF37] text-[#D4AF37]" />
                            <span className="text-[10px] font-mono font-bold text-[#D4AF37]">{(property as any).rating}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <MapPin size={12} className="text-[#A62639]" /> {[property.area, property.city].filter(Boolean).join(' • ')}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.2em] font-black text-white/30 mb-1">Starting At</p>
                          <p className="text-xl font-mono text-white tracking-widest">{getRentRange(property)}</p>
                        </div>
                        <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-white/50 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37] transition-colors">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* EXPANDING CITIES */}
        <section className="py-32 px-6 max-w-[1400px] mx-auto">
          <div className="text-center mb-16 gsap-fade-up">
            <h2 className="text-4xl sm:text-5xl font-serif italic text-white tracking-tighter mb-4">A Growing Network.</h2>
            <p className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-[0.3em]">Standardizing co-living across India's biggest hubs.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 auto-rows-[240px] gsap-stagger-grid">
            {CITIES.map((city) => (
              <div
                key={city.name}
                onClick={() => city.active && navigate('/explore')}
                className={`gsap-stagger-item relative overflow-hidden bg-[#121215] border border-white/10 group ${city.active ? 'cursor-pointer md:col-span-2' : 'cursor-not-allowed md:col-span-1'}`}
              >
                <img src={city.img} alt={city.name} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${city.active ? 'opacity-40 group-hover:opacity-60 group-hover:scale-105' : 'opacity-10 grayscale'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-4xl font-serif text-white tracking-tight">{city.name}</h3>
                    {city.active && <div className="w-10 h-10 border border-[#D4AF37] bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]"><ArrowRight size={16} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" /></div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-none ${city.active ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                    <p className="text-[9px] font-mono font-bold text-white/70 uppercase tracking-[0.2em]">{city.tagline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIAL CAROUSEL */}
        <section className="py-40 px-6 bg-[#121215] border-y border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Star size={200} />
          </div>
          <div className="max-w-[1000px] mx-auto min-h-[350px] flex flex-col justify-center">
            <div className="mb-12 gsap-fade-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 bg-[#D4AF37] animate-pulse" />
                <span className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">Resident Reviews</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-serif italic text-white tracking-tighter">Don't just take our word for it.</h2>
            </div>
            
            <div className="relative w-full h-[220px] gsap-fade-up">
              {TESTIMONIALS.map((t, i) => (
                <div 
                  key={i} 
                  className={`absolute top-0 left-0 w-full transition-all duration-1000 ease-[0.22,1,0.36,1] ${
                    i === activeTestimonial ? 'opacity-100 translate-y-0 pointer-events-auto z-10' : 'opacity-0 translate-y-10 pointer-events-none z-0'
                  }`}
                >
                  <div className="border-l-4 border-[#A62639] pl-8 py-4">
                    <p className="text-white/90 font-mono text-base sm:text-xl uppercase tracking-wider leading-relaxed mb-10">
                      "{t.text}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border border-[#D4AF37]/30 bg-[#D4AF37]/5 flex items-center justify-center font-serif text-lg text-[#D4AF37]">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-serif text-2xl text-white mb-1">{t.name}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">
                          <span>{t.role}</span>
                          <span className="border-l border-white/20 pl-3 text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10}/> {t.auth}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Carousel Dots */}
            <div className="flex items-center gap-3 mt-8">
              {TESTIMONIALS.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-1 transition-all duration-500 rounded-none ${i === activeTestimonial ? 'w-12 bg-[#D4AF37]' : 'w-4 bg-white/20 hover:bg-white/50'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-40 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="relative border-2 border-[#D4AF37] bg-[#121215] shadow-[0_0_60px_rgba(212,175,55,0.15)] gsap-fade-up">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#D4AF37] -translate-x-2 -translate-y-2" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#D4AF37] translate-x-2 translate-y-2" />
              
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
              
              <div className="relative p-12 md:p-24 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37] flex items-center justify-center mb-8">
                  <Zap size={24} className="text-[#D4AF37]" />
                </div>
                <h2 className="text-4xl sm:text-6xl font-serif italic text-white tracking-tighter mb-6">Ready to move in?</h2>
                <p className="text-[11px] sm:text-xs font-mono text-white/50 uppercase tracking-widest mb-12 max-w-xl mx-auto leading-relaxed">
                  Join thousands of residents who found their perfect PG through Gharpayy. Book instantly today.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                  <Button onClick={() => navigate('/explore')} className="h-16 px-12 bg-[#D4AF37] hover:bg-white text-black text-[11px] rounded-none font-black tracking-[0.2em] uppercase transition-all shadow-[4px_4px_0px_#4E111A] active:translate-y-1 active:shadow-none">
                    Start Browsing
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/owner-portal')} className="h-16 px-12 text-[11px] rounded-none bg-transparent border-white/20 hover:bg-white/5 text-white font-black tracking-[0.2em] uppercase transition-all">
                    List a Property
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#0A0A0C] pt-20 pb-10 px-6 relative z-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 border border-white/20 flex items-center justify-center">
                  <span className="text-white font-serif font-black text-lg">G</span>
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight text-white">Gharpayy</span>
              </div>
              <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest max-w-sm leading-loose">
                The premier digital infrastructure for co-living and paying guest accommodations in India.
              </p>
            </div>
            <div>
              <h4 className="font-black text-[10px] font-mono tracking-[0.3em] uppercase mb-8 text-[#D4AF37]">Platform</h4>
              <ul className="space-y-6 text-[10px] font-mono tracking-widest uppercase text-white/50">
                <li><button onClick={() => navigate('/explore')} className="hover:text-white transition-colors">Find a PG</button></li>
                <li><button onClick={() => navigate('/owner-portal')} className="hover:text-white transition-colors">Partner Portal</button></li>
                <li><button className="hover:text-white transition-colors">Safety Standards</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-[10px] font-mono tracking-[0.3em] uppercase mb-8 text-[#D4AF37]">Company</h4>
              <ul className="space-y-6 text-[10px] font-mono tracking-widest uppercase text-white/50">
                <li><button className="hover:text-white transition-colors">About Us</button></li>
                <li><button className="hover:text-white transition-colors">Careers</button></li>
                <li><button className="hover:text-white transition-colors">Contact Support</button></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 text-[9px] font-mono tracking-widest uppercase text-white/30">
            <p>COPYRIGHT © 2026 GHARPAYY TECHNOLOGIES.</p>
            <div className="flex gap-8 mt-6 md:mt-0">
              <button className="hover:text-white transition-colors">Privacy Policy</button>
              <button className="hover:text-white transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}