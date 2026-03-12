-- Helper function to check for role
CREATE OR REPLACE FUNCTION public.has_role(requested_role public.app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = requested_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Script to drop permissive policies on primary tables
DROP POLICY IF EXISTS "Auth users manage leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users update leads" ON public.leads;

DROP POLICY IF EXISTS "Auth users manage properties" ON public.properties;
DROP POLICY IF EXISTS "Auth users update properties" ON public.properties;

DROP POLICY IF EXISTS "Auth users manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Auth users update rooms" ON public.rooms;

DROP POLICY IF EXISTS "Auth users manage beds" ON public.beds;
DROP POLICY IF EXISTS "Auth users update beds" ON public.beds;

-- New Strict RLS Policies for leads
CREATE POLICY "Admins and Managers have full access to leads"
ON public.leads FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('manager'))
WITH CHECK (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Agents can insert and update their own leads"
ON public.leads FOR ALL TO authenticated
USING (
    public.has_role('agent') 
    AND (
        assigned_agent_id = auth.uid()
    )
)
WITH CHECK (
    public.has_role('agent')
    AND (
        assigned_agent_id = auth.uid()
    )
);

CREATE POLICY "Owners can view leads for their properties"
ON public.leads FOR SELECT TO authenticated
USING (
    public.has_role('owner')
    AND property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
);


-- New Strict RLS Policies for properties
CREATE POLICY "Admins and Managers have full access to properties"
ON public.properties FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('manager'))
WITH CHECK (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Agents can view properties"
ON public.properties FOR SELECT TO authenticated
USING (public.has_role('agent'));

CREATE POLICY "Owners can update their own properties"
ON public.properties FOR UPDATE TO authenticated
USING (public.has_role('owner') AND owner_id = auth.uid())
WITH CHECK (public.has_role('owner') AND owner_id = auth.uid());

CREATE POLICY "Owners can view their own properties"
ON public.properties FOR SELECT TO authenticated
USING (public.has_role('owner') AND owner_id = auth.uid());


-- New Strict RLS Policies for rooms
CREATE POLICY "Admins and Managers have full access to rooms"
ON public.rooms FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('manager'))
WITH CHECK (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Agents can view rooms"
ON public.rooms FOR SELECT TO authenticated
USING (public.has_role('agent'));

CREATE POLICY "Owners can view and update rooms of their properties"
ON public.rooms FOR ALL TO authenticated
USING (
    public.has_role('owner')
    AND property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    public.has_role('owner')
    AND property_id IN (
        SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
);


-- New Strict RLS Policies for beds
CREATE POLICY "Admins and Managers have full access to beds"
ON public.beds FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('manager'))
WITH CHECK (public.has_role('admin') OR public.has_role('manager'));

CREATE POLICY "Agents can view beds"
ON public.beds FOR SELECT TO authenticated
USING (public.has_role('agent'));

CREATE POLICY "Owners can view and update beds of their properties"
ON public.beds FOR ALL TO authenticated
USING (
    public.has_role('owner')
    AND room_id IN (
        SELECT id FROM public.rooms WHERE property_id IN (
            SELECT id FROM public.properties WHERE owner_id = auth.uid()
        )
    )
)
WITH CHECK (
    public.has_role('owner')
    AND room_id IN (
        SELECT id FROM public.rooms WHERE property_id IN (
            SELECT id FROM public.properties WHERE owner_id = auth.uid()
        )
    )
);


-- Tighten RLS on reservations table
-- Drop the permissive insert/update policies for anonymous users
DROP POLICY IF EXISTS "Anyone insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone update reservations" ON public.reservations;

-- Add strict policies for reservations
-- Currently anyone can insert since there's no user_id tie-in yet on auth
CREATE POLICY "Authenticated users can insert their own reservations"
ON public.reservations FOR INSERT TO authenticated
WITH CHECK (true);


-- Create Transaction Tracking Schema
CREATE TABLE public.payment_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id uuid REFERENCES public.reservations(id) ON DELETE RESTRICT,
    amount numeric NOT NULL,
    gateway_transaction_id text,
    status text DEFAULT 'pending'
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Add basic RLS to payment_transactions 
CREATE POLICY "Admins and Managers have full access to payment_transactions"
ON public.payment_transactions FOR ALL TO authenticated
USING (public.has_role('admin') OR public.has_role('manager'))
WITH CHECK (public.has_role('admin') OR public.has_role('manager'));
