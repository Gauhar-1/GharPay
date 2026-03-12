import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, TerminalSquare, ArrowLeft, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Retaining your original logging logic, styled for the theme internally
    console.error(`[SECURITY_LOG] Protocol 404: Unregistered sector access attempted at: ${location.pathname}`);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E5E5E5] flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Texture: Subtle Victorian Wallpaper Grain / Microfilm static */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
      
      {/* Background Glitch Line */}
      <motion.div 
        className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#A62639]/20 shadow-[0_0_20px_#A62639]"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
      />

      <motion.div 
        className="w-full max-w-2xl bg-[#121215] border border-white/10 relative z-10 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Terminal Header */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#0A0A0C] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#A62639]">
            <TerminalSquare size={12} />
            <span className="text-[9px] font-mono tracking-widest uppercase">System Error Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-none bg-[#A62639] animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-[#A62639] uppercase">Status: 404</span>
          </div>
        </div>

        <div className="p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 border border-[#A62639]/30 bg-[#A62639]/5 flex items-center justify-center mb-8 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#A62639]" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#A62639]" />
            <ShieldAlert size={32} className="text-[#A62639]" />
          </div>

          <h1 className="text-7xl md:text-8xl font-serif italic text-white tracking-tighter mb-4">
            Sector <br />Restricted.
          </h1>
          
          <p className="text-sm font-mono text-white/50 tracking-widest uppercase mb-10 max-w-md leading-relaxed">
            The intelligence dossier or territory map you are attempting to access does not exist within the current registry.
          </p>

          {/* Forensic Path Data */}
          <div className="w-full bg-[#0A0A0C] border border-white/10 p-4 mb-10 flex flex-col items-start text-left">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-2">Target Acquired:</span>
            <code className="text-xs font-mono text-[#A62639] break-all">
              {location.pathname}
            </code>
          </div>

          {/* Tactical Return Action */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline" 
              className="h-12 px-8 rounded-none border-white/20 bg-transparent hover:bg-white/5 text-white/70 hover:text-white font-mono text-[10px] tracking-widest uppercase transition-all"
            >
              <ArrowLeft size={14} className="mr-2" /> Fallback
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              className="h-12 px-8 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase transition-all"
            >
              Return to Command
            </Button>
          </div>
        </div>
        
        {/* Bottom decorative barcode */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#0A0A0C] flex justify-between items-center opacity-30">
          <div className="flex gap-1">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-0.5 h-4 bg-white" style={{ opacity: Math.random() }} />
            ))}
          </div>
          <span className="text-[8px] font-mono tracking-widest text-white">END OF REPORT</span>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;