import React, { useState } from "react";
import { useGetComplianceReport } from "@workspace/api-client-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function CompliancePanel() {
  const { data, isLoading } = useGetComplianceReport({
    query: { refetchInterval: 5000 },
  });
  const [downloadingReport, setDownloadingReport] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleForensicReport = async () => {
    setDownloadingReport(true);
    try {
      const res = await fetch(`${BASE}/api/report/forensic`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
      a.download = `aegisview_report_${ts}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ } finally {
      setDownloadingReport(false);
    }
  };

  if (isLoading && !data) {
    return <div className="p-4"><Skeleton className="h-32 w-full opacity-20" /></div>;
  }

  const rules = data?.all_rules || [];

  const getRiskColor = (rating: string) => {
    if (rating === "PASS") return "text-success bg-success/10 border-success/20";
    if (rating === "WARN") return "text-warning bg-warning/10 border-warning/20";
    return "text-destructive bg-destructive/10 border-destructive/20 animate-pulse";
  };

  const getRiskIcon = (rating: string) => {
    if (rating === "PASS") return <ShieldCheck className="w-4 h-4 mr-2" />;
    if (rating === "WARN") return <AlertTriangle className="w-4 h-4 mr-2" />;
    return <ShieldAlert className="w-4 h-4 mr-2" />;
  };

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Compliance Audit</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleForensicReport}
          disabled={downloadingReport}
          className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
        >
          {downloadingReport ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <FileText className="w-3 h-3 mr-1.5" />
          )}
          Forensic Report
        </Button>
      </div>

      <div className={`mb-4 flex items-center justify-center p-3 rounded border ${getRiskColor(data?.risk_rating || "PASS")}`}>
        {getRiskIcon(data?.risk_rating || "PASS")}
        <span className="font-bold tracking-widest uppercase">RISK LEVEL: {data?.risk_rating || "UNKNOWN"}</span>
      </div>

      <div className="flex-1 overflow-auto pr-2">
        <Accordion type="single" collapsible className="w-full space-y-2">
          {rules.map((rule) => (
            <AccordionItem
              key={rule.id}
              value={rule.id}
              className={`border px-3 rounded-md bg-card/50 ${rule.triggered ? "border-l-4 border-l-destructive border-t-border border-r-border border-b-border" : "border-border"}`}
            >
              <AccordionTrigger className="hover:no-underline py-3 text-sm">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-[10px] rounded-sm ${rule.framework === "PCI-DSS" ? "text-[#ff6b35] border-[#ff6b35]/30" : "text-primary border-primary/30"}`}>
                      {rule.framework}
                    </Badge>
                    <span className="font-mono font-bold text-foreground">{rule.id}</span>
                  </div>
                  {rule.triggered ? (
                    <Badge variant="destructive" className="h-5 text-[10px] rounded-sm">FAIL</Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success hover:bg-success/10 border-success/20 h-5 text-[10px] rounded-sm">PASS</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground font-mono space-y-2 pb-3">
                <p>{rule.description}</p>
                {rule.triggered && rule.evidence && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive-foreground">
                    <span className="font-bold uppercase block mb-1 text-[10px] opacity-70">Evidence</span>
                    {rule.evidence}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
