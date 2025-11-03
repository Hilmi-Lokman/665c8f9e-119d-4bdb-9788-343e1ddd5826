import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationCenter } from "@/components/NotificationCenter";

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: string;
  viewTitle: string;
  profile: any;
  sessionActive: boolean;
  notifications: any[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onViewChange: (view: string) => void;
}

export const DashboardLayout = ({
  children,
  currentView,
  viewTitle,
  profile,
  sessionActive,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClearAll,
  onSignOut,
  onViewChange,
}: DashboardLayoutProps) => {
  return (
    <div className="w-full">
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="glass-effect border-b border-border/50 shadow-header" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-4 animate-fade-in" aria-label="Page breadcrumb navigation">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  href="#" 
                  onClick={() => onViewChange("dashboard")} 
                  className="flex items-center gap-1 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
                  aria-label="Navigate to home dashboard"
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator aria-hidden="true" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">
                  {viewTitle}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* User Info & Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 animate-fade-in min-w-0" role="region" aria-label="User information">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-button hover-scale shrink-0" aria-hidden="true">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground tracking-tight truncate">
                  {profile?.full_name || profile?.email || 'User'}
                </h2>
                <p className="text-sm text-muted-foreground capitalize flex items-center gap-2 mt-0.5">
                  {profile?.role} Dashboard
                  <Badge 
                    variant={sessionActive ? "default" : "outline"} 
                    className={cn(
                      "text-xs font-semibold shrink-0",
                      sessionActive && "bg-gradient-success animate-pulse-glow"
                    )}
                    aria-label={sessionActive ? "Session is currently active" : "Session is offline"}
                  >
                    <span aria-hidden="true">{sessionActive ? '🔴 Live' : 'Offline'}</span>
                  </Badge>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 animate-fade-in shrink-0" role="region" aria-label="Dashboard actions">
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={onMarkAsRead}
                onMarkAllAsRead={onMarkAllAsRead}
                onClear={onClearNotification}
                onClearAll={onClearAll}
              />
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSignOut}
                className="button-bounce hover-glow focus-university font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hidden lg:flex"
                aria-label="Sign out of your account"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
        
      {/* Main Content */}
      <main 
        id="main-content" 
        className="animated-bg min-h-[calc(100vh-12rem)]"
        role="main"
        aria-label="Dashboard main content"
        tabIndex={-1}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};
