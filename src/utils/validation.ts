// Validation utilities for data integrity

export const validateMacAddress = (mac: string): boolean => {
  const macRegex = /^[0-9A-Fa-f]{12,}$/;
  return macRegex.test(mac);
};

export const validateAnomalyScore = (score: number): boolean => {
  return score >= 0 && score <= 1;
};

export const validateTimeRange = (start: Date, end: Date): boolean => {
  return start < end && start <= new Date();
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const validateSessionId = (sessionId: string): boolean => {
  return sessionId.length > 0 && sessionId.length <= 100;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs} sec ago`;
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export const calculateAnomalyRisk = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score >= 0.9) return 'critical';
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
};
