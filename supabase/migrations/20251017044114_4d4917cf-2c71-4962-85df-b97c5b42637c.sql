-- Create periodic_captures table for live WiFi capture data
CREATE TABLE IF NOT EXISTS public.periodic_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  ap_id TEXT,
  rssi INTEGER,
  duration_total NUMERIC,
  ap_switches INTEGER DEFAULT 0,
  rssi_mean NUMERIC,
  rssi_std NUMERIC,
  invalid_rssi_count INTEGER DEFAULT 0,
  login_hour INTEGER,
  weekday INTEGER,
  start_minute_of_day INTEGER,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.periodic_captures ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read periodic captures (for real-time monitoring)
CREATE POLICY "Allow anyone to read periodic captures"
  ON public.periodic_captures
  FOR SELECT
  USING (true);

-- Allow anyone to insert captures (for Kali script)
CREATE POLICY "Allow anyone to insert captures"
  ON public.periodic_captures
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete captures (for cleanup after processing)
CREATE POLICY "Allow anyone to delete captures"
  ON public.periodic_captures
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_periodic_captures_device_id ON public.periodic_captures(device_id);
CREATE INDEX idx_periodic_captures_captured_at ON public.periodic_captures(captured_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.periodic_captures;