-- Create periodic_captures table for temporary WiFi signal storage
CREATE TABLE IF NOT EXISTS public.periodic_captures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text NOT NULL,
  ap_id text NOT NULL,
  rssi numeric NOT NULL DEFAULT -99,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.periodic_captures ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert and view captures
CREATE POLICY "Authenticated users can insert periodic captures"
  ON public.periodic_captures
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view periodic captures"
  ON public.periodic_captures
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can delete periodic captures"
  ON public.periodic_captures
  FOR DELETE
  USING (true);

-- Add index for performance
CREATE INDEX idx_periodic_captures_device_ap ON public.periodic_captures(device_id, ap_id);
CREATE INDEX idx_periodic_captures_timestamp ON public.periodic_captures(timestamp);