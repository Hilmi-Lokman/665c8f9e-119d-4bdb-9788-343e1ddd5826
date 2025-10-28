import { Bell, X, Check, AlertTriangle, Shield, Activity, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Notification, NotificationSeverity, NotificationCategory } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/utils/validation';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationCenter = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onClearAll,
}: NotificationCenterProps) => {
  const getSeverityColor = (severity: NotificationSeverity): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 dark:text-red-400';
      case 'high':
        return 'text-orange-500 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'low':
        return 'text-blue-500 dark:text-blue-400';
      case 'info':
        return 'text-muted-foreground';
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'info':
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      case 'capture':
        return <Activity className="h-4 w-4" />;
      case 'attendance':
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "p-4 transition-all hover:shadow-md",
                    !notification.read && "bg-accent/50 border-l-4",
                    notification.severity === 'critical' && !notification.read && "border-l-red-500",
                    notification.severity === 'high' && !notification.read && "border-l-orange-500",
                    notification.severity === 'medium' && !notification.read && "border-l-yellow-500"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn("mt-0.5", getSeverityColor(notification.severity))}>
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold">{notification.title}</h4>
                            <Badge className={cn("text-xs", getSeverityBadge(notification.severity))}>
                              {notification.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onMarkAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => onClear(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatRelativeTime(notification.timestamp.toISOString())}</span>
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                      </div>
                      {notification.actionLabel && notification.onAction && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={notification.onAction}
                        >
                          {notification.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
