-- ============================================================
-- OWNER SIGNUP TRIGGER
-- Auto-assigns 'owner' role in user_roles when a user signs up
-- with raw_user_meta_data->>'role' = 'owner'
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If signup metadata specifies role = 'owner', auto-assign the owner role
  IF NEW.raw_user_meta_data->>'role' = 'owner' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_new_user_signup();
