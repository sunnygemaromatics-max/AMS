import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, History, Upload } from "lucide-react";
import BulkImportPage from "@/pages/BulkImportPage";
import ImportHistoryPage from "@/pages/ImportHistoryPage";

export default function ImportPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "history" ? "history" : "upload";

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-7 w-7" /> {t("nav.import")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload ZIP / Excel / CSV files, or browse past runs with rollback.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList className="bg-card border border-border/60 p-1 h-auto">
          <TabsTrigger value="upload" className="gap-2 px-4">
            <Upload className="h-3.5 w-3.5" /> Upload
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 px-4">
            <History className="h-3.5 w-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-5 focus-visible:outline-none">
          <BulkImportPage embedded />
        </TabsContent>
        <TabsContent value="history" className="mt-5 focus-visible:outline-none">
          <ImportHistoryPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
