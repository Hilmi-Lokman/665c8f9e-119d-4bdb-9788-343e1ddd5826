-- Allow anon users to read attendance records for the Recent Activity component
CREATE POLICY "Allow anon users to view attendance records"
ON public.attendance_records
FOR SELECT
TO anon
USING (true);