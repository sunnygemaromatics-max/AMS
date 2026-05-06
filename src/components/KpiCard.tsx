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
    <div
      className={`${gradient} rounded-2xl p-6 text-white relative overflow-hidden hover-lift animate-fade-in-up cursor-default group`}
      style={{ boxShadow: "0 10px 30px hsl(265 55% 50% / 0.15)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full bg-white/5 -mr-2 -mb-2 transition-transform duration-700 group-hover:scale-125" />
      <div className="absolute -bottom-8 -left-6 w-24 h-24 rounded-full bg-white/5 blur-xl" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/85">{title}</span>
          <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 transition-all duration-300 group-hover:bg-white/25 group-hover:scale-110">
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs mt-1.5 text-white/75">{subtitle}</p>}
      </div>
    </div>
  );
}
