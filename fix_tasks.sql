ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration_hours integer;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS gain_per_view numeric;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check CHECK (type IN ('subscribe', 'join_channel', 'share', 'custom', 'diffusion_duration'));
