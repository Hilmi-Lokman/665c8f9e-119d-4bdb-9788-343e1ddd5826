import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, Wifi, Clock, AlertTriangle } from "lucide-react";
import RecentActivity from "@/components/RecentActivity";
import RealtimeAttendanceTable from "@/components/RealtimeAttendanceTable";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMonitorProps {
  isLive: boolean;
  onAnomalyClick: (record: any) => void;
  onExport: () => void;
}

export const DashboardMonitor = ({ isLive, onAnomalyClick, onExport }: DashboardMonitorProps) => {
  const [activeTab, setActiveTab] = useState("attendance");
  const [stats, setStats] = useState({
    devicesOnline: 0,
    avgSessionDuration: "0m",
    anomalyRate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Get total devices online (active records)
      const { count: devicesCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'present');

      // Get average session duration
      const { data: durationData } = await supabase
        .from('attendance_records')
        .select('duration_seconds');
      
      const avgDuration = durationData && durationData.length > 0
        ? Math.round(durationData.reduce((acc, r) => acc + (r.duration_seconds || 0), 0) / durationData.length / 60)
        : 0;

      // Get anomaly detection rate
      const { count: totalCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true });
      
      const { count: anomalyCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('anomaly_flag', true);

      const rate = totalCount && totalCount > 0 
        ? Math.round((anomalyCount || 0) / totalCount * 100)
        : 0;

      setStats({
        devicesOnline: devicesCount || 0,
        avgSessionDuration: `${avgDuration}m`,
        anomalyRate: rate
      });
    };

    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('monitor-stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="dashboard-card-interactive">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          System Monitor
        </CardTitle>
        <CardDescription>Real-time attendance tracking and recent system activity</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="p-2 rounded-md bg-primary/10">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Devices Online</p>
              <p className="text-2xl font-bold text-foreground">{stats.devicesOnline}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="p-2 rounded-md bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Session</p>
              <p className="text-2xl font-bold text-foreground">{stats.avgSessionDuration}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="p-2 rounded-md bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anomaly Rate</p>
              <p className="text-2xl font-bold text-foreground">{stats.anomalyRate}%</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="attendance" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Live Attendance</span>
              <span className="sm:hidden">Live</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Recent Activity</span>
              <span className="sm:hidden">Activity</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="attendance" className="mt-0">
            <RealtimeAttendanceTable 
              isLive={isLive}
              onAnomalyClick={onAnomalyClick}
              onExport={onExport}
            />
          </TabsContent>
          
          <TabsContent value="activity" className="mt-0">
            <RecentActivity />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
