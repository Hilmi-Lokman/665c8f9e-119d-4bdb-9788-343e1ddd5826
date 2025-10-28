import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { 
  Activity,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";

interface RecentActivityProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
}

const RecentActivity = ({ activities = [], isLoading: propLoading = false }: RecentActivityProps) => {
  const [localActivities, setLocalActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const { data: records, error } = await supabase
          .from('attendance_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const transformedActivities: ActivityItem[] = (records || []).map(record => {
          const getRelativeTime = (timestamp: string) => {
            const now = new Date();
            const then = new Date(timestamp);
            const diffMs = now.getTime() - then.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          };

          return {
            id: record.id,
            type: record.anomaly_flag ? 'anomaly' : 'login',
            studentId: record.matric_number || 'N/A',
            studentName: record.student_name || 'Unknown Student',
            timestamp: getRelativeTime(record.created_at),
            location: record.class_name || 'Unknown Location',
            details: record.anomaly_flag 
              ? `Anomaly detected (score: ${((record.anomaly_score || 0) * 100).toFixed(0)}%)`
              : 'Attendance recorded'
          };
        });

        setLocalActivities(transformedActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel('activity-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayActivities = activities.length > 0 ? activities : localActivities;

  const getActivityIcon = useMemo(() => (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return <LogIn className="h-4 w-4 text-success" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-muted-foreground" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'normal':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  }, []);

  const getActivityBadge = useMemo(() => (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return <Badge variant="outline" className="bg-success-light text-success">Login</Badge>;
      case 'logout':
        return <Badge variant="outline" className="bg-muted">Logout</Badge>;
      case 'anomaly':
        return <Badge variant="destructive">Alert</Badge>;
      case 'normal':
        return <Badge variant="outline" className="bg-primary-light text-primary">Normal</Badge>;
      default:
        return <Badge variant="outline">Activity</Badge>;
    }
  }, []);

  if (isLoading || propLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading activities..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>Recent Activity</span>
        </CardTitle>
        <CardDescription>
          Real-time student attendance and system events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${activity.studentName}`} />
                <AvatarFallback className="bg-primary-light text-primary text-xs">
                  {activity.studentName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  {getActivityIcon(activity.type)}
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.studentName}
                  </p>
                  {getActivityBadge(activity.type)}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {activity.studentId} • {activity.location}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.details}
                </p>
              </div>
              
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {activity.timestamp}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;