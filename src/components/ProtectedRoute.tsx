import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  // 1. Show a loader while checking auth and fetching the role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  // 2. Not logged in? Kick back to login screen
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. Logged in, but does the route require specific roles?
  if (allowedRoles && allowedRoles.length > 0) {
    // If role is null (no row in user_roles yet), deny access for restricted routes
    // Exception: admin email bypass for initial setup
    const isAdminEmail = user.email === 'admin@gharpayy.com' || user.user_metadata?.role === 'admin';
    
    if (!role && !isAdminEmail) {
      // Role not yet assigned — could be a new owner signup, redirect to auth
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (role && !allowedRoles.includes(role) && !isAdminEmail) {
      // If an owner tries to access the CRM, force them to the owner portal
      if (role === 'owner') {
        return <Navigate to="/owner-portal" replace />;
      }
      // If a standard agent tries to access admin settings, kick them to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // 4. User is authenticated and authorized! Render the page.
  return <>{children}</>;
}