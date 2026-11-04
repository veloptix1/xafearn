-- S'assurer que la table notifications existe et est accessible
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
