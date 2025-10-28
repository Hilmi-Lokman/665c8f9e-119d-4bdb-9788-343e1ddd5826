import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type NotificationCategory = 'anomaly' | 'security' | 'system' | 'capture' | 'attendance';

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
  metadata?: Record<string, any>;
}

interface NotificationThresholds {
  critical: number;
  high: number;
  medium: number;
}

const DEFAULT_THRESHOLDS: NotificationThresholds = {
  critical: 0.9,
  high: 0.75,
  medium: 0.5,
};

export const useNotifications = (thresholds: NotificationThresholds = DEFAULT_THRESHOLDS) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const getSeverityFromScore = useCallback((score: number): NotificationSeverity => {
    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }, [thresholds]);

  const getToastVariant = (severity: NotificationSeverity): 'default' | 'destructive' => {
    return severity === 'critical' || severity === 'high' ? 'destructive' : 'default';
  };

  const notify = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep last 100

    // Show toast for critical and high severity
    if (notification.severity === 'critical' || notification.severity === 'high') {
      toast({
        title: `${notification.severity === 'critical' ? '🚨' : '⚠️'} ${notification.title}`,
        description: notification.message,
        variant: getToastVariant(notification.severity),
        duration: notification.severity === 'critical' ? 10000 : 5000,
      });
    }

    return newNotification.id;
  }, []);

  const notifyAnomaly = useCallback((
    anomalyType: string,
    score: number,
    hashedMac: string,
    details?: Record<string, any>
  ) => {
    const severity = getSeverityFromScore(score);
    const isCritical = severity === 'critical';

    const messages: Record<string, string> = {
      erratic_ap_switching: `Detected unusual AP switching pattern (${(score * 100).toFixed(0)}% confidence)`,
      proxy_attempt: `Potential proxy/VPN usage detected (${(score * 100).toFixed(0)}% confidence)`,
      unusual_duration: `Unusual session duration detected (${(score * 100).toFixed(0)}% confidence)`,
      short_session: `Suspiciously short session detected (${(score * 100).toFixed(0)}% confidence)`,
      spoofing: `Possible MAC address spoofing detected (${(score * 100).toFixed(0)}% confidence)`,
    };

    return notify({
      title: isCritical ? 'Critical Security Alert' : 'Anomaly Detected',
      message: messages[anomalyType] || `Anomaly detected: ${anomalyType}`,
      severity,
      category: 'anomaly',
      metadata: { anomalyType, score, hashedMac, ...details },
    });
  }, [notify, getSeverityFromScore]);

  const notifyBatch = useCallback((
    count: number,
    category: NotificationCategory,
    summary: string
  ) => {
    return notify({
      title: `${count} New ${category.charAt(0).toUpperCase() + category.slice(1)} Issues`,
      message: summary,
      severity: count > 5 ? 'high' : 'medium',
      category,
    });
  }, [notify]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getNotificationsByCategory = useCallback((category: NotificationCategory) => {
    return notifications.filter(n => n.category === category);
  }, [notifications]);

  const getCriticalNotifications = useCallback(() => {
    return notifications.filter(n => n.severity === 'critical' && !n.read);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    notify,
    notifyAnomaly,
    notifyBatch,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    getNotificationsByCategory,
    getCriticalNotifications,
  };
};
