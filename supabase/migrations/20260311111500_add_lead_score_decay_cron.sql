-- 1. Create the lead score decay function
CREATE OR REPLACE FUNCTION public.apply_score_decay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_days_passed integer;
  v_new_score integer;
BEGIN
  -- Loop through active leads that have a score > 0 and a valid last_activity_at
  FOR v_lead IN 
    SELECT id, lead_score, last_activity_at 
    FROM public.leads 
    WHERE status NOT IN ('booked', 'lost') 
      AND lead_score > 0 
      AND last_activity_at IS NOT NULL
  LOOP
    -- Calculate days passed since the last activity
    v_days_passed := EXTRACT(DAY FROM (now() - v_lead.last_activity_at))::integer;
    
    -- If at least 1 day has passed, apply decay (-2 points per inactive day)
    IF v_days_passed > 0 THEN
      v_new_score := v_lead.lead_score - (v_days_passed * 2);
      
      -- Bound score to 0
      IF v_new_score < 0 THEN
        v_new_score := 0;
      END IF;
      
      -- Update the lead with the decayed score
      -- 'last_activity_at' is not updated to keep measuring continuous decay
      UPDATE public.leads 
      SET lead_score = v_new_score
      WHERE id = v_lead.id;
    END IF;
  END LOOP;
END;
$$;

-- 2. Schedule execution via pg_cron nightly at midnight
-- Assumes pg_cron extension was enabled previously
SELECT cron.schedule(
  'apply-lead-score-decay-nightly',
  '0 0 * * *', -- Run at 00:00 (midnight) every day
  'SELECT public.apply_score_decay();'
);
