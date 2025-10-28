import { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord } from '@/types';

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
        // Map status to valid AttendanceStatus type
        const status: 'present' | 'absent' | 'flagged' = 
          (record.status === 'flagged' || record.anomalyFlag) ? 'flagged' : 'present';
        
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
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refresh: fetchData };
};
