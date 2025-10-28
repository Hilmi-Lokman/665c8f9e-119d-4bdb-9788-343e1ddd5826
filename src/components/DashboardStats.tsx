import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";

interface DashboardStatsProps {
  isLive?: boolean;
}

interface Stats {
  totalOnline: number;
  anomaliesDetected: number;
  classesToday: number;
  attendanceRate: number;
}

const DashboardStats = ({ isLive = false }: DashboardStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalOnline: 0,
    anomaliesDetected: 0,
    classesToday: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get attendance records
        const { data: attendanceRecords, error } = await supabase
          .from('attendance_records')
          .select('*');

        if (error) throw error;

        const total = attendanceRecords?.length || 0;
        const anomalies = attendanceRecords?.filter(r => r.anomaly_flag).length || 0;
        const present = attendanceRecords?.filter(r => r.status === 'present').length || 0;
        
        // Get unique classes
        const uniqueClasses = new Set(attendanceRecords?.map(r => r.class_name).filter(Boolean));
        
        setStats({
          totalOnline: total,
          anomaliesDetected: anomalies,
          classesToday: uniqueClasses.size,
          attendanceRate: total > 0 ? (present / total) * 100 : 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('attendance-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      <Card className="dashboard-card-interactive hover-glow group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Students Online</CardTitle>
          <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-200" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.totalOnline}</div>
          <p className="text-xs text-muted-foreground">
            Total students tracked
          </p>
          {isLive && (
            <Badge variant="outline" className="mt-2 text-xs pulse-live border-success text-success">
              <div className="w-2 h-2 bg-success rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card className="dashboard-card-interactive hover-glow group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning group-hover:animate-bounce-subtle transition-all duration-200" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.anomaliesDetected}</div>
          <p className="text-xs text-muted-foreground">
            Flagged for review
          </p>
          {stats.anomaliesDetected > 0 && (
            <Badge variant="destructive" className="mt-2 text-xs animate-pulse">
              Action Required
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card className="dashboard-card-interactive hover-glow group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Classes Today</CardTitle>
          <Calendar className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-200" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.classesToday}</div>
          <p className="text-xs text-muted-foreground">
            Unique classes tracked
          </p>
        </CardContent>
      </Card>

      <Card className="dashboard-card-interactive hover-glow group gradient-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-success group-hover:scale-110 transition-transform duration-200" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold gradient-text">{stats.attendanceRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            Present rate
          </p>
          {stats.attendanceRate >= 90 && (
            <Badge variant="outline" className="mt-2 text-xs bg-success-light border-success text-success">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Excellent
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;