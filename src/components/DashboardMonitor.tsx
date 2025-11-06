import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users } from "lucide-react";
import RecentActivity from "@/components/RecentActivity";
import RealtimeAttendanceTable from "@/components/RealtimeAttendanceTable";

interface DashboardMonitorProps {
  isLive: boolean;
  onAnomalyClick: (record: any) => void;
  onExport: () => void;
}

export const DashboardMonitor = ({ isLive, onAnomalyClick, onExport }: DashboardMonitorProps) => {
  const [activeTab, setActiveTab] = useState("attendance");

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
