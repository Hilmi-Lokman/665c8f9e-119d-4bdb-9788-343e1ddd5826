-- SQL Commands to Enable Real-time Monitoring
-- Run these commands in your Supabase SQL Editor (Cloud -> Database -> SQL Editor)

-- Enable realtime for periodic_captures table
ALTER TABLE periodic_captures REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE periodic_captures;

-- Enable realtime for attendance_records table (optional, for processed records)
ALTER TABLE attendance_records REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
