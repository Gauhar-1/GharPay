CREATE TYPE public.visit_type_enum AS ENUM ('physical', 'virtual');

CREATE TABLE public.visit_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    visit_type public.visit_type_enum NOT NULL,
    requested_date text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visit_requests" ON public.visit_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins/Managers can view visit_requests" ON public.visit_requests FOR SELECT USING (public.has_role('admin') OR public.has_role('manager'));

CREATE OR REPLACE FUNCTION request_property_visit(
  p_property_id uuid,
  p_name text,
  p_phone text,
  p_visit_type public.visit_type_enum,
  p_requested_date text
) RETURNS uuid AS $$
DECLARE
  v_lead_id uuid;
  v_visit_id uuid;
BEGIN
  -- Find or create lead by phone
  SELECT id INTO v_lead_id FROM public.leads WHERE phone = p_phone LIMIT 1;
  
  IF v_lead_id IS NULL THEN
    INSERT INTO public.leads (name, phone, status, source)
    VALUES (p_name, p_phone, 'new', 'website')
    RETURNING id INTO v_lead_id;
  ELSE
    UPDATE public.leads SET name = p_name WHERE id = v_lead_id;
  END IF;

  -- Insert visit request
  INSERT INTO public.visit_requests (lead_id, property_id, visit_type, requested_date)
  VALUES (v_lead_id, p_property_id, p_visit_type, p_requested_date)
  RETURNING id INTO v_visit_id;

  RETURN v_visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
