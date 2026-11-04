-- Ajouter la colonne pour le code PIN dans les soumissions
ALTER TABLE public.ad_submissions ADD COLUMN IF NOT EXISTS whatsapp_pin_code text;

-- Ajouter les colonnes pour les statuts flash dans les campagnes
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS is_flash boolean DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
