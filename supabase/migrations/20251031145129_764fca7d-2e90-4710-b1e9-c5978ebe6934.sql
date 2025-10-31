-- Update the set_capture_control function to handle session_id
CREATE OR REPLACE FUNCTION public.set_capture_control(
  start_capture boolean,
  session_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE capture_control 
  SET 
    should_capture = start_capture,
    active_session_id = session_id
  WHERE id = 1;
  
  RETURN json_build_object(
    'success', TRUE, 
    'should_capture', start_capture,
    'active_session_id', session_id
  );
END;
$$;