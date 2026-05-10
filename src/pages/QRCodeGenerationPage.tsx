import { useState, useMemo, useRef } from "react";
import { useAssets } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  QrCode, 
  Printer, 
  Download,
  Loader2,
  Package,
  User,
  MapPin,
  FileText,
  CheckCircle2,
  ScanLine,
  LayoutGrid,
  List,
  X
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import QRCode from "qrcode";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface QRCodeData {
  assetId: string;
  sapCode: string;
  name: string;
  qrDataUrl: string;
  binCardNo: string;
}

export default function QRCodeGenerationPage() {
  const { data: assets, isLoading } = useAssets();
  const [search, setSearch] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [generatedQRCodes, setGeneratedQRCodes] = useState<QRCodeData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<"a4-24" | "a4-12" | "single">("a4-24");
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = (assets || []).filter((a: any) => {
    const q = search.toLowerCase();
    return !q || 
      a.sap_code?.toLowerCase().includes(q) || 
      a.employees?.name?.toLowerCase().includes(q) || 
      a.name?.toLowerCase().includes(q);
  });

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAll = () => {
    if (selectedAssets.length === filtered.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filtered.map((a: any) => a.id));
    }
  };

  const generateQRCode = async (asset: any): Promise<QRCodeData> => {
    const qrData = JSON.stringify({
      id: asset.id,
      sapCode: asset.sap_code,
      type: "asset",
      timestamp: new Date().toISOString()
    });
    
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      assetId: asset.id,
      sapCode: asset.sap_code,
      name: asset.name,
      qrDataUrl,
      binCardNo: asset.bin_card_no
    };
  };

  const handleGenerateSelected = async () => {
    if (selectedAssets.length === 0) {
      toast({ title: "No assets selected", description: "Please select at least one asset", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    const selected = (assets || []).filter((a: any) => selectedAssets.includes(a.id));
    
    try {
      const qrCodes: QRCodeData[] = [];
      for (const asset of selected) {
        const qrData = await generateQRCode(asset);
        qrCodes.push(qrData);
      }
      setGeneratedQRCodes(qrCodes);
      toast({ title: "QR Codes Generated", description: `${qrCodes.length} QR codes generated successfully` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate QR codes", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const qrCodes: QRCodeData[] = [];
      for (const asset of (assets || [])) {
        const qrData = await generateQRCode(asset);
        qrCodes.push(qrData);
      }
      setGeneratedQRCodes(qrCodes);
      toast({ title: "QR Codes Generated", description: `${qrCodes.length} QR codes generated for all assets` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate QR codes", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Codes - Asset Harmony</title>
            <style>
              @page { size: A4; margin: 10mm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
              .print-container { display: grid; gap: 10mm; padding: 10mm; }
              .qr-item { 
                border: 1px solid #ddd; 
                padding: 8mm; 
                text-align: center;
                page-break-inside: avoid;
              }
              .qr-item img { max-width: 100%; height: auto; }
              .qr-info { margin-top: 5mm; font-size: 10pt; }
              .qr-sap { font-weight: bold; font-family: monospace; color: #0066cc; }
              .qr-name { font-size: 9pt; margin-top: 2mm; }
              .qr-bincard { font-size: 8pt; color: #666; margin-top: 1mm; }
              .format-24 { grid-template-columns: repeat(4, 1fr); }
              .format-12 { grid-template-columns: repeat(3, 1fr); }
              .format-single { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="print-container format-${printFormat.replace("-", "-")}">
              ${generatedQRCodes.map(qr => `
                <div class="qr-item">
                  <img src="${qr.qrDataUrl}" alt="QR Code" />
                  <div class="qr-info">
                    <div class="qr-sap">${qr.sapCode}</div>
                    <div class="qr-name">${qr.name}</div>
                    <div class="qr-bincard">Bin Card #${qr.binCardNo}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadAll = async () => {
    if (generatedQRCodes.length === 0) {
      toast({ title: "No QR codes", description: "Generate QR codes first", variant: "destructive" });
      return;
    }

    // Create a zip file with all QR codes
    const JSZip = await import("jszip");
    const zip = new JSZip.default();
    
    generatedQRCodes.forEach((qr, index) => {
      const base64Data = qr.qrDataUrl.replace(/^data:image\/png;base64,/, "");
      zip.file(`${qr.sapCode}_qr.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `qr_codes_${new Date().toISOString().split("T")[0]}.zip`;
    link.click();
    
    toast({ title: "Downloaded", description: `${generatedQRCodes.length} QR codes downloaded as ZIP` });
  };

  const handleDownloadSingle = (qr: QRCodeData) => {
    const link = document.createElement("a");
    link.href = qr.qrDataUrl;
    link.download = `${qr.sapCode}_qr.png`;
    link.click();
    toast({ title: "Downloaded", description: `QR code for ${qr.sapCode} downloaded` });
  };

  const showQRPreview = async (asset: any) => {
    setPreviewAsset(asset);
    const qr = await generateQRCode(asset);
    setPreviewAsset({ ...asset, qrDataUrl: qr.qrDataUrl });
    setShowPreview(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6 text-accent" />
            QR Code Generation
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate and print QR codes for asset tracking
          </p>
        </div>
        <div className="flex gap-2">
          {generatedQRCodes.length > 0 && (
            <>
              <Select value={printFormat} onValueChange={(v: any) => setPrintFormat(v)}>
                <SelectTrigger className="w-[140px]">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  {printFormat === "a4-24" ? "24 per page" : printFormat === "a4-12" ? "12 per page" : "Single"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4-24">24 per page (A4)</SelectItem>
                  <SelectItem value="a4-12">12 per page (A4)</SelectItem>
                  <SelectItem value="single">Single large</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <QrCode className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Generate QR Codes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleGenerateSelected} disabled={selectedAssets.length === 0}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Selected ({selectedAssets.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateAll}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                All Assets ({assets?.length || 0})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      {generatedQRCodes.length > 0 && (
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{generatedQRCodes.length}</p>
                  <p className="text-sm text-muted-foreground">QR codes generated</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="font-semibold">{selectedAssets.length}</p>
                  <p className="text-muted-foreground">Selected</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{assets?.length || 0}</p>
                  <p className="text-muted-foreground">Total Assets</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  Select Assets
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search assets..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      className="pl-9 w-[250px]" 
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedAssets.length === filtered.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {filtered.length} assets found • {selectedAssets.length} selected
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filtered.map((asset: any) => (
                  <div
                    key={asset.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedAssets.includes(asset.id) 
                        ? 'border-accent bg-accent/5' 
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <Checkbox 
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => toggleAssetSelection(asset.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-accent font-semibold">{asset.sap_code}</span>
                        <Badge variant="outline" className="text-xs">#{asset.bin_card_no}</Badge>
                        <StatusBadge status={statusLabel(asset.status)} />
                      </div>
                      <p className="font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <User className="h-3 w-3" /> {asset.employees?.name || 'Unassigned'}
                        <MapPin className="h-3 w-3 ml-2" /> {asset.locations?.name || '—'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => showQRPreview(asset)}
                    >
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No assets found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generated QR Codes Preview */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5 text-accent" />
                Generated QR Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : generatedQRCodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <QrCode className="h-16 w-16 mb-4 opacity-30" />
                  <p>No QR codes generated yet</p>
                  <p className="text-sm">Select assets and click Generate</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {generatedQRCodes.map((qr) => (
                    <div key={qr.assetId} className="flex items-center gap-3 p-2 rounded-lg border">
                      <img src={qr.qrDataUrl} alt={qr.sapCode} className="w-16 h-16 object-contain" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-accent font-semibold">{qr.sapCode}</p>
                        <p className="text-xs truncate">{qr.name}</p>
                        <p className="text-xs text-muted-foreground">#{qr.binCardNo}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadSingle(qr)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Preview
            </DialogTitle>
          </DialogHeader>
          {previewAsset && (
            <div className="flex flex-col items-center space-y-4 py-4">
              {previewAsset.qrDataUrl ? (
                <>
                  <img 
                    src={previewAsset.qrDataUrl} 
                    alt="QR Code" 
                    className="w-64 h-64 object-contain border rounded-lg p-2"
                  />
                  <div className="text-center">
                    <p className="font-mono text-lg text-accent font-bold">{previewAsset.sap_code}</p>
                    <p className="font-medium">{previewAsset.name}</p>
                    <p className="text-sm text-muted-foreground">Bin Card #{previewAsset.bin_card_no}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      const link = document.createElement("a");
                      link.href = previewAsset.qrDataUrl;
                      link.download = `${previewAsset.sap_code}_qr.png`;
                      link.click();
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </>
              ) : (
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden print container */}
      <div ref={printRef} className="hidden" />
    </div>
  );
}
