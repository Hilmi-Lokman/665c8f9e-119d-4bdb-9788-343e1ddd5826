-- Create registered_devices table to store MAC address to student mappings
CREATE TABLE public.registered_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  device_hash TEXT,
  student_name TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  class_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registered_devices ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view registered devices" 
ON public.registered_devices 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert registered devices" 
ON public.registered_devices 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update registered devices" 
ON public.registered_devices 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete registered devices" 
ON public.registered_devices 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_registered_devices_updated_at
BEFORE UPDATE ON public.registered_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_registered_devices_device_id ON public.registered_devices(device_id);