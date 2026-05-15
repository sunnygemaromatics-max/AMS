import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in ${className}`}>
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute inset-0 tsi-gradient opacity-15 blur-2xl rounded-full" />
          <div className="relative h-16 w-16 rounded-2xl tsi-gradient flex items-center justify-center shadow-lg ring-4 ring-white/40">
            <Icon className="h-7 w-7 text-white" />
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
