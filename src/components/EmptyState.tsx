import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) => {
  return (
    <Card className={`glass-effect border-border/50 animate-fade-in ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="p-4 bg-gradient-subtle rounded-full mb-4 animate-scale-in">
          <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="button-bounce hover-glow"
            aria-label={actionLabel}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
