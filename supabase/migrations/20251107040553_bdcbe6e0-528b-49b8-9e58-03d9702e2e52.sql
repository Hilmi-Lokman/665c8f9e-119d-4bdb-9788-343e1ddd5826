-- Create storage bucket for AI models
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-models', 'ai-models', false);

-- Create RLS policies for AI models bucket
CREATE POLICY "Admin can upload AI models"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ai-models' 
  AND auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%admin%'
  )
);

CREATE POLICY "Admin can view AI models"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-models'
  AND auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%admin%'
  )
);

CREATE POLICY "Admin can update AI models"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ai-models'
  AND auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%admin%'
  )
);

CREATE POLICY "Admin can delete AI models"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ai-models'
  AND auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%admin%'
  )
);

-- Create table to track current active models
CREATE TABLE IF NOT EXISTS public.ai_model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_file_path TEXT NOT NULL,
  scaler_file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  version TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.ai_model_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_model_config
CREATE POLICY "Admin can view model config"
ON public.ai_model_config
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can insert model config"
ON public.ai_model_config
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin can update model config"
ON public.ai_model_config
FOR UPDATE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_ai_model_config_active ON public.ai_model_config(is_active);
CREATE INDEX idx_ai_model_config_uploaded_at ON public.ai_model_config(uploaded_at DESC);