-- Enable extensions if they are not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the 15-minute cron job to trigger the automation-jobs Edge Function
-- NOTE: Prior to applying to production, please replace <YOUR_PROJECT_REF_OR_URL> 
-- and <YOUR_SERVICE_ROLE_KEY> with the actual tokens from your Supabase Dashboard!
SELECT cron.schedule(
  'invoke-automation-jobs',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<YOUR_PROJECT_REF_OR_URL>.supabase.co/functions/v1/automation-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
      )
    ) AS request_id;
  $$
);
