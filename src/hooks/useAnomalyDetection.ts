import { useState, useCallback, useEffect } from 'react';
import { AnomalyRecord } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

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
      
      // TODO: Replace with actual API call
      // const response = await supabase.from('anomalies').select('*').gte('anomalyScore', threshold);
      
      const mockAnomalies: AnomalyRecord[] = [
        {
          id: "1",
          hashedMac: "1a2b3c4d5e6f098765432",
          anomalyType: "erratic_ap_switching",
          anomalyScore: 0.87,
          timestamp: new Date().toISOString(),
          status: "pending",
          autoDetected: true
        }
      ];
      
      setAnomalies(mockAnomalies);
      
      // Smart notifications for new anomalies
      if (autoNotify && mockAnomalies.some(a => a.status === 'pending')) {
        const pendingAnomalies = mockAnomalies.filter(a => a.status === 'pending');
        
        // Notify individually for critical anomalies
        const criticalAnomalies = pendingAnomalies.filter(a => a.anomalyScore >= 0.85);
        criticalAnomalies.forEach(anomaly => {
          notifyAnomaly(
            anomaly.anomalyType,
            anomaly.anomalyScore,
            anomaly.hashedMac,
            anomaly.details
          );
        });
        
        // Batch notification for non-critical
        const nonCritical = pendingAnomalies.filter(a => a.anomalyScore < 0.85);
        if (nonCritical.length > 0) {
          notifyBatch(
            nonCritical.length,
            'anomaly',
            `${nonCritical.length} new anomaly(ies) detected requiring review`
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch anomalies'));
    } finally {
      setIsLoading(false);
    }
  }, [threshold, autoNotify, notifyAnomaly, notifyBatch]);

  const reviewAnomaly = useCallback(async (id: string, action: 'normal' | 'confirmed') => {
    try {
      // TODO: Replace with actual API call
      // await supabase.from('anomalies').update({ status: action === 'confirmed' ? 'flagged' : 'reviewed' }).eq('id', id);
      
      setAnomalies(prev => 
        prev.map(a => a.id === id ? { ...a, status: action === 'confirmed' ? 'flagged' : 'reviewed' } as AnomalyRecord : a)
      );
    } catch (err) {
      console.error('Failed to update anomaly status:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  return {
    anomalies,
    isLoading,
    error,
    reviewAnomaly,
    refresh: fetchAnomalies
  };
};
