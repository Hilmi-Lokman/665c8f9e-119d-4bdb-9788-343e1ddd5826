-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  device_hash TEXT,
  matric_number TEXT,
  student_name TEXT,
  ap_id TEXT NOT NULL,
  avg_rssi NUMERIC NOT NULL DEFAULT -99,
  rssi_std NUMERIC DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  ap_switches INTEGER NOT NULL DEFAULT 0,
  anomaly_flag BOOLEAN NOT NULL DEFAULT false,
  anomaly_score NUMERIC DEFAULT 0,
  class_name TEXT,
  status TEXT CHECK (status IN ('present', 'flagged', 'suspicious')) DEFAULT 'present',
  session_duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_attendance_created_at ON public.attendance_records(created_at DESC);
CREATE INDEX idx_attendance_anomaly ON public.attendance_records(anomaly_flag);
CREATE INDEX idx_attendance_device ON public.attendance_records(device_hash);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all records
CREATE POLICY "Authenticated users can view attendance records"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert records
CREATE POLICY "Authenticated users can insert attendance records"
  ON public.attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();