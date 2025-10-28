-- Create schedules table for class management
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (time_end - time_start)) / 60) STORED,
  location TEXT,
  instructor TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view schedules"
  ON public.schedules FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedules"
  ON public.schedules FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete schedules"
  ON public.schedules FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add schedule_id to attendance_records
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.schedules(id),
ADD COLUMN IF NOT EXISTS attendance_duration_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT false;

-- Create index for faster schedule lookups
CREATE INDEX IF NOT EXISTS idx_schedules_day_time ON public.schedules(day_of_week, time_start, time_end) WHERE is_active = true;