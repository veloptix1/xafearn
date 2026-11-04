-- Table des tâches
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_url TEXT NOT NULL, -- Lien vers le compte à suivre, le canal à rejoindre, etc.
  reward NUMERIC NOT NULL, -- Combien l'utilisateur gagne
  type TEXT NOT NULL CHECK (type IN ('subscribe', 'join_channel', 'share', 'custom')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  max_completions INTEGER DEFAULT 1000,
  current_completions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des soumissions de tâches
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(task_id, user_id) -- Un utilisateur ne peut faire une tâche qu'une seule fois
);

-- Sécurité RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les tâches actives" ON public.tasks FOR SELECT USING (status = 'active');
CREATE POLICY "Les admins peuvent tout faire sur les tâches" ON public.tasks FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)));
CREATE POLICY "Les utilisateurs voient leurs propres soumissions" ON public.task_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent créer des soumissions" ON public.task_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Les admins voient toutes les soumissions" ON public.task_submissions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)));
