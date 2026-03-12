import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, Zap, Fingerprint, Terminal, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const terminalTransition: any = { type: 'tween', duration: 0.4, ease: [0.22, 1, 0.36, 1] };

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // PURGED: Hardcoded demo credentials are removed for production security.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // INTELLIGENT ROUTING: Automatically route based on clearance level
  useEffect(() => {
    if (user) {
      const isAdmin = user.email === 'admin@gharpayy.com' || user.user_metadata?.role === 'admin';
      toast.success('Clearance accepted. Initializing system...');
      navigate(isAdmin ? '/dashboard' : '/owner-portal');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Credentials required.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Access Denied: ' + error.message);
      setLoading(false);
    }
    // Note: Success routing is handled automatically by the useEffect watching `user`
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { 
      toast.error('Operative designation (Name) is required.'); 
      return; 
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) {
      toast.error('Registration failed: ' + error.message);
    } else {
      toast.success('Clearance link transmitted to your inbox.');
      setMode('login');
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Target email address required.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) toast.error('Transmission failed: ' + error.message);
    else toast.success('Recovery protocol initiated. Check your inbox.');
    
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}`, 
        queryParams: { prompt: 'select_account' } 
      },
    });
    if (error) {
      toast.error('OAuth failed: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex overflow-hidden selection:bg-[#D4AF37]/30 selection:text-white font-sans">
      
      {/* LEFT PANEL: Tactical Branding */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden flex-col justify-between p-16 bg-[#0A0A0C] border-r border-white/10">
        {/* Subtle Microfilm Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
        
        {/* Ambient Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#D4AF37]/5 blur-[140px] rounded-full animate-pulse" />
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={terminalTransition}
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-12 h-12 border border-[#D4AF37] bg-[#D4AF37]/5 flex items-center justify-center">
              <span className="text-[#D4AF37] font-serif font-black text-2xl italic">G</span>
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white tracking-tighter leading-none">Gharpayy</h1>
              <p className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-[#D4AF37] mt-1.5">Intelligence OS</p>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 max-w-xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.h2 
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              transition={terminalTransition}
              className="text-5xl xl:text-6xl font-serif italic text-white leading-[1.05] tracking-tight mb-12"
            >
              Establish Operational Control.
            </motion.h2>

            <motion.div 
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              transition={terminalTransition}
              className="grid grid-cols-2 gap-4"
            >
              <div className="p-8 bg-[#121215] border border-white/10 hover:border-[#D4AF37]/50 transition-colors">
                <div className="w-10 h-10 border border-[#D4AF37]/30 bg-[#0A0A0C] flex items-center justify-center text-[#D4AF37] mb-6">
                  <Database size={18} />
                </div>
                <p className="text-white font-serif text-xl leading-tight mb-2">Encrypted Intel</p>
                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                  Proprietary algorithms identifying high-yield target acquisitions.
                </p>
              </div>

              <div className="p-8 bg-[#121215] border border-white/10 hover:border-[#D4AF37]/50 transition-colors">
                <div className="w-10 h-10 border border-[#A62639]/30 bg-[#0A0A0C] flex items-center justify-center text-[#A62639] mb-6">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-white font-serif text-xl leading-tight mb-2">Absolute Security</p>
                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                  Automated protocols ensuring zero data leakage in the pipeline.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">System Online • Secure Connection</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Authentication Terminal */}
      <div className="flex-1 relative flex items-center justify-center p-8 bg-[#0A0A0C]">
        
        <motion.div
          className="w-full max-w-[400px] z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...terminalTransition, delay: 0.1 }}
        >
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-12 border-b border-white/10 pb-6">
            <div className="w-10 h-10 border border-[#D4AF37] bg-[#D4AF37]/5 flex items-center justify-center">
              <span className="text-[#D4AF37] font-serif font-black text-lg italic">G</span>
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-white tracking-tight leading-none">Gharpayy</h1>
              <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-[#D4AF37] mt-1">Intelligence OS</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-serif text-white tracking-tight mb-2">
              {mode === 'login' ? 'System Authorization.' : mode === 'signup' ? 'Initiate Registration.' : 'Clearance Recovery.'}
            </h2>
            <p className="text-[10px] font-mono tracking-widest uppercase text-white/50">
              {mode === 'login' ? 'Enter credentials to access the network' : mode === 'signup' ? 'Establish your operative identity' : 'Verify identity to bypass lockout'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Google OAuth */}
              {mode !== 'forgot' && (
                <div className="space-y-4 mb-8">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full h-12 rounded-none gap-3 bg-transparent border-white/20 text-white font-mono text-[10px] tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white transition-all" 
                    onClick={handleGoogle} 
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Authorize via Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                    <div className="relative flex justify-center text-[9px] font-mono font-bold uppercase tracking-[0.3em]">
                      <span className="bg-[#0A0A0C] px-4 text-white/30">OR STANDARD PROTOCOL</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot} className="space-y-6">
                
                {/* Full Name Field (Signup Only) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/50">Designation (Legal Name)</Label>
                    <div className="relative group">
                      <Fingerprint size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-[#D4AF37]" />
                      <Input 
                        className="pl-12 h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-sm tracking-widest focus:border-[#D4AF37] transition-all" 
                        placeholder="ENTER NAME..." 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                      />
                    </div>
                  </div>
                )}
                
                {/* Email Field */}
                <div className="space-y-2">
                  <Label className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/50">Comms Link (Email)</Label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-[#D4AF37]" />
                    <Input 
                      className="pl-12 h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-sm tracking-widest focus:border-[#D4AF37] transition-all" 
                      type="email" 
                      placeholder="OPERATIVE@DOMAIN.COM" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                {/* Password Field */}
                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/50">Access Cipher (Password)</Label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => setMode('forgot')} className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold text-[#D4AF37] hover:text-white transition-colors">
                          Recover Cipher?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-[#D4AF37]" />
                      <Input 
                        className="pl-12 pr-12 h-12 rounded-none bg-[#121215] border-white/10 text-white font-mono text-sm tracking-widest focus:border-[#D4AF37] transition-all" 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                      />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-none bg-[#D4AF37] text-black hover:bg-white font-black text-[10px] font-mono tracking-[0.2em] uppercase transition-all shadow-[4px_4px_0px_#4E111A] active:translate-y-1 active:shadow-none" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {mode === 'login' ? 'Execute Login' : mode === 'signup' ? 'Confirm Registration' : 'Transmit Recovery'}
                      <Terminal size={14} className="fill-current" />
                    </div>
                  )}
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Mode Switcher */}
          <div className="mt-12 text-center border-t border-white/10 pt-6">
            <p className="text-[10px] font-mono tracking-widest uppercase text-white/40">
              {mode === 'login' ? (
                <>Unregistered operative? <button onClick={() => setMode('signup')} className="text-[#D4AF37] font-bold hover:text-white transition-colors">Apply for Clearance</button></>
              ) : (
                <>Already possessing clearance? <button onClick={() => setMode('login')} className="text-[#D4AF37] font-bold hover:text-white transition-colors">Authenticate</button></>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;