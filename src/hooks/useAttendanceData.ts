import { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface UseAttendanceDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseAttendanceDataReturn {
  data: AttendanceRecord[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useAttendanceData = (
  options: UseAttendanceDataOptions = {}
): UseAttendanceDataReturn => {
  const { autoRefresh = false, refreshInterval = 5000 } = options;
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { apiService } = await import('@/services/api');
      const records = await apiService.getAttendanceReport();
      
      // Transform to AttendanceRecord format
      const transformedData: AttendanceRecord[] = records.map(record => {
        // Map status directly from database
        let status: 'present' | 'suspicious' | 'flagged' = 'present';
        
        if (record.status === 'flagged') {
          status = 'flagged';
        } else if (record.status === 'suspicious') {
          status = 'suspicious';
        }
        
        return {
          id: record.id,
          hashedMac: record.macAddress,
          connectionTime: new Date(record.timestamp).toLocaleTimeString(),
          sessionDuration: record.sessionDuration,
          apTransitions: record.apSwitches || 0,
          status,
          anomalyScore: record.anomalyScore || 0,
          lastSeen: new Date(record.timestamp).toLocaleString()
        };
      });
      
      setData(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch attendance data'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription to sync updates from anomaly page
    const channel = supabase
      .channel('attendance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_records'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refresh: fetchData };
};
