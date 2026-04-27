import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient: 'kpi-gradient-1' | 'kpi-gradient-2' | 'kpi-gradient-3' | 'kpi-gradient-4';
}

export function KpiCard({ title, value, subtitle, icon: Icon, gradient }: KpiCardProps) {
  return (
    <div className={`${gradient} rounded-xl p-5 text-primary-foreground relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-6 -mt-6" />
      <div className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-white/5 -mr-2 -mb-2" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider opacity-80">{title}</span>
          <Icon className="h-5 w-5 opacity-70" />
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
      </div>
    </div>
  );
}
