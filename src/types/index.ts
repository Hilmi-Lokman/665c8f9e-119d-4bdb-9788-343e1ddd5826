// Core type definitions for the application

export type AttendanceStatus = 'present' | 'absent' | 'flagged';
export type AnomalyStatus = 'pending' | 'reviewed' | 'flagged';
export type AnomalyType = 'erratic_ap_switching' | 'proxy_attempt' | 'unusual_duration' | 'short_session' | 'spoofing';
export type CaptureState = 'idle' | 'running' | 'paused' | 'stopped';

export interface AttendanceRecord {
  id: string;
  hashedMac: string;
  connectionTime: string;
  sessionDuration: string;
  apTransitions: number;
  status: AttendanceStatus;
  anomalyScore: number;
  lastSeen: string;
  location?: string;
  deviceInfo?: string;
}

export interface AnomalyRecord {
  id: string;
  hashedMac: string;
  anomalyType: AnomalyType;
  anomalyScore: number;
  timestamp: string;
  status: AnomalyStatus;
  autoDetected: boolean;
  explanation?: string;
  details?: Record<string, any>;
}

export interface ActivityItem {
  id: string;
  type: 'login' | 'logout' | 'anomaly' | 'normal';
  studentId: string;
  studentName: string;
  timestamp: string;
  location?: string;
  details?: string;
}

export interface DashboardStats {
  totalPresent: number;
  anomaliesDetected: number;
  activeDevices: number;
  sessionDuration: string;
}

export interface FilterOptions {
  dateRange?: string;
  sessionId?: string;
  anomalyStatus?: string;
  searchQuery?: string;
  classFilter?: string;
}

export interface ExportConfig {
  format: 'csv' | 'pdf' | 'json';
  dateRange: string;
  includeAnomalies: boolean;
  selectedRecords?: string[];
}
