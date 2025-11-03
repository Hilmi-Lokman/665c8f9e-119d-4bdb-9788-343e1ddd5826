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

interface ExtendedNavigationProps extends NavigationProps {
  profile?: any;
  sessionActive?: boolean;
  notifications?: any[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearNotification?: (id: string) => void;
  onClearAll?: () => void;
}

const Navigation = ({ 
  role, 
  currentView, 
  onViewChange, 
  anomalyCount = 0, 
  onLogout,
  profile,
  sessionActive,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClearAll
}: ExtendedNavigationProps) => {
  const adminNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: FileText },
    { id: "schedule", label: "Schedule", icon: Activity },
    { id: "devices", label: "Devices", icon: Smartphone },
    { id: "anomaly", label: "Anomaly", icon: AlertTriangle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const lecturerNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: FileText },
    { id: "schedule", label: "Schedule", icon: Activity },
    { id: "anomaly", label: "Anomaly", icon: AlertTriangle },
  ];

  const navItems = role === "admin" ? adminNavItems : lecturerNavItems;

  return (
    <nav 
      className="w-full bg-card border-b border-border z-50 sticky top-0 glass-effect"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 shrink-0" role="banner">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-elegant hover:scale-110 transition-transform duration-300">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden lg:block">
              <h2 className="text-sm font-bold text-foreground">EduAttend Pro</h2>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1 flex-1 justify-center" role="menu" aria-label="Dashboard sections">
            {navItems.map((item, index) => {
              const isActive = currentView === item.id;
              const shortcutKey = index + 1;
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "university" : "ghost"}
                  size="sm"
                  className={cn(
                    "relative transition-all duration-300 group h-10 hidden md:flex",
                    isActive ? 
                      "bg-primary text-primary-foreground shadow-elegant" : 
                      "hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                  onClick={() => onViewChange(item.id)}
                  role="menuitem"
                  aria-label={`${item.label}${item.id === "anomaly" && anomalyCount > 0 ? `, ${anomalyCount} alerts` : ''}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4 lg:mr-2" aria-hidden="true" />
                  <span className="hidden lg:inline">{item.label}</span>
                  
                  {item.id === "anomaly" && anomalyCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs" aria-label={`${anomalyCount} alerts`}>
                      {anomalyCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {sessionActive && (
              <Badge 
                variant="default"
                className="hidden lg:flex bg-gradient-success animate-pulse-glow"
              >
                🔴 Live
              </Badge>
            )}
            {anomalyCount > 0 && (
              <div className="hidden xl:flex items-center space-x-2 px-2 py-1.5 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                <span className="text-xs font-medium text-warning">{anomalyCount}</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
              onClick={onLogout}
              aria-label="Sign out"
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