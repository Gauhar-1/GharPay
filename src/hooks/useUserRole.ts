import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext'; // Adjust path if needed

export type AppRole = 'admin' | 'manager' | 'agent' | 'owner';

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user?.id, // Only run if the user is authenticated
    staleTime: 1000 * 60 * 5, // Cache the role for 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error.message);
        return null;
      }
      return data.role as AppRole;
    }
  });
}