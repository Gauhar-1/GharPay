-- =====================================================
-- TENANT PORTAL TABLES
-- =====================================================

-- tenant_issues: tenants report problems during stay
CREATE TABLE IF NOT EXISTS public.tenant_issues (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  property_id   UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_name   TEXT NOT NULL,
  tenant_phone  TEXT,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'general' CHECK (category IN ('plumbing','electrical','hvac','furniture','internet','security','cleanliness','general','other')),
  status        TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  admin_response TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenant_issues ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can insert (anonymous tenant), admin/manager can see all, owner sees their property issues
CREATE POLICY "tenant_issues_insert" ON public.tenant_issues FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "tenant_issues_select_admin" ON public.tenant_issues FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager','agent'))
  OR EXISTS (
    SELECT 1 FROM public.owners o
    JOIN public.properties p ON p.owner_id = o.id
    WHERE o.user_id = auth.uid() AND p.id = tenant_issues.property_id
  )
);
CREATE POLICY "tenant_issues_update_admin" ON public.tenant_issues FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
);

-- asset_submissions: owner submits a new property for admin KYC
CREATE TABLE IF NOT EXISTS public.asset_submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id      UUID REFERENCES public.owners(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  capacity      INTEGER,
  asset_type    TEXT DEFAULT 'coliving' CHECK (asset_type IN ('coliving','pg','apartment','hostel','other')),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
  admin_notes   TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.asset_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_submissions_owner_insert" ON public.asset_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "asset_submissions_owner_select" ON public.asset_submissions FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
);
CREATE POLICY "asset_submissions_admin_update" ON public.asset_submissions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
);

-- pg_rules: house rules set per property
CREATE TABLE IF NOT EXISTS public.pg_rules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id   UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  rule_text     TEXT NOT NULL,
  category      TEXT DEFAULT 'general' CHECK (category IN ('timing','food','guests','cleanliness','noise','payments','general')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pg_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pg_rules_public_read" ON public.pg_rules FOR SELECT USING (is_active = true);
CREATE POLICY "pg_rules_owner_insert" ON public.pg_rules FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.owners o
    JOIN public.properties p ON p.owner_id = o.id
    WHERE o.user_id = auth.uid() AND p.id = property_id
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
);
CREATE POLICY "pg_rules_owner_update" ON public.pg_rules FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.owners o
    JOIN public.properties p ON p.owner_id = o.id
    WHERE o.user_id = auth.uid() AND p.id = pg_rules.property_id
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','manager'))
);

-- Add stay-duration and checkout columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stay_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS checkout_date DATE,
  ADD COLUMN IF NOT EXISTS tenant_user_id UUID REFERENCES auth.users(id);

-- Trigger to auto-update updated_at on tenant_issues
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_issues_updated_at
  BEFORE UPDATE ON public.tenant_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER asset_submissions_updated_at
  BEFORE UPDATE ON public.asset_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_submissions;
