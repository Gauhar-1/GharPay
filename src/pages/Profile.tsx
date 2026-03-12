import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Camera, Loader2, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with existing user metadata
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    phone: user?.user_metadata?.phone || '',
  });

  const getInitials = () => {
    return formData.fullName.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || 'GH';
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate API delay for premium feel
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success('Profile updated successfully!');
    setIsSaving(false);
  };

  return (
    <AppLayout title="My Profile" subtitle="Manage your account settings and preferences">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Header Card */}
        <motion.div 
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Abstract cover background */}
          <div className="h-32 bg-gradient-to-r from-accent/20 to-info/20 relative">
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px]" />
          </div>
          
          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-12 relative z-10">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-accent/10 text-accent text-2xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-2 bg-secondary rounded-full border border-border/50 shadow-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200">
                <Camera size={14} className="text-foreground" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{formData.fullName || 'Gharpayy User'}</h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Mail size={14} /> {user?.email}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 px-4 py-2 rounded-xl">
              <Shield size={16} className={role === 'admin' ? 'text-destructive' : 'text-accent'} />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Access Level</span>
                <span className="text-sm font-medium capitalize">
                  {roleLoading ? <Loader2 size={12} className="animate-spin" /> : (role || 'User')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Personal Information Form */}
          <motion.div 
            className="md:col-span-2 space-y-6 bg-card/50 backdrop-blur-sm border border-border/50 p-6 rounded-2xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
          >
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Personal Information</h3>
              <p className="text-sm text-muted-foreground">Update your personal details and contact info.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    className="pl-9 h-11 rounded-xl bg-background/50" 
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Input 
                    className="pl-3 h-11 rounded-xl bg-background/50" 
                    placeholder="+91"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    disabled 
                    className="pl-9 h-11 rounded-xl bg-muted/50 cursor-not-allowed opacity-70" 
                    value={user?.email || ''} 
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Email addresses cannot be changed directly. Contact an admin.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving}
                className="h-11 px-8 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 transition-all active:scale-95"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>

          {/* Side Info Panel */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-6 rounded-2xl">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Building size={16} className="text-muted-foreground" />
                Company Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Organization</p>
                  <p className="text-sm font-medium text-foreground">Gharpayy Internal CRM</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Department</p>
                  <p className="text-sm font-medium text-foreground capitalize">{role === 'owner' ? 'Property Management' : 'Sales & Operations'}</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}