import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Kanban, CalendarCheck, BarChart3, Settings,
  MessageSquare, History, X, Moon, Sun, Building2, Bed, TrendingUp,
  Map, Sparkles, Receipt, Globe, UserCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const salesItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/visits', icon: CalendarCheck, label: 'Visits' },
  { to: '/conversations', icon: MessageSquare, label: 'Messages' },
  { to: '/bookings', icon: Receipt, label: 'Bookings' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/historical', icon: History, label: 'Historical' },
];

const supplyItems = [
  { to: '/owners', icon: Building2, label: 'Owners' },
  { to: '/inventory', icon: Bed, label: 'Inventory' },
  { to: '/availability', icon: Map, label: 'Availability' },
  { to: '/effort', icon: TrendingUp, label: 'Effort' },
  { to: '/matching', icon: Sparkles, label: 'Matching' },
  { to: '/zones', icon: Globe, label: 'Zones' },
];

const portalItems = [
  { to: '/owner-portal', icon: UserCircle, label: 'Owner Portal' },
];

const AppSidebar = ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => {
  const location = useLocation();
  
  // FIXED THEME LOGIC: Persists to localStorage and checks system preference
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const renderGroup = (label: string, items: typeof salesItems) => (
    <div className="mb-6">
      <p className="px-6 mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/70">
        {label}
      </p>
      <div className="flex flex-col">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink 
              key={item.to} 
              to={item.to} 
              onClick={onClose} 
              className={`flex items-center gap-3 px-6 py-3 text-[10px] font-mono uppercase tracking-[0.15em] transition-all border-l-2 ${
                isActive 
                  ? 'border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-transparent text-[#D4AF37]' 
                  : 'border-transparent text-white/50 hover:text-white hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <item.icon size={14} className={isActive ? "opacity-100" : "opacity-60"} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" 
            onClick={onClose} 
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[260px] flex flex-col bg-[#0A0A0C] border-r border-white/10 transition-transform duration-300 ease-[0.22,1,0.36,1] lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

        {/* Logo / Header */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border border-[#D4AF37] flex items-center justify-center bg-[#D4AF37]/5">
              <span className="text-[#D4AF37] font-serif font-black text-lg italic">G</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl tracking-tight font-bold text-white leading-none">Gharpayy</span>
              <span className="text-[7px] tracking-[0.4em] text-[#D4AF37] font-black uppercase mt-1.5">Booking OS</span>
            </div>
          </div>
          <button className="lg:hidden p-1.5 rounded-none border border-white/10 hover:bg-white/10 text-white/50 transition-colors" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          {renderGroup('Demand', salesItems)}
          {renderGroup('Supply', supplyItems)}
          {renderGroup('Portals', portalItems)}
        </nav>

        {/* Tactical Footer */}
        <div className="shrink-0 border-t border-white/10 bg-[#121215]">
          
          {/* Controls */}
          <div className="flex items-center border-b border-white/5">
            <button 
              onClick={() => setIsDark(!isDark)} 
              className="flex-1 flex justify-center items-center gap-2 p-3 text-[9px] font-mono tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-colors border-r border-white/5"
            >
              {isDark ? <Sun size={12} /> : <Moon size={12} />}
              {isDark ? 'LIGHT' : 'DARK'}
            </button>
            <NavLink 
              to="/settings" 
              onClick={onClose} 
              className={({ isActive }) => `flex-1 flex justify-center items-center gap-2 p-3 text-[9px] font-mono tracking-widest transition-colors ${isActive ? 'text-[#D4AF37] bg-[#D4AF37]/5' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              <Settings size={12} />
              SETTINGS
            </NavLink>
          </div>

          {/* User Badge */}
          <div className="p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]/50 group-hover:bg-[#D4AF37] transition-colors" />
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 border border-white/20 flex items-center justify-center text-[#D4AF37] font-serif font-bold text-lg bg-[#0A0A0C]">
                A
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-white tracking-widest uppercase truncate">Admin</p>
                <p className="text-[9px] font-mono text-white/50 truncate mt-0.5 lowercase">admin@gharpayy.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;