-- Create capture_control table for Kali script communication
CREATE TABLE IF NOT EXISTS public.capture_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  should_capture BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial row
INSERT INTO public.capture_control (should_capture) 
VALUES (false)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.capture_control ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and update
CREATE POLICY "Allow authenticated users to read capture control"
  ON public.capture_control
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update capture control"
  ON public.capture_control
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow anon users to read (for Kali script polling)
CREATE POLICY "Allow anon to read capture control"
  ON public.capture_control
  FOR SELECT
  TO anon
  USING (true);

-- Function to update capture control
CREATE OR REPLACE FUNCTION public.set_capture_control(start_capture BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the first (and only) row
  UPDATE public.capture_control
  SET should_capture = start_capture,
      updated_at = now()
  WHERE id = (SELECT id FROM public.capture_control LIMIT 1);
  
  -- Return the current state
  SELECT json_build_object(
    'success', true,
    'should_capture', should_capture
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get capture control status
CREATE OR REPLACE FUNCTION public.get_capture_control_status()
RETURNS TABLE (
  should_capture BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cc.should_capture, cc.updated_at
  FROM public.capture_control cc
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_capture_control TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_capture_control_status TO anon;
GRANT EXECUTE ON FUNCTION public.get_capture_control_status TO authenticated;