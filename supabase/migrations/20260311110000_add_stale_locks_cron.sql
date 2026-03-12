-- 1. Create native cleanup function
CREATE OR REPLACE FUNCTION public.release_stale_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleared_count INT;
BEGIN
  -- We assume 'soft_locks' has a 'bed_id', 'created_at', and 'is_active'
  -- and 'beds' has an 'id', 'status'.
  
  -- Gather all stale active locks (older than 10 minutes)
  WITH stale_locks AS (
    SELECT id, bed_id 
    FROM public.soft_locks
    WHERE is_active = true 
      AND created_at < NOW() - INTERVAL '10 minutes'
  ),
  -- Deactivate them
  updated_locks AS (
    UPDATE public.soft_locks sl
    SET is_active = false
    FROM stale_locks
    WHERE sl.id = stale_locks.id
    RETURNING sl.id
  )
  -- Revert bed statuses
  UPDATE public.beds b
  SET status = 'vacant'
  FROM stale_locks
  WHERE b.id = stale_locks.bed_id AND b.status = 'reserved';
  
  -- You could technically GET DIAGNOSTICS v_cleared_count = ROW_COUNT; and log it inserted into a system_operations table if desired.
END;
$$;

-- 2. Schedule execution via pg_cron every 1 minute
-- Assumes pg_cron extension was enabled in the previous migration step.
SELECT cron.schedule(
  'release-stale-soft-locks',
  '* * * * *', -- Every minute
  'SELECT public.release_stale_locks();'
);
