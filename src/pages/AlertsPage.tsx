import { useTranslation } from "react-i18next";
import { AlertsPanel } from "@/components/AlertsPanel";

export default function AlertsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="tsi-gradient-text">{t("nav.alerts")}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("alerts.subtitle", { days: 60 })}
        </p>
      </div>
      <AlertsPanel windowDays={60} />
    </div>
  );
}
