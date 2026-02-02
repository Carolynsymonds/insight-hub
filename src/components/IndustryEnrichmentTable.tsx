import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Download, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  dma: string | null;
  company_industry: string | null;
  domain: string | null;
  description: string | null;
  mics_sector: string | null;
  mics_subsector: string | null;
  mics_segment: string | null;
  naics_code: string | null;
  naics_title: string | null;
  naics_confidence: number | null;
  category: string;
  scraped_data_log: {
    apollo_data?: {
      industry?: string;
      industries?: string[];
    };
  } | null;
}

interface NaicsCode {
  naics_code: string;
  mics_title: string | null;
}

interface ClayCompanyEnrichment {
  lead_id: string;
  industry_clay: string | null;
}

interface IndustryEnrichmentTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}

type FilterOption = "all" | "enriched" | "not_enriched";

interface AuditResult {
  verdict: "match" | "mismatch" | "partial";
  explanation: string;
}

export function IndustryEnrichmentTable({ leads, onEnrichComplete }: IndustryEnrichmentTableProps) {
  const [industryFilter, setIndustryFilter] = useState<FilterOption>("all");
  const [clayEnrichments, setClayEnrichments] = useState<Map<string, ClayCompanyEnrichment>>(new Map());
  const [naicsMicsTitles, setNaicsMicsTitles] = useState<Map<string, string | null>>(new Map());
  const [classifyingLeads, setClassifyingLeads] = useState<Set<string>>(new Set());
  const [isBulkClassifying, setIsBulkClassifying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [auditingLeads, setAuditingLeads] = useState<Set<string>>(new Set());
  const [auditResults, setAuditResults] = useState<Map<string, AuditResult>>(new Map());

  // Get leads that need NAICS classification
  const leadsNeedingClassification = useMemo(() => {
    return leads.filter(l => !l.naics_code);
  }, [leads]);

  const handleBulkClassify = async () => {
    if (leadsNeedingClassification.length === 0) {
      toast({
        title: "No Leads to Classify",
        description: "All leads already have NAICS codes assigned.",
      });
      return;
    }

    setIsBulkClassifying(true);
    setBulkProgress({ current: 0, total: leadsNeedingClassification.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < leadsNeedingClassification.length; i++) {
      const lead = leadsNeedingClassification[i];
      setBulkProgress({ current: i + 1, total: leadsNeedingClassification.length });
      setClassifyingLeads(prev => new Set(prev).add(lead.id));

      try {
        const response = await supabase.functions.invoke("classify-naics", {
          body: {
            leadId: lead.id,
            company: lead.company,
            industry: lead.company_industry,
            description: lead.description,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;

        if (data.error) {
          if (data.error.includes("Rate limit")) {
            toast({
              title: "Rate Limited",
              description: "Rate limits exceeded. Stopping bulk classification.",
              variant: "destructive",
            });
            break;
          } else if (data.error.includes("Payment required")) {
            toast({
              title: "Payment Required",
              description: "Payment required. Stopping bulk classification.",
              variant: "destructive",
            });
            break;
          }
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error("Classification error for lead:", lead.id, error);
        errorCount++;
      } finally {
        setClassifyingLeads(prev => {
          const next = new Set(prev);
          next.delete(lead.id);
          return next;
        });
      }
    }

    setIsBulkClassifying(false);
    setBulkProgress({ current: 0, total: 0 });

    toast({
      title: "Bulk Classification Complete",
      description: `Successfully classified ${successCount} leads. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
    });

    onEnrichComplete();
  };

  const handleClassifyNaics = async (lead: Lead) => {
    setClassifyingLeads(prev => new Set(prev).add(lead.id));
    
    try {
      const response = await supabase.functions.invoke("classify-naics", {
        body: {
          leadId: lead.id,
          company: lead.company,
          industry: lead.company_industry,
          description: lead.description,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limited",
            description: "Rate limits exceeded, please try again later.",
            variant: "destructive",
          });
        } else if (data.error.includes("Payment required")) {
          toast({
            title: "Payment Required",
            description: "Payment required, please add funds to your workspace.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({
        title: "NAICS Classified",
        description: `Classified as ${data.naics_code} with ${data.naics_confidence}% confidence`,
      });

      onEnrichComplete();
    } catch (error) {
      console.error("Classification error:", error);
      toast({
        title: "Classification Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setClassifyingLeads(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  // Fetch Clay company enrichments for all leads
  useEffect(() => {
    const fetchClayEnrichments = async () => {
      const leadIds = leads.map(l => l.id);
      if (leadIds.length === 0) return;

      const { data, error } = await supabase
        .from("clay_company_enrichment")
        .select("lead_id, industry_clay")
        .in("lead_id", leadIds);

      if (error) {
        console.error("Error fetching clay enrichments:", error);
        return;
      }

      const enrichmentMap = new Map<string, ClayCompanyEnrichment>();
      data?.forEach(enrichment => {
        enrichmentMap.set(enrichment.lead_id, enrichment);
      });
      setClayEnrichments(enrichmentMap);
    };

    fetchClayEnrichments();
  }, [leads]);

  // Fetch MICS titles from naics_codes table
  useEffect(() => {
    const fetchMicsTitles = async () => {
      const naicsCodes = leads
        .map(l => l.naics_code)
        .filter((code): code is string => !!code);
      
      if (naicsCodes.length === 0) return;

      const uniqueCodes = [...new Set(naicsCodes)];
      
      const { data, error } = await supabase
        .from("naics_codes")
        .select("naics_code, mics_title")
        .in("naics_code", uniqueCodes);

      if (error) {
        console.error("Error fetching MICS titles:", error);
        return;
      }

      const micsMap = new Map<string, string | null>();
      data?.forEach(row => {
        micsMap.set(row.naics_code, row.mics_title);
      });
      setNaicsMicsTitles(micsMap);
    };

    fetchMicsTitles();
  }, [leads]);

  // Filter leads based on selection
  // Filter leads based on selection (category filtering is handled by parent)
  const filteredLeads = useMemo(() => {
    switch (industryFilter) {
      case "enriched":
        return leads.filter(l => l.company_industry);
      case "not_enriched":
        return leads.filter(l => !l.company_industry);
      default:
        return leads;
    }
  }, [leads, industryFilter]);

  // Determine the source of industry data
  const getIndustrySource = (lead: Lead): string => {
    if (!lead.company_industry) return "-";

    const clayEnrichment = clayEnrichments.get(lead.id);
    if (clayEnrichment?.industry_clay) {
      return "Clay";
    }

    const apolloIndustry = lead.scraped_data_log?.apollo_data?.industry;
    const apolloIndustries = lead.scraped_data_log?.apollo_data?.industries;
    if (apolloIndustry || (apolloIndustries && apolloIndustries.length > 0)) {
      return "Apollo";
    }

    return "AI";
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case "Clay":
        return "default";
      case "Apollo":
        return "secondary";
      case "AI":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleAudit = async (lead: Lead) => {
    const micsForm = [lead.mics_sector, lead.mics_subsector, lead.mics_segment]
      .filter(Boolean)
      .join(" > ");
    const micsNew = lead.naics_code ? naicsMicsTitles.get(lead.naics_code) || "" : "";

    if (!micsForm && !micsNew) {
      toast({
        title: "Cannot Audit",
        description: "No MICS data available for comparison.",
        variant: "destructive",
      });
      return;
    }

    setAuditingLeads(prev => new Set(prev).add(lead.id));

    try {
      const response = await supabase.functions.invoke("audit-mics-classification", {
        body: {
          company: lead.company,
          description: lead.description,
          micsForm,
          micsNew,
          naicsCode: lead.naics_code,
          naicsTitle: lead.naics_title,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limited",
            description: "Rate limits exceeded, please try again later.",
            variant: "destructive",
          });
        } else if (data.error.includes("Payment required")) {
          toast({
            title: "Payment Required",
            description: "Payment required, please add funds to your workspace.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setAuditResults(prev => new Map(prev).set(lead.id, {
        verdict: data.verdict,
        explanation: data.explanation,
      }));

      toast({
        title: "Audit Complete",
        description: `Verdict: ${data.verdict}`,
      });
    } catch (error) {
      console.error("Audit error:", error);
      toast({
        title: "Audit Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setAuditingLeads(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  const getAuditBadgeVariant = (verdict: string) => {
    switch (verdict) {
      case "match":
        return "default";
      case "mismatch":
        return "destructive";
      case "partial":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getAuditIcon = (verdict: string) => {
    switch (verdict) {
      case "match":
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case "mismatch":
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      case "partial":
        return <HelpCircle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Name", "Phone", "Email", "Company", "DMA", 
      "Industry", "Source", "MICS (form)", "MICS (new)", 
      "NAICS Code", "NAICS Title", "Conf.", "Audit Verdict", "Audit Explanation"
    ];

    const rows = filteredLeads.map((lead) => {
      const source = getIndustrySource(lead);
      const micsForm = [lead.mics_sector, lead.mics_subsector, lead.mics_segment]
        .filter(Boolean)
        .join(" > ");
      const micsNew = lead.naics_code ? naicsMicsTitles.get(lead.naics_code) || "" : "";
      const confidence = lead.naics_confidence !== null ? `${lead.naics_confidence}%` : "";
      const auditResult = auditResults.get(lead.id);

      return [
        lead.full_name || "",
        lead.phone || "",
        lead.email || "",
        lead.company || "",
        lead.dma || "",
        lead.company_industry || "",
        source !== "-" ? source : "",
        micsForm,
        micsNew,
        lead.naics_code || "",
        lead.naics_title || "",
        confidence,
        auditResult?.verdict || "",
        auditResult?.explanation || ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `industry-enrichment-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredLeads.length} leads to CSV`
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0F0F4B]">Industry Enrichment</h2>
          <p className="text-sm text-muted-foreground">
            Enrich the industry classification for your leads using AI analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredLeads.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleBulkClassify}
            disabled={isBulkClassifying || leadsNeedingClassification.length === 0}
          >
            {isBulkClassifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Classifying {bulkProgress.current}/{bulkProgress.total}
              </>
            ) : (
              `Classify All (${leadsNeedingClassification.length})`
            )}
          </Button>
          <Select value={industryFilter} onValueChange={(value: FilterOption) => setIndustryFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="enriched">Enriched Only</SelectItem>
              <SelectItem value="not_enriched">Not Enriched</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-sm">
            {leads.filter(l => l.company_industry).length} / {leads.length} enriched
          </Badge>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[70vh]">
        <TooltipProvider>
          <Table className="min-w-[1500px]">
            <TableHeader>
              <TableRow className="bg-muted/30 sticky top-0 z-20">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold sticky left-0 bg-background z-30">Company</TableHead>
                <TableHead className="font-semibold">DMA</TableHead>
                <TableHead className="font-semibold">Industry</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold">MICS (form)</TableHead>
                <TableHead className="font-semibold border-l">MICS (new)</TableHead>
                <TableHead className="font-semibold">NAICS Code</TableHead>
                <TableHead className="font-semibold">NAICS Title</TableHead>
                <TableHead className="font-semibold">Conf.</TableHead>
                <TableHead className="font-semibold">Audit</TableHead>
                <TableHead className="font-semibold min-w-[300px]">Audit +</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const hasIndustry = !!lead.company_industry;
                const source = getIndustrySource(lead);
                const hasNaics = !!lead.naics_code;
                const micsTitle = lead.naics_code ? naicsMicsTitles.get(lead.naics_code) : null;
                const isClassifying = classifyingLeads.has(lead.id);
                const isAuditing = auditingLeads.has(lead.id);
                const auditResult = auditResults.get(lead.id);
                const hasMicsForm = lead.mics_sector || lead.mics_subsector || lead.mics_segment;
                const canAudit = hasMicsForm;

                return (
                  <TableRow key={lead.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{lead.full_name}</TableCell>
                    <TableCell>{lead.phone || "-"}</TableCell>
                    <TableCell>{lead.email || "-"}</TableCell>
                    <TableCell className="sticky left-0 bg-background z-10">{lead.company || "-"}</TableCell>
                    <TableCell>{lead.dma || "-"}</TableCell>
                    <TableCell>
                      {hasIndustry ? (
                        <span className="text-[#0e0f4d] font-medium">{lead.company_industry}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {source !== "-" ? (
                        <Badge variant={getSourceBadgeVariant(source)} className="text-xs">
                          {source}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.mics_sector || lead.mics_subsector || lead.mics_segment ? (
                        <div className="flex flex-col text-sm max-w-[200px]" title={[lead.mics_sector, lead.mics_subsector, lead.mics_segment].filter(Boolean).join(" > ")}>
                          {[lead.mics_sector, lead.mics_subsector, lead.mics_segment]
                            .filter(Boolean)
                            .map((item, index) => (
                              <span key={index} className="truncate">{item}</span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="border-l">
                      {micsTitle ? (
                        <span className="text-sm truncate max-w-[200px] block" title={micsTitle}>
                          {micsTitle}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasNaics ? (
                        <span className="font-mono text-sm">{lead.naics_code}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.naics_title ? (
                        <span className="text-sm truncate max-w-[200px] block" title={lead.naics_title}>
                          {lead.naics_title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.naics_confidence !== null ? (
                        <span className="text-sm">{lead.naics_confidence}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {auditResult ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant={getAuditBadgeVariant(auditResult.verdict)} 
                              className="cursor-help text-xs capitalize"
                            >
                              {getAuditIcon(auditResult.verdict)}
                              {auditResult.verdict}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[300px]">
                            <p className="text-sm">{auditResult.explanation}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAudit(lead)}
                          disabled={isAuditing || !canAudit}
                        >
                          {isAuditing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Audit"
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {auditResult ? (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {auditResult.explanation}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={hasNaics ? "outline" : "default"}
                        onClick={() => handleClassifyNaics(lead)}
                        disabled={isClassifying}
                      >
                        {isClassifying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Classifying...
                          </>
                        ) : hasNaics ? (
                          "Re-classify"
                        ) : (
                          "Classify NAICS"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    No leads found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
    </div>
  );
}
