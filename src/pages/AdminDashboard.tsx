import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import DashboardStats from "@/components/DashboardStats";
import RecentActivity from "@/components/RecentActivity";
import AttendanceReport from "@/components/AttendanceReport";
import ScheduleManagement from "@/components/ScheduleManagement";
import AnomalyLogs from "@/components/AnomalyLogs";
import SettingsPage from "@/components/SettingsPage";
import AttendanceTable from "@/components/AttendanceTable";
import AnomalyModal from "@/components/AnomalyModal";
import CaptureControls from "@/components/CaptureControls";
import RealtimeAttendanceTable from "@/components/RealtimeAttendanceTable";
import AnomalyDrilldownModal from "@/components/AnomalyDrilldownModal";
import ExportManager from "@/components/ExportManager";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard, SkeletonTable, SkeletonChart } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  Download,
  TrendingUp,
  Filter,
  FileText,
  Printer
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { DeviceRegistration } from "@/components/DeviceRegistration";

const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  console.log("Current view:", currentView); // Debug log
  
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.altKey) {
        const views = ["dashboard", "attendance", "schedule", "anomaly", "settings"];
        const key = parseInt(e.key);
        if (key >= 1 && key <= 5) {
          e.preventDefault();
          const targetView = views[key - 1];
          if (profile?.role === "lecturer" && targetView === "settings") {
            return; // Lecturers don't have settings access
          }
          setCurrentView(targetView);
          
          // Announce to screen readers
          const messages = {
            dashboard: "Navigated to Live Dashboard",
            attendance: "Navigated to Attendance Report",
            schedule: "Navigated to Schedule Management",
            anomaly: "Navigated to Anomaly Logs",
            settings: "Navigated to System Settings"
          };
          toast({
            title: messages[targetView as keyof typeof messages],
            description: `Using keyboard shortcut Alt+${key}`,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [profile?.role, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of the system.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleViewChange = (view: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsTransitioning(false);
    }, 150);
  };

  // Sample enhanced data
  const attendanceData = [
    { 
      id: "1",
      hashedMac: "a1b2c3d4e5f6789012345",
      connectionTime: "09:15 AM", 
      sessionDuration: "45 min",
      apTransitions: 3,
      status: "present" as const,
      anomalyScore: 0.15,
      lastSeen: "2 sec ago"
    },
    { 
      id: "2",
      hashedMac: "f6e5d4c3b2a1987654321",
      connectionTime: "09:12 AM",
      sessionDuration: "48 min",
      apTransitions: 2,
      status: "present" as const,
      anomalyScore: 0.08,
      lastSeen: "5 sec ago"
    },
    { 
      id: "3",
      hashedMac: "1a2b3c4d5e6f098765432",
      connectionTime: "09:18 AM",
      sessionDuration: "42 min",
      apTransitions: 8,
      status: "flagged" as const,
      anomalyScore: 0.87,
      lastSeen: "1 min ago"
    }
  ];

  const anomalies = [
    { 
      id: "1",
      hashedMac: "1a2b3c4d5e6f098765432",
      anomalyType: "erratic_ap_switching",
      anomalyScore: 0.87,
      timestamp: new Date().toISOString(),
      status: "pending" as const,
      autoDetected: true
    },
    { 
      id: "2",
      hashedMac: "7h8i9j0k1l2m345678901",
      anomalyType: "proxy_attempt",
      anomalyScore: 0.92,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: "pending" as const,
      autoDetected: true
    }
  ];

  const sampleAnomalyAlert = {
    id: "alert_1",
    studentMacHash: "1a2b3c4d5e6f098765432",
    anomalyScore: 0.87,
    anomalyType: "erratic_ap_switching",
    timestamp: new Date().toISOString(),
    explanation: "The device has switched between access points 8 times in 42 minutes, which is significantly higher than typical patterns. This could indicate proxy usage or device sharing.",
    details: {
      duration: "42 minutes",
      apSwitches: 8,
      suspiciousPatterns: [
        "Rapid AP switching every 5-7 minutes",
        "Consistent signal strength variations",
        "Unusual connection timing patterns"
      ]
    }
  };

  const toggleSession = () => {
    setSessionActive(!sessionActive);
  };

  const handleAnomalyReview = (id: string, action: 'normal' | 'confirmed') => {
    console.log(`Anomaly ${id} marked as ${action}`);
    // API call would go here
  };

  const handleAnomalyAction = (action: 'acknowledge' | 'mark_normal' | 'flag_review', anomalyId: string) => {
    console.log(`Anomaly ${anomalyId} action: ${action}`);
    // API call would go here
  };

  const triggerAnomalyAlert = () => {
    setSelectedAnomaly(sampleAnomalyAlert);
    setIsAnomalyModalOpen(true);
  };

  const renderDashboardView = () => {
    if (isLoading) {
      return (
        <div className="space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonTable />
        </div>
      );
    }

    return (
      <div className="space-y-6 lg:space-y-8 animate-fade-in">
        <DashboardStats isLive={sessionActive} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-6">
            <RecentActivity />
          </div>
          <div className="space-y-6">
            <CaptureControls onCaptureStateChange={(state) => setSessionActive(state === 'running')} />
          </div>
        </div>
        
        <RealtimeAttendanceTable 
          isLive={sessionActive}
          onAnomalyClick={(record) => {
            setSelectedRecord(record);
            setIsDrilldownOpen(true);
          }}
          onExport={() => handleViewChange("export")}
        />
      </div>
    );
  };

  const renderAttendanceView = () => {
    if (isLoading) {
      return <SkeletonTable />;
    }
    return <AttendanceReport />;
  };

  const renderScheduleView = () => {
    if (isLoading) {
      return <SkeletonTable />;
    }
    return <ScheduleManagement />;
  };

  const renderAnomalyView = () => {
    if (isLoading) {
      return <SkeletonTable />;
    }
    return <AnomalyLogs />;
  };

  const renderSettingsView = () => (
    <SettingsPage />
  );

  const renderExportView = () => (
    <ExportManager onExport={(config) => console.log('Export config:', config)} />
  );

  const renderDevicesView = () => (
    <DeviceRegistration />
  );

  const renderReportsView = () => (
    <div className="space-y-6 lg:space-y-8">
      {/* Filter Section */}
      <Card className="dashboard-card-interactive animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <span>Report Filters</span>
          </CardTitle>
          <CardDescription>Configure parameters for attendance reports and analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select>
                <SelectTrigger className="focus-university">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Session ID</label>
              <Input placeholder="Enter session ID" className="focus-university" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Anomaly Status</label>
              <Select>
                <SelectTrigger className="focus-university">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="normal">Normal Only</SelectItem>
                  <SelectItem value="flagged">Flagged Only</SelectItem>
                  <SelectItem value="reviewed">Reviewed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1 button-bounce hover-glow">
                  <FileText className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" className="flex-1 button-bounce hover-glow">
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Attendance Analytics</span>
            </CardTitle>
            <CardDescription>Historical performance and trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Weekly Attendance Rate</span>
                <span className="font-medium text-success">94%</span>
              </div>
              <Progress value={94} className="h-3" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Anomaly Detection Rate</span>
                <span className="font-medium text-warning">7%</span>
              </div>
              <Progress value={7} className="h-3" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>False Positive Rate</span>
                <span className="font-medium text-success">2%</span>
              </div>
              <Progress value={2} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span>Security Insights</span>
            </CardTitle>
            <CardDescription>AI-powered threat detection summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                <div>
                  <div className="font-medium text-success">Proxy Attempts Blocked</div>
                  <div className="text-sm text-muted-foreground">Last 7 days</div>
                </div>
                <div className="text-2xl font-bold text-success">3</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div>
                  <div className="font-medium text-warning">Suspicious Patterns</div>
                  <div className="text-sm text-muted-foreground">Under review</div>
                </div>
                <div className="text-2xl font-bold text-warning">12</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div>
                  <div className="font-medium text-primary">Total Sessions</div>
                  <div className="text-sm text-muted-foreground">This month</div>
                </div>
                <div className="text-2xl font-bold text-primary">127</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Records Table */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Detailed Attendance Records</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Print Report</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <Button variant="university" size="sm" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export Selected</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTable 
            data={attendanceData}
            onViewDetails={(record) => console.log('View details:', record)}
            isLive={false}
          />
        </CardContent>
      </Card>
    </div>
  );


  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard": return "Live Dashboard";
      case "attendance": return "Attendance Report";
      case "schedule": return "Schedule Management";
      case "anomaly": return "Anomaly Logs";
      case "devices": return "Device Registration";
      case "settings": return "System Settings";
      default: return "Dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation 
        role={profile?.role || "admin"} 
        currentView={currentView} 
        onViewChange={handleViewChange}
        anomalyCount={anomalies.filter(a => a.status === 'pending').length}
        onLogout={handleSignOut}
      />
      
      <DashboardLayout
        currentView={currentView}
        viewTitle={getViewTitle()}
        profile={profile}
        sessionActive={sessionActive}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearNotification={clearNotification}
        onClearAll={clearAll}
        onSignOut={handleSignOut}
        onViewChange={handleViewChange}
      >
        <div className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {currentView === "dashboard" && renderDashboardView()}
          {currentView === "attendance" && renderAttendanceView()}
          {currentView === "schedule" && renderScheduleView()}
          {currentView === "anomaly" && renderAnomalyView()}
          {currentView === "devices" && renderDevicesView()}
          {currentView === "settings" && renderSettingsView()}
        </div>
      </DashboardLayout>

      <AnomalyDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        record={selectedRecord}
        onMarkFalsePositive={(id, reason) => console.log('False positive:', id, reason)}
        onSendForReview={(id, notes) => console.log('Send for review:', id, notes)}
      />

      <AnomalyModal
        isOpen={isAnomalyModalOpen}
        onClose={() => setIsAnomalyModalOpen(false)}
        anomaly={selectedAnomaly}
        onAction={handleAnomalyAction}
      />
    </div>
  );
};

export default AdminDashboard;