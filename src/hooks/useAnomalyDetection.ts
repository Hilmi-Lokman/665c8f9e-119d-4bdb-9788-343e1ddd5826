import { useState, useCallback, useEffect } from 'react';
import { AnomalyRecord, AnomalyType } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

interface UseAnomalyDetectionOptions {
  threshold?: number;
  autoNotify?: boolean;
}

interface UseAnomalyDetectionReturn {
  anomalies: AnomalyRecord[];
  isLoading: boolean;
  error: Error | null;
  reviewAnomaly: (id: string, action: 'normal' | 'confirmed') => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAnomalyDetection = (
  options: UseAnomalyDetectionOptions = {}
): UseAnomalyDetectionReturn => {
  const { threshold = 0.7, autoNotify = true } = options;
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { notifyAnomaly, notifyBatch } = useNotifications();

  const fetchAnomalies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch attendance records where status is 'suspicious' OR 'flagged'
      const { data: records, error: fetchError } = await supabase
        .from('attendance_records')
        .select('*')
        .in('status', ['suspicious', 'flagged'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform attendance records to AnomalyRecord format
      const transformedAnomalies: AnomalyRecord[] = (records || []).map(record => {
        const score = record.anomaly_score || 0;
        
        // Determine anomaly type based on record data
        let anomalyType: AnomalyType = 'unusual_duration';
        if (record.ap_switches > 5) {
          anomalyType = 'erratic_ap_switching';
        } else if (record.duration_seconds < 300) {
          anomalyType = 'short_session';
        } else if (record.duration_seconds > 14400) {
          anomalyType = 'unusual_duration';
        }

        // Map status: 'suspicious' -> 'pending', 'flagged' -> 'flagged'
        const status = record.status === 'flagged' ? 'flagged' : 'pending';

        return {
          id: record.id,
          hashedMac: record.device_id,
          anomalyType,
          anomalyScore: score,
          timestamp: record.created_at,
          status,
          autoDetected: true,
          details: {
            duration: `${Math.floor(record.duration_seconds / 60)} minutes`,
            apSwitches: record.ap_switches,
            avgRssi: record.avg_rssi,
            matricNumber: record.matric_number,
            studentName: record.student_name,
          }
        };
      });
      
      setAnomalies(transformedAnomalies);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch anomalies'));
    } finally {
      setIsLoading(false);
    }
  }, [threshold]);

  const reviewAnomaly = useCallback(async (id: string, action: 'normal' | 'confirmed') => {
    try {
      // Update attendance record status
      const updates = {
        status: action === 'confirmed' ? 'flagged' : 'present',
        anomaly_flag: action === 'confirmed',
      };

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Update local state
      setAnomalies(prev => 
        prev.map(a => a.id === id ? { ...a, status: action === 'confirmed' ? 'flagged' : 'reviewed' } as AnomalyRecord : a)
      );
    } catch (err) {
      console.error('Failed to update anomaly status:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();

    // Set up real-time subscription for updates
    const channel = supabase
      .channel('anomaly-records-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        () => {
          fetchAnomalies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnomalies]);

  return {
    anomalies,
    isLoading,
    error,
    reviewAnomaly,
    refresh: fetchAnomalies
  };
};
