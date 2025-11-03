import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  FileText, 
  Settings,
  LogOut,
  GraduationCap,
  Activity,
  AlertTriangle,
  Smartphone
} from "lucide-react";

interface NavigationProps {
  role: "admin" | "lecturer";
  currentView: string;
  onViewChange: (view: string) => void;
  anomalyCount?: number;
  onLogout: () => void;
}

const Navigation = ({ role, currentView, onViewChange, anomalyCount = 0, onLogout }: NavigationProps) => {
  const adminNavItems = [
    { id: "dashboard", label: "Live Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance Report", icon: FileText },
    { id: "schedule", label: "Schedule Management", icon: Activity },
    { id: "devices", label: "Device Registration", icon: Smartphone },
    { id: "anomaly", label: "Anomaly Logs", icon: AlertTriangle },
    { id: "settings", label: "System Settings", icon: Settings },
  ];

  const lecturerNavItems = [
    { id: "dashboard", label: "Live Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance Report", icon: FileText },
    { id: "schedule", label: "Schedule Management", icon: Activity },
    { id: "anomaly", label: "Anomaly Logs", icon: AlertTriangle },
  ];

  const navItems = role === "admin" ? adminNavItems : lecturerNavItems;

  return (
    <nav 
      className="w-full bg-card border-b border-border z-50 sticky top-0"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 shrink-0" role="banner">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-elegant hover:scale-110 transition-transform duration-300">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-foreground">EduAttend Pro</h2>
              <p className="text-xs text-muted-foreground capitalize">{role} Dashboard</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1 flex-1 justify-center px-4" role="menu" aria-label="Dashboard sections">
            {navItems.map((item, index) => {
              const isActive = currentView === item.id;
              const shortcutKey = index + 1;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "university" : "ghost"}
                  size="sm"
                  className={cn(
                    "relative transition-all duration-300 group h-10 hidden sm:flex",
                    isActive ? 
                      "bg-primary text-primary-foreground shadow-elegant" : 
                      "hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                  onClick={() => onViewChange(item.id)}
                  role="menuitem"
                  aria-label={`${item.label}${item.id === "anomaly" && anomalyCount > 0 ? `, ${anomalyCount} alerts` : ''}, keyboard shortcut Alt+${shortcutKey}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span className="hidden lg:inline">{item.label}</span>
                  
                  {item.id === "anomaly" && anomalyCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs" aria-label={`${anomalyCount} alerts`}>
                      {anomalyCount}
                    </Badge>
                  )}
                  
                  <span className="sr-only">Press Alt+{shortcutKey} to access</span>
                </Button>
              );
            })}
          </div>

          {/* Logout Button */}
          <div className="flex items-center space-x-2 shrink-0" role="contentinfo">
            {anomalyCount > 0 && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-warning/10 border border-warning/20 rounded-lg animate-pulse">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                <span className="text-sm font-medium text-warning">{anomalyCount} Alert{anomalyCount > 1 ? 's' : ''}</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
              onClick={onLogout}
              aria-label="Sign out of your account"
            >
              <LogOut className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;