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
        
      {/* Main Content */}
      <main 
        id="main-content" 
        className="animated-bg min-h-[calc(100vh-4rem)]"
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
