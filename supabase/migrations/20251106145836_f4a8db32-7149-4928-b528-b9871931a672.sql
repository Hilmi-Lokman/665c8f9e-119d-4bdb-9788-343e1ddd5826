-- Add UPDATE policy for attendance_records
CREATE POLICY "Authenticated users can update attendance records"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (true);

-- Add DELETE policy for attendance_records
CREATE POLICY "Authenticated users can delete attendance records"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (true);