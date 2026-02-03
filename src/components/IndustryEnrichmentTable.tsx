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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Download, CheckCircle2, AlertTriangle, HelpCircle, Search, ChevronDown, X } from "lucide-react";
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
  audit_verdict: string | null;
  audit_why_wrong: string | null;
  audit_why_right: string | null;
  audited_at: string | null;
  industry_google_snippet: string | null;
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

interface IndustrySearchResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
  displayed_link?: string;
}

interface IndustryEnrichmentTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}

type FilterOption = "all" | "enriched" | "not_enriched";

export function IndustryEnrichmentTable({ leads, onEnrichComplete }: IndustryEnrichmentTableProps) {
  const [industryFilter, setIndustryFilter] = useState<FilterOption>("all");
  const [clayEnrichments, setClayEnrichments] = useState<Map<string, ClayCompanyEnrichment>>(new Map());
  const [naicsMicsTitles, setNaicsMicsTitles] = useState<Map<string, string | null>>(new Map());
  const [classifyingLeads, setClassifyingLeads] = useState<Set<string>>(new Set());
  const [isBulkClassifying, setIsBulkClassifying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [auditingLeads, setAuditingLeads] = useState<Set<string>>(new Set());
  const [isBulkAuditing, setIsBulkAuditing] = useState(false);
  const [bulkAuditProgress, setBulkAuditProgress] = useState({ current: 0, total: 0 });
  
  // Enrich drawer state
  const [enrichDrawerOpen, setEnrichDrawerOpen] = useState(false);
  const [selectedLeadForEnrich, setSelectedLeadForEnrich] = useState<Lead | null>(null);
  const [isSearchingIndustry, setIsSearchingIndustry] = useState(false);
  const [searchResults, setSearchResults] = useState<IndustrySearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [logsOpen, setLogsOpen] = useState(false);

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

  // Get leads that can be audited (have MICS form data and not already audited in DB)
  const leadsNeedingAudit = useMemo(() => {
    return filteredLeads.filter(l => {
      const hasMicsForm = l.mics_sector || l.mics_subsector || l.mics_segment;
      const alreadyAudited = l.audit_verdict !== null;
      return hasMicsForm && !alreadyAudited;
    });
  }, [filteredLeads]);

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

      // Save to database
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          audit_verdict: data.verdict,
          audit_why_wrong: data.why_wrong,
          audit_why_right: data.why_right,
          audited_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error("Error saving audit to DB:", updateError);
      }

      toast({
        title: "Audit Complete",
        description: `Verdict: ${data.verdict}`,
      });

      onEnrichComplete();
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

  const handleClearAudits = async () => {
    const leadIds = filteredLeads
      .filter(l => l.audit_verdict !== null)
      .map(l => l.id);

    if (leadIds.length === 0) {
      toast({
        title: "No Audits to Clear",
        description: "No audit results found for the current view.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("leads")
        .update({
          audit_verdict: null,
          audit_why_wrong: null,
          audit_why_right: null,
          audited_at: null,
        })
        .in("id", leadIds);

      if (error) throw error;

      toast({
        title: "Audits Cleared",
        description: `Cleared ${leadIds.length} audit results.`,
      });

      onEnrichComplete();
    } catch (error) {
      console.error("Error clearing audits:", error);
      toast({
        title: "Failed to Clear Audits",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleBulkAudit = async () => {
    if (leadsNeedingAudit.length === 0) {
      toast({
        title: "No Leads to Audit",
        description: "All visible leads with MICS form data have been audited, or none have form data.",
      });
      return;
    }

    setIsBulkAuditing(true);
    setBulkAuditProgress({ current: 0, total: leadsNeedingAudit.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < leadsNeedingAudit.length; i++) {
      const lead = leadsNeedingAudit[i];
      setBulkAuditProgress({ current: i + 1, total: leadsNeedingAudit.length });
      setAuditingLeads(prev => new Set(prev).add(lead.id));

      const micsForm = [lead.mics_sector, lead.mics_subsector, lead.mics_segment]
        .filter(Boolean)
        .join(" > ");
      const micsNew = lead.naics_code ? naicsMicsTitles.get(lead.naics_code) || "" : "";

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
              description: "Rate limits exceeded. Stopping bulk audit.",
              variant: "destructive",
            });
            break;
          } else if (data.error.includes("Payment required")) {
            toast({
              title: "Payment Required",
              description: "Payment required. Stopping bulk audit.",
              variant: "destructive",
            });
            break;
          }
          errorCount++;
        } else {
          // Save to database
          const { error: updateError } = await supabase
            .from("leads")
            .update({
              audit_verdict: data.verdict,
              audit_why_wrong: data.why_wrong,
              audit_why_right: data.why_right,
              audited_at: new Date().toISOString(),
            })
            .eq("id", lead.id);

          if (updateError) {
            console.error("Error saving audit to DB:", updateError);
          }
          successCount++;
        }
      } catch (error) {
        console.error("Audit error for lead:", lead.id, error);
        errorCount++;
      } finally {
        setAuditingLeads(prev => {
          const next = new Set(prev);
          next.delete(lead.id);
          return next;
        });
      }
    }

    setIsBulkAuditing(false);
    setBulkAuditProgress({ current: 0, total: 0 });

    toast({
      title: "Bulk Audit Complete",
      description: `Successfully audited ${successCount} leads. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
    });

    onEnrichComplete();
  };

  const handleExportCSV = () => {
    const headers = [
      "Name", "Phone", "Email", "Company", "DMA", 
      "Industry", "Source", "MICS (form)", "MICS (new)", 
      "NAICS Code", "NAICS Title", "Conf.", "Audit Verdict", "Why Wrong", "Why Right"
    ];

    const rows = filteredLeads.map((lead) => {
      const source = getIndustrySource(lead);
      const micsForm = [lead.mics_sector, lead.mics_subsector, lead.mics_segment]
        .filter(Boolean)
        .join(" > ");
      const micsNew = lead.naics_code ? naicsMicsTitles.get(lead.naics_code) || "" : "";
      const confidence = lead.naics_confidence !== null ? `${lead.naics_confidence}%` : "";

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
        lead.audit_verdict || "",
        lead.audit_why_wrong || "",
        lead.audit_why_right || ""
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

  const handleOpenEnrichDrawer = (lead: Lead) => {
    setSelectedLeadForEnrich(lead);
    setSearchResults([]);
    setSearchQuery("");
    setLogsOpen(false);
    setEnrichDrawerOpen(true);
  };

  const handleSearchIndustry = async () => {
    if (!selectedLeadForEnrich) return;

    setIsSearchingIndustry(true);
    setSearchResults([]);

    try {
      const response = await supabase.functions.invoke("search-industry-serper", {
        body: {
          leadId: selectedLeadForEnrich.id,
          company: selectedLeadForEnrich.company,
          dma: selectedLeadForEnrich.dma,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      setSearchQuery(data.query);
      setSearchResults(data.topResults || []);
      setLogsOpen(true);

      toast({
        title: "Industry Search Complete",
        description: data.snippet ? "Snippet saved to lead" : "No snippet found",
      });

      onEnrichComplete();
    } catch (error) {
      console.error("Industry search error:", error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearchingIndustry(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0F0F4B]">Industry Enrichment</h2>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAudits}
            disabled={!filteredLeads.some(l => l.audit_verdict !== null)}
          >
            Clear Audits
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkAudit}
            disabled={isBulkAuditing || leadsNeedingAudit.length === 0}
          >
            {isBulkAuditing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Auditing {bulkAuditProgress.current}/{bulkAuditProgress.total}
              </>
            ) : (
              `Audit All (${leadsNeedingAudit.length})`
            )}
          </Button>
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
                const hasAudit = lead.audit_verdict !== null;
                const hasMicsForm = lead.mics_sector || lead.mics_subsector || lead.mics_segment;
                const canAudit = hasMicsForm && !hasAudit;

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
                      {hasAudit ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant={getAuditBadgeVariant(lead.audit_verdict!)} 
                              className="cursor-help text-xs capitalize"
                            >
                              {getAuditIcon(lead.audit_verdict!)}
                              {lead.audit_verdict}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[400px]">
                            <div className="space-y-1">
                              {lead.audit_verdict !== 'match' && (
                                <p className="text-sm"><span className="font-semibold text-red-500">✗ Wrong:</span> {lead.audit_why_wrong}</p>
                              )}
                              <p className="text-sm"><span className="font-semibold text-green-600">✓ Correct:</span> {lead.audit_why_right}</p>
                            </div>
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
                    <TableCell className="max-w-[400px]">
                      {hasAudit ? (
                        <div className="space-y-1 text-xs leading-relaxed">
                          {lead.audit_verdict !== 'match' && (
                            <p><span className="font-semibold text-red-600">✗ Form Wrong:</span> {lead.audit_why_wrong}</p>
                          )}
                          {lead.audit_verdict === 'match' && (
                            <p><span className="font-semibold text-green-600">✓ Form Correct:</span> {lead.audit_why_wrong}</p>
                          )}
                          <p><span className="font-semibold text-green-600">✓ NAICS Correct:</span> {lead.audit_why_right}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEnrichDrawer(lead)}
                      >
                        <Search className="h-4 w-4 mr-1" />
                        Enrich
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

      {/* Enrich Industry Drawer */}
      <Drawer open={enrichDrawerOpen} onOpenChange={setEnrichDrawerOpen} direction="right">
        <DrawerContent direction="right" className="h-full">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle>Enrich Industry</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          
          {selectedLeadForEnrich && (
            <div className="p-4 space-y-6 overflow-auto select-text">
              {/* Company Info */}
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Company</span>
                  <p className="font-semibold text-lg">{selectedLeadForEnrich.company || "N/A"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">DMA</span>
                  <p className="font-medium">{selectedLeadForEnrich.dma || "N/A"}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSearchIndustry}
                  disabled={isSearchingIndustry || !selectedLeadForEnrich.company}
                  className="w-full"
                >
                  {isSearchingIndustry ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Find Industry
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleClassifyNaics(selectedLeadForEnrich)}
                  disabled={classifyingLeads.has(selectedLeadForEnrich.id)}
                  variant={selectedLeadForEnrich.naics_code ? "outline" : "default"}
                  className="w-full"
                >
                  {classifyingLeads.has(selectedLeadForEnrich.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Classifying...
                    </>
                  ) : selectedLeadForEnrich.naics_code ? (
                    "Re-classify NAICS"
                  ) : (
                    "Classify NAICS"
                  )}
                </Button>
              </div>

              {/* Current NAICS */}
              {selectedLeadForEnrich.naics_code && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Current NAICS</span>
                  <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                    <p><span className="font-mono">{selectedLeadForEnrich.naics_code}</span></p>
                    <p className="text-muted-foreground">{selectedLeadForEnrich.naics_title}</p>
                    {selectedLeadForEnrich.naics_confidence !== null && (
                      <p className="text-xs text-muted-foreground">Confidence: {selectedLeadForEnrich.naics_confidence}%</p>
                    )}
                  </div>
                </div>
              )}

              {/* Current Snippet */}
              {selectedLeadForEnrich.industry_google_snippet && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Stored Snippet</span>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {selectedLeadForEnrich.industry_google_snippet}
                  </div>
                </div>
              )}

              {/* Search Results Logs */}
              {searchResults.length > 0 && (
                <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="text-sm font-medium">Search Results ({searchResults.length})</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${logsOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {searchQuery && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
                        Query: {searchQuery}
                      </div>
                    )}
                    {searchResults.map((result, index) => (
                      <div key={index} className="border rounded-md p-3 space-y-1">
                        <a 
                          href={result.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline line-clamp-2"
                        >
                          {result.title}
                        </a>
                        <p className="text-xs text-muted-foreground">{result.displayed_link}</p>
                        {result.snippet && (
                          <p className="text-sm text-foreground/80">{result.snippet}</p>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
