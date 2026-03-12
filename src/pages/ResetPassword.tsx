import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Key, TerminalSquare, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Supabase handles session from hash automatically
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { 
      toast.error('Cryptographic key must be at least 6 characters'); 
      return; 
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Security clearance updated. Rerouting...');
      setTimeout(() => navigate('/'), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Texture: Subtle Victorian Wallpaper Grain / Microfilm static */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

      {/* Decorative Glitch Line */}
      <motion.div 
        className="absolute top-1/3 left-0 right-0 h-[1px] bg-[#D4AF37]/10 shadow-[0_0_20px_#D4AF37]"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 0.5, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
      />

      <motion.div 
        className="w-full max-w-[440px] bg-[#121215] border border-white/10 relative z-10 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Corner Targeting Brackets */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#D4AF37] pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#D4AF37] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#D4AF37] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#D4AF37] pointer-events-none" />

        {/* Terminal Header */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#0A0A0C] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <TerminalSquare size={12} />
            <span className="text-[9px] font-mono tracking-widest uppercase">Security Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-none bg-warning animate-pulse" />
            <span className="text-[9px] font-mono tracking-widest text-warning uppercase">Awaiting Input</span>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-[#D4AF37] flex items-center justify-center rotate-45">
              <span className="text-black font-serif font-black text-2xl -rotate-45">G</span>
            </div>
            <div>
              <h1 className="font-serif text-3xl italic text-white tracking-tighter leading-none">Gharpayy</h1>
              <p className="text-[8px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase mt-2">Classified Access</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-2xl text-white mb-2">Override Clearance</h2>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest leading-relaxed">
              Provide a new cryptographic key to restore your access to the intelligence network.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] font-mono tracking-widest uppercase text-[#D4AF37]">New Authorization Key</Label>
                {password.length > 0 && password.length < 6 && (
                  <span className="text-[9px] font-mono text-[#A62639] flex items-center gap-1">
                    <AlertCircle size={10} /> Weak
                  </span>
                )}
                {password.length >= 6 && (
                  <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-1">
                    <ShieldCheck size={10} /> Secure
                  </span>
                )}
              </div>
              <div className="relative group">
                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors" />
                <Input 
                  className="pl-12 h-14 rounded-none bg-[#0A0A0C] border-white/10 focus:border-[#D4AF37] text-white font-mono tracking-[0.3em] text-lg" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  minLength={6} 
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 rounded-none bg-[#D4AF37] hover:bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30"
            >
              {loading ? 'ENCRYPTING NEW KEY...' : 'INITIALIZE OVERRIDE'}
            </Button>
          </form>
        </div>

        {/* Decorative Barcode Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0A0A0C] flex justify-between items-center opacity-30">
          <div className="flex gap-1 items-end h-4">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="w-0.5 bg-white" style={{ height: `${Math.max(40, Math.random() * 100)}%`, opacity: Math.random() }} />
            ))}
          </div>
          <span className="text-[8px] font-mono tracking-widest text-white uppercase">End of Protocol</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;