-- Create class_sessions table to track each class session
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  class_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add session_id to attendance_records to link to class sessions
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL;

-- Add active_session_id to capture_control
ALTER TABLE public.capture_control 
ADD COLUMN IF NOT EXISTS active_session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL;

-- Enable RLS on class_sessions
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for class_sessions
CREATE POLICY "Authenticated users can view class sessions"
ON public.class_sessions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert class sessions"
ON public.class_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update class sessions"
ON public.class_sessions FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete class sessions"
ON public.class_sessions FOR DELETE
TO authenticated
USING (true);

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_active ON public.class_sessions(is_active) WHERE is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER update_class_sessions_updated_at
BEFORE UPDATE ON public.class_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();