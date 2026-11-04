CREATE OR REPLACE FUNCTION increment_whatsapp_click(tracking_id_param TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.ad_submissions 
  SET whatsapp_clicks = COALESCE(whatsapp_clicks, 0) + 1 
  WHERE tracking_id = tracking_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
