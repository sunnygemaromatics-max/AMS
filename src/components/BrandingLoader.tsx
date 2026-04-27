import { useEffect } from "react";
import { useOrgSettings } from "@/hooks/useSupabaseData";
import { setPdfBranding } from "@/lib/pdf";

/** Loads org branding once authenticated and pushes it into the PDF generator. */
export function BrandingLoader() {
  const { data } = useOrgSettings();
  useEffect(() => {
    if (data) setPdfBranding(data);
  }, [data]);
  return null;
}
