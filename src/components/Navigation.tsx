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
  ChevronLeft,
  ChevronRight,
  Smartphone
} from "lucide-react";
import { useState } from "react";

interface NavigationProps {
  role: "admin" | "lecturer";
  currentView: string;
  onViewChange: (view: string) => void;
  anomalyCount?: number;
  onLogout: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

const Navigation = ({ role, currentView, onViewChange, anomalyCount = 0, onLogout, onCollapseChange }: NavigationProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };
  
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
      className={cn(
        "h-full bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="p-6 border-b border-border bg-gradient-primary relative" role="banner">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm transition-transform hover:scale-110 duration-300">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white">EduAttend Pro</h2>
              <p className="text-sm text-white/80 capitalize">{role} Dashboard</p>
            </div>
          )}
        </div>
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-300 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Anomaly Alert Bar */}
      {anomalyCount > 0 && (
        <div 
          className="p-4 bg-warning-light border-b border-warning animate-pulse"
          role="alert"
          aria-live="polite"
          aria-label={`${anomalyCount} active security alert${anomalyCount > 1 ? 's' : ''}`}
        >
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning animate-bounce" aria-hidden="true" />
                  <span className="text-sm font-medium text-warning-foreground">
                    {anomalyCount} Active Alert{anomalyCount > 1 ? 's' : ''}
                  </span>
                </div>
                <Badge variant="destructive" className="text-xs" aria-hidden="true">
                  {anomalyCount}
                </Badge>
              </>
            ) : (
              <div className="relative">
                <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs" aria-hidden="true">
                  {anomalyCount}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto" role="menu" aria-label="Dashboard sections">
        {navItems.map((item, index) => {
          const isActive = currentView === item.id;
          const shortcutKey = index + 1;
          return (
            <Button
              key={item.id}
              variant={isActive ? "university" : "ghost"}
              className={cn(
                "w-full h-12 transition-all duration-300 group relative overflow-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isCollapsed ? "justify-center px-0" : "justify-start px-4",
                isActive ? 
                  "bg-primary text-primary-foreground shadow-elegant hover:shadow-glow" : 
                  "hover:bg-accent/50 hover:text-accent-foreground hover:translate-x-1"
              )}
              onClick={() => onViewChange(item.id)}
              role="menuitem"
              aria-label={`${item.label}${item.id === "anomaly" && anomalyCount > 0 ? `, ${anomalyCount} alerts` : ''}, keyboard shortcut Alt+${shortcutKey}`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active Indicator */}
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-0 h-full w-1 bg-primary-glow animate-pulse" />
              )}
              
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                isCollapsed ? "" : "mr-3"
              )} aria-hidden="true" />
              
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "anomaly" && anomalyCount > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs animate-bounce" aria-label={`${anomalyCount} alerts`}>
                      {anomalyCount}
                    </Badge>
                  )}
                </>
              )}
              
              {/* Collapsed Badge */}
              {isCollapsed && item.id === "anomaly" && anomalyCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs" aria-label={`${anomalyCount} alerts`}>
                  {anomalyCount}
                </Badge>
              )}
              
              {/* Keyboard shortcut hint - screen reader only */}
              <span className="sr-only">Press Alt+{shortcutKey} to access</span>
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30" role="contentinfo">
        <Button 
          variant="outline" 
          className={cn(
            "w-full h-12 border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover:scale-105 group focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isCollapsed ? "justify-center px-0" : "justify-start px-4"
          )}
          onClick={onLogout}
          aria-label="Sign out of your account"
        >
          <LogOut className={cn(
            "h-4 w-4 transition-transform duration-300 group-hover:rotate-12",
            isCollapsed ? "" : "mr-3"
          )} aria-hidden="true" />
          {!isCollapsed && <span>Secure Logout</span>}
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;