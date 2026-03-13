import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantIssue {
  id: string;
  booking_id: string | null;
  property_id: string | null;
  tenant_name: string;
  tenant_phone: string | null;
  title: string;
  description: string | null;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

export interface PgRule {
  id: string;
  property_id: string;
  rule_text: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

// ─── Tenant's current booking ─────────────────────────────────────────────────
export function useTenantBooking() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tenant-booking', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // 1. Try to find the booking using the direct user ID (booked_by)
      let { data, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          properties(id, name, area, city, amenities, photos),
          rooms(id, room_number, room_type, rent_per_bed, furnishing, bathroom_type),
          beds(id, bed_number),
          leads(id, name, phone, email)
        `)
        .eq('booked_by', user!.id) // Ensure this matches your actual column name (booked_by)
        .in('booking_status', ['confirmed', 'checked_in'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // 2. FALLBACK: If no direct user link is found, try matching the Lead's email
      if (!data && user?.email) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('bookings')
          .select(`
            *, 
            properties(id, name, area, city, amenities, photos),
            rooms(id, room_number, room_type, rent_per_bed, furnishing, bathroom_type),
            beds(id, bed_number),
            leads!inner(id, name, phone, email) 
          `)
          .eq('leads.email', user.email) // !inner allows filtering by joined tables
          .in('booking_status', ['confirmed', 'checked_in'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackError) throw fallbackError;
        data = fallbackData;
      }

      return data;
    },
  });
}

// ─── Tenant Issues ────────────────────────────────────────────────────────────
export function useTenantIssues(bookingId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`tenant-issues-${bookingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tenant_issues',
        filter: `booking_id=eq.${bookingId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['tenant-issues', bookingId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, qc]);

  return useQuery({
    queryKey: ['tenant-issues', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenant_issues')
        .select('*')
        .eq('booking_id', bookingId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TenantIssue[];
    },
  });
}

// ─── All Issues (Admin view) ──────────────────────────────────────────────────
export function useAllTenantIssues() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('all-tenant-issues-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenant_issues' }, () => {
        qc.invalidateQueries({ queryKey: ['all-tenant-issues'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ['all-tenant-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_issues' as any)
        .select('*, properties(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Submit Issue ─────────────────────────────────────────────────────────────
export function useSubmitIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (issue: {
      booking_id?: string;
      property_id?: string;
      tenant_name: string;
      tenant_phone?: string;
      title: string;
      description?: string;
      category?: string;
      priority?: string;
    }) => {
      const { data, error } = await supabase
        .from('tenant_issues' as any)
        .insert(issue)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tenant-issues', (data as any).booking_id] });
      qc.invalidateQueries({ queryKey: ['all-tenant-issues'] });
    },
  });
}

// ─── Update Issue (Admin) ────────────────────────────────────────────────────
export function useUpdateIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any)
        .from('tenant_issues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-tenant-issues'] });
    },
  });
}

// ─── PG Rules ─────────────────────────────────────────────────────────────────
export function usePgRules(propertyId?: string) {
  return useQuery({
    queryKey: ['pg-rules', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pg_rules')
        .select('*')
        .eq('property_id', propertyId!)
        .eq('is_active', true)
        .order('category');
      if (error) throw error;
      return data as PgRule[];
    },
  });
}

// ─── Add/Update PG Rule (Owner/Admin) ────────────────────────────────────────
export function useUpsertPgRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      id?: string;
      property_id: string;
      rule_text: string;
      category?: string;
      is_active?: boolean;
    }) => {
      if (rule.id) {
        const { data, error } = await (supabase as any)
          .from('pg_rules')
          .update({ rule_text: rule.rule_text, category: rule.category, is_active: rule.is_active })
          .eq('id', rule.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('pg_rules' as any)
          .insert(rule)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pg-rules', (data as any).property_id] });
    },
  });
}

// ─── Delete PG Rule ───────────────────────────────────────────────────────────
export function useDeletePgRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pg_rules' as any)
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pg-rules'] });
    },
  });
}

// ─── Asset Submissions ────────────────────────────────────────────────────────
export function useAssetSubmissions() {
  return useQuery({
    queryKey: ['asset-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_submissions' as any)
        .select('*, owners(name, email)')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitAsset() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (submission: {
      owner_id?: string;
      name: string;
      address: string;
      capacity: number;
      asset_type: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('asset_submissions' as any)
        .insert({ ...submission, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-submissions'] });
    },
  });
}

export function useUpdateAssetSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const { data, error } = await (supabase as any)
        .from('asset_submissions')
        .update({ status, admin_notes, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-submissions'] });
    },
  });
}

// ─── Checkout Tenant ─────────────────────────────────────────────────────────
export function useCheckoutTenant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, checkoutDate }: { bookingId: string; checkoutDate?: string }) => {
      const date = checkoutDate || new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .update({
          booking_status: 'checked_out',
          checkout_date: date,
        })
        .eq('id', bookingId)
        .select()
        .single();
      if (error) throw error;

      // Release the bed back to vacant
      if (data?.bed_id) {
        await supabase
          .from('beds')
          .update({ status: 'vacant', current_reservation_id: null })
          .eq('id', data.bed_id);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['owner-tenants'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
    },
  });
}

// ─── Owner Tenants (real data) ────────────────────────────────────────────────
export function useOwnerTenants(propertyIds: string[]) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!propertyIds.length) return;
    const channel = supabase
      .channel('owner-tenants-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        qc.invalidateQueries({ queryKey: ['owner-tenants'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [propertyIds.join(','), qc]);

  return useQuery({
    queryKey: ['owner-tenants', propertyIds],
    enabled: propertyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_status, payment_status, monthly_rent, 
          move_in_date, checkout_date, stay_duration_days,
          leads(id, name, phone, email),
          properties(id, name),
          rooms(id, room_number),
          beds(id, bed_number)
        `)
        .in('property_id', propertyIds)
        .in('booking_status', ['confirmed', 'checked_in', 'checked_out'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
