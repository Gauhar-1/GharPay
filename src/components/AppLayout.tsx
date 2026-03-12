import { ReactNode, useState, useEffect } from 'react';
import AppSidebar from './AppSidebar';
import CommandPalette from './CommandPalette';
import NotificationBell from './NotificationBell';
import QuickAddLead from './QuickAddLead';
import { Menu, Search, LogOut, User as UserIcon, Settings, ChevronDown, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';

export interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const AppLayout = ({ children, title, subtitle, actions }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, signOut } = useAuth();

  // Define what makes an admin (Adjust this logic based on your Supabase setup)
  const isAdmin = user?.email === 'admin@gharpayy.com' || user?.user_metadata?.role === 'admin';


  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'OP'; // OP = Operative
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E5E5E5] relative selection:bg-[#D4AF37]/30 font-sans">
      {/* Texture: Subtle Victorian Wallpaper Grain / Microfilm static */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[0] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-[260px] flex flex-col min-h-screen relative z-10">
        {/* Top Command Bar */}
        <header className="sticky top-0 z-30 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/10 px-6 md:px-8 h-20 flex items-center justify-between gap-4 transition-all duration-300">
          
          <div className="flex items-center gap-4 min-w-0">
            <button 
              className="lg:hidden p-2 -ml-2 rounded-none border border-white/10 hover:bg-white/10 transition-all text-white/50" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="font-serif text-2xl text-white truncate tracking-tight leading-none mb-1">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37] truncate leading-none">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {actions}
            
            {/* Search Trigger - Tactical Styling */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-3 px-4 h-10 text-[10px] font-mono tracking-widest uppercase text-white/50 bg-[#121215] hover:bg-white/5 transition-all border border-white/10"
            >
              <Search size={14} className="text-[#D4AF37]" />
              <span>Query Database...</span>
              <kbd className="ml-4 px-1.5 py-0.5 bg-black border border-white/20 text-[#D4AF37] text-[9px]">
                ⌘K
              </kbd>
            </button>
            <button onClick={() => setCmdOpen(true)} className="md:hidden p-2 rounded-none border border-white/10 bg-[#121215] hover:bg-white/5 transition-all text-[#D4AF37]">
              <Search size={16} />
            </button>

            <NotificationBell />

            {/* Vertical Separator */}
            <div className="hidden sm:block w-px h-8 bg-white/10 mx-2" />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 outline-none group p-1 hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 pr-3">
                  <Avatar className="h-8 w-8 rounded-none border border-[#D4AF37]/50 group-hover:border-[#D4AF37] transition-all">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt="Profile" />
                    <AvatarFallback className="bg-[#121215] text-[#D4AF37] text-[10px] font-mono font-bold rounded-none">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown size={14} className="text-white/30 group-hover:text-[#D4AF37] transition-colors hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-64 mt-2 p-0 rounded-none bg-[#121215] border-2 border-[#D4AF37] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]" forceMount>
                <DropdownMenuLabel className="font-normal p-4 bg-[#0A0A0C] border-b border-white/10">
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-serif italic text-white leading-none">
                        {user?.user_metadata?.full_name || 'Operative'}
                      </p>
                      {isAdmin && <span title="Admin Clearance"><ShieldAlert size={12} className="text-[#A62639]" /></span>}
                    </div>
                    <p className="text-[9px] font-mono tracking-widest uppercase text-white/40 truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                
                <div className="p-2 space-y-1">
                  <DropdownMenuItem className="cursor-pointer rounded-none px-3 py-2.5 text-[10px] font-mono tracking-widest uppercase text-white/70 hover:bg-white/5 hover:text-white transition-colors focus:bg-white/5 focus:text-white" onClick={() => navigate('/settings')}>
                    <UserIcon className="mr-3 h-3 w-3 text-[#D4AF37]" />
                    Identity Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-none px-3 py-2.5 text-[10px] font-mono tracking-widest uppercase text-white/70 hover:bg-white/5 hover:text-white transition-colors focus:bg-white/5 focus:text-white" onClick={() => navigate('/settings')}>
                    <Settings className="mr-3 h-3 w-3 text-[#D4AF37]" />
                    System Config
                  </DropdownMenuItem>
                </div>
                
                <DropdownMenuSeparator className="bg-white/10 m-0" />
                
                <div className="p-2">
                  <DropdownMenuItem 
                    className="cursor-pointer rounded-none px-3 py-2.5 text-[10px] font-mono font-bold tracking-widest uppercase text-[#A62639] hover:bg-[#A62639]/10 focus:bg-[#A62639]/10 focus:text-[#A62639] transition-colors" 
                    onClick={signOut}
                  >
                    <LogOut className="mr-3 h-3 w-3" />
                    Purge Session
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        {/* Content Area */}
        <motion.main
          className="flex-1 p-6 md:p-8 w-full mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <QuickAddLead />
    </div>
  );
};

export default AppLayout;