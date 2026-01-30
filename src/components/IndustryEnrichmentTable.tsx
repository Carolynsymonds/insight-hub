import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

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
  scraped_data_log: {
    apollo_data?: {
      industry?: string;
      industries?: string[];
    };
  } | null;
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

export function IndustryEnrichmentTable({ leads, onEnrichComplete }: IndustryEnrichmentTableProps) {
  const { toast } = useToast();
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [industryFilter, setIndustryFilter] = useState<FilterOption>("all");
  const [clayEnrichments, setClayEnrichments] = useState<Map<string, ClayCompanyEnrichment>>(new Map());

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

  // Filter leads based on selection
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

  const handleEnrichIndustry = async (lead: Lead) => {
    setEnrichingIds(prev => new Set(prev).add(lead.id));

    try {
      const { data, error } = await supabase.functions.invoke("enrich-industry", {
        body: {
          leadId: lead.id,
          company: lead.company,
          domain: lead.domain,
          dma: lead.dma,
          description: lead.description,
        },
      });

      if (error) throw error;

      toast({
        title: "Industry Enriched",
        description: `Industry set to: ${data.industry}`,
      });

      onEnrichComplete();
    } catch (error) {
      console.error("Error enriching industry:", error);
      toast({
        title: "Enrichment Failed",
        description: error instanceof Error ? error.message : "Failed to enrich industry",
        variant: "destructive",
      });
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
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

      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">DMA</TableHead>
              <TableHead className="font-semibold">Industry</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">MICS Title</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => {
              const isEnriching = enrichingIds.has(lead.id);
              const hasIndustry = !!lead.company_industry;
              const source = getIndustrySource(lead);

              return (
                <TableRow key={lead.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>{lead.company || "-"}</TableCell>
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
                      <span className="text-sm">
                        {[lead.mics_sector, lead.mics_subsector, lead.mics_segment]
                          .filter(Boolean)
                          .join(" > ")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={hasIndustry ? "outline" : "default"}
                      onClick={() => handleEnrichIndustry(lead)}
                      disabled={isEnriching}
                    >
                      {isEnriching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Enriching...</span>
                        </>
                      ) : hasIndustry ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          <span>Re-enrich</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Enrich</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
