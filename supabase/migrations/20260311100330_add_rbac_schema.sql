-- Role Management
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent', 'owner');

CREATE TABLE public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
