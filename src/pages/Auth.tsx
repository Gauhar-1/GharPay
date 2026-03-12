import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, TrendingUp, ShieldCheck, Zap, ArrowRight, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const springTransition: any = { type: 'spring', bounce: 0, duration: 0.6, ease: [0.32, 0.72, 0, 1] };

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('demo@gharpayy.com');
  const [password, setPassword] = useState('demo1234');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const ensureDemoAccount = async () => {
    await supabase.auth.signUp({
      email: 'demo@gharpayy.com',
      password: 'demo1234',
      options: { data: { full_name: 'Demo Executive' } },
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (email === 'demo@gharpayy.com') await ensureDemoAccount();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else {
      toast.success('Welcome to the Dashboard');
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Legal name is required'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) toast.error(error.message);
    else toast.success('Verification link sent to your inbox');
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Password reset instructions sent');
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}`, queryParams: { prompt: 'select_account' } },
    });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden selection:bg-accent/30">
      {/* Left Panel: Executive Branding */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden flex-col justify-between p-16 bg-[#09090b]">
        {/* Animated background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-info/5 blur-[140px] rounded-full" />
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springTransition}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-2xl shadow-accent/20">
              <span className="text-accent-foreground font-black text-xl">G</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tighter leading-none">Gharpayy</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mt-1">Institutional Real Estate OS</p>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 max-w-xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.15 } }
            }}
          >
            <motion.h2 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={springTransition}
              className="text-5xl xl:text-6xl font-black text-white leading-[0.95] tracking-tight mb-8"
            >
              Master your pipeline. <br />
              <span className="text-accent">Scale your portfolio.</span>
            </motion.h2>

            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={springTransition}
              className="grid grid-cols-2 gap-4"
            >
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-4">
                  <TrendingUp size={20} />
                </div>
                <p className="text-white font-bold text-lg leading-tight">AI-Driven <br />Leads</p>
                <p className="text-white/40 text-xs mt-2">Proprietary scoring algorithms to identify ready-to-book tenants.</p>
              </div>

              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-info/20 flex items-center justify-center text-info mb-4">
                  <ShieldCheck size={20} />
                </div>
                <p className="text-white font-bold text-lg leading-tight">Zero-Leak <br />Operations</p>
                <p className="text-white/40 text-xs mt-2">Automated follow-ups that ensure no prospect is ever forgotten.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-8">
          <div className="flex -space-x-3">
             {[1,2,3,4].map(i => (
               <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-white/10 flex items-center justify-center overflow-hidden">
                 <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
               </div>
             ))}
             <div className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">
               +2k
             </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Trusted by Global Portfolio Managers</p>
        </div>
      </div>

      {/* Right Panel: Auth Gateway */}
      <div className="flex-1 relative flex items-center justify-center p-8 bg-background">
        {/* Floating gradient for mobile */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full bg-accent/5 blur-[120px] pointer-events-none" />

        <motion.div
          className="w-full max-w-[400px] z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
        >
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-black text-lg">G</span>
            </div>
            <h1 className="text-xl font-bold tracking-tighter">Gharpayy</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create Account' : 'Security Check'}
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              {mode === 'login' ? 'Access your institutional dashboard' : mode === 'signup' ? 'Join the next generation of real estate' : 'Verify your email to continue'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {mode !== 'forgot' && (
                <div className="space-y-4 mb-8">
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-2xl gap-3 border-border/50 hover:bg-secondary/50 font-bold transition-all active:scale-[0.98]" 
                    onClick={handleGoogle} 
                    disabled={loading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="bg-background px-4 text-muted-foreground/60">Professional Credentials</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot} className="space-y-5">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</Label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                      <Input className="pl-12 h-14 rounded-2xl bg-secondary/30 border-border/50 focus:bg-background transition-all" placeholder="Legal full name" value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address</Label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                    <Input className="pl-12 h-14 rounded-2xl bg-secondary/30 border-border/50 focus:bg-background transition-all" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-accent hover:text-accent/80 transition-colors">
                          Recover?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                      <Input className="pl-12 pr-12 h-14 rounded-2xl bg-secondary/30 border-border/50 focus:bg-background transition-all" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black text-base shadow-xl shadow-black/5 transition-all active:scale-[0.98]" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Authenticating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {mode === 'login' ? 'Enter Dashboard' : mode === 'signup' ? 'Join Gharpayy' : 'Send Recovery Link'}
                      <Zap size={16} className="fill-current" />
                    </div>
                  )}
                </Button>
              </form>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {mode === 'login' ? (
                <>Don't have an executive account? <button onClick={() => setMode('signup')} className="text-accent font-bold hover:underline">Apply now</button></>
              ) : (
                <>Already a partner? <button onClick={() => setMode('login')} className="text-accent font-bold hover:underline">Sign in</button></>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;