import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Sparkles, Loader2, Trash2, ExternalLink, Link2, Info, X, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StickyScrollTable } from "./StickyScrollTable";
interface EnrichmentLog {
  timestamp: string;
  action: string;
  searchParams: {
    company: string;
    city?: string;
    state?: string;
    micsSector?: string;
    email?: string;
    extractedDomain?: string;
  };
  organizationsFound: number;
  selectedOrganization?: {
    name: string;
    domain: string;
    revenue?: string;
    foundedYear?: number;
  };
  domain: string | null;
  confidence: number;
  source: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  searchInformation?: {
    query_displayed: string;
    total_results: number;
    time_taken_displayed: number;
    organic_results_state: string;
    results_for: string;
  };
  searchSteps?: {
    step: number | string;
    query: string;
    resultFound: boolean;
    source?: string;
    spellingCorrection?: {
      original: string;
      corrected: string;
    };
    spellingCorrected?: boolean;
  }[];
}

interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  dma: string | null;
  zipcode: string | null;
  domain: string | null;
  enrichment_status: string | null;
  enrichment_source: string | null;
  enrichment_confidence: number | null;
  enriched_at: string | null;
  enrichment_logs: EnrichmentLog[] | null;
  mics_sector: string | null;
  mics_subsector: string | null;
  mics_segment: string | null;
  distance_miles: number | null;
  distance_confidence: string | null;
  domain_relevance_score: number | null;
  domain_relevance_explanation: string | null;
  latitude: number | null;
  longitude: number | null;
  match_score: number | null;
  match_score_source: string | null;
  industry_relevance_score: number | null;
  industry_relevance_explanation: string | null;
  vehicle_tracking_interest_score: number | null;
  vehicle_tracking_interest_explanation: string | null;
  size: string | null;
  description: string | null;
  annual_revenue: string | null;
  tech_stack: string | null;
  company_industry: string | null;
  linkedin: string | null;
  news: string | null;
  diagnosis_category: string | null;
  diagnosis_explanation: string | null;
  diagnosis_recommendation: string | null;
  diagnosis_confidence: string | null;
  diagnosed_at: string | null;
}
interface LeadsTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}
const LeadsTable = ({ leads, onEnrichComplete }: LeadsTableProps) => {
  const { toast } = useToast();
  const [enrichingSource, setEnrichingSource] = useState<{ leadId: string; source: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLogsForSource, setShowLogsForSource] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState<string | null>(null);
  const [scoringDomain, setScoringDomain] = useState<string | null>(null);
  const [calculatingMatchScore, setCalculatingMatchScore] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState<{ leadId: string; source: string } | null>(null);
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<string | null>(null);
  const [scoringIndustry, setScoringIndustry] = useState<string | null>(null);
  const [scoringVehicleTracking, setScoringVehicleTracking] = useState<string | null>(null);
  const [findingCoordinates, setFindingCoordinates] = useState<string | null>(null);
  const [enrichingCompanyDetails, setEnrichingCompanyDetails] = useState<string | null>(null);
  const [fetchingNews, setFetchingNews] = useState<string | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; text: string }>({ title: "", text: "" });

  const wasFoundViaGoogle = (logs: EnrichmentLog[] | null): boolean => {
    if (!logs) return false;
    return logs.some(log => 
      log.domain && 
      (log.source === 'google_knowledge_graph' || log.source === 'google_local_results')
    );
  };

  const handleFindCoordinates = async (lead: Lead) => {
    setFindingCoordinates(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("find-company-coordinates", {
        body: {
          leadId: lead.id,
          company: lead.company,
          domain: lead.domain,
          city: lead.city,
          state: lead.state,
        },
      });
      if (error) throw error;
      
      toast({
        title: "Coordinates Found!",
        description: `Located at ${data.latitude}, ${data.longitude}`,
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Coordinate Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFindingCoordinates(null);
    }
  };

  const handleDiagnose = async (lead: Lead) => {
    setDiagnosing({ leadId: lead.id, source: "all" });
    
    try {
    const { data, error } = await supabase.functions.invoke("diagnose-enrichment", {
      body: {
        leadId: lead.id,
        leadData: {
          company: lead.company,
          city: lead.city,
          state: lead.state,
          zipcode: lead.zipcode,
          email: lead.email,
          mics_sector: lead.mics_sector,
          full_name: lead.full_name,
        },
        enrichmentLogs: lead.enrichment_logs || [],
      },
    });

    if (error) throw error;

    toast({
      title: "Diagnosis Complete",
      description: "AI analysis has been generated.",
    });

    onEnrichComplete();
    } catch (error: any) {
      console.error("Diagnosis error:", error);
      toast({
        title: "Diagnosis Failed",
        description: error.message || "Failed to generate diagnosis.",
        variant: "destructive",
      });
    } finally {
      setDiagnosing(null);
    }
  };

  const getConfidenceExplanation = (source: string, confidence: number) => {
    if (source === "apollo_api" || source === "apollo_api_error") {
      if (confidence === 95) return "95% - When primary_domain field exists (most reliable)";
      if (confidence === 90) return "90% - When website_url exists and can be parsed as valid URL";
      if (confidence === 85) return "85% - When website_url exists but URL parsing fails (used as-is)";
      return "0% - No domain found";
    }
    if (
      source === "google_knowledge_graph" ||
      source === "google_knowledge_graph_error" ||
      source === "google_local_results"
    ) {
      if (confidence === 100) return "100% - Step 1: knowledge_graph.website found";
      if (confidence === 50) return "50% - Step 1: local_results fallback";
      if (confidence === 25) return "25% - Step 2: Industry search knowledge_graph";
      if (confidence === 15) return "15% - Step 2: Industry search local_results";
      if (confidence === 10) return "10% - Step 3: Simple search knowledge_graph";
      if (confidence === 5) return "5% - Step 3: Simple search local_results";
      return "0% - No domain found after all search steps";
    }
    if (
      source === "email_domain_verified" ||
      source === "email_not_provided" ||
      source === "email_invalid_format" ||
      source === "email_personal_domain_skipped" ||
      source === "email_domain_not_verified" ||
      source === "email_domain_verification_error"
    ) {
      if (confidence === 95) return "95% - Domain extracted from email and verified via Google";
      return "0% - No valid business domain in email or verification failed";
    }
    return "Confidence score indicates data quality";
  };

  const handleEnrich = async (lead: Lead, source: "apollo" | "google" | "email") => {
    setEnrichingSource({ leadId: lead.id, source });
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          email: lead.email,
          source,
        },
      });
      if (error) throw error;

      toast({
        title: "Enrichment Complete!",
        description: data.domain
          ? `Found domain: ${data.domain} (${data.confidence}% confidence)`
          : "No domain found for this company",
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingSource(null);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Lead deleted successfully.",
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  const handleCalculateDistance = async (lead: Lead) => {
    if (!lead.latitude || !lead.longitude || !lead.city || !lead.zipcode) {
      toast({
        title: "Cannot Calculate Distance",
        description: "GPS coordinates or location data is missing. Run Google enrichment first.",
        variant: "destructive",
      });
      return;
    }

    setCalculatingDistance(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-distance", {
        body: {
          leadId: lead.id,
          city: lead.city,
          state: lead.state,
          zipcode: lead.zipcode,
          latitude: lead.latitude,
          longitude: lead.longitude,
        },
      });

      if (error) throw error;

      toast({
        title: "Distance Calculated!",
        description: `${data.distance_miles} miles from ${lead.city}, ${lead.state}`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalculatingDistance(null);
    }
  };

  const handleScoreDomainRelevance = async (lead: Lead) => {
    if (!lead.company || !lead.domain) {
      toast({
        title: "Cannot Score Domain",
        description: "Company name and domain are required. Run enrichment first.",
        variant: "destructive",
      });
      return;
    }

    setScoringDomain(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("score-domain-relevance", {
        body: {
          leadId: lead.id,
          companyName: lead.company,
          domain: lead.domain,
        },
      });

      if (error) throw error;

      toast({
        title: "Domain Scored!",
        description: `Relevance: ${data.score}/100 - ${data.explanation}`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Scoring Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScoringDomain(null);
    }
  };

  const handleCalculateMatchScore = async (lead: Lead) => {
    setCalculatingMatchScore(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-match-score", {
        body: { leadId: lead.id },
      });

      if (error) throw error;

      const sourceLabels: Record<string, string> = {
        email_domain: "Email Domain Verified",
        google_knowledge_graph: "Google Knowledge Graph",
        calculated: "Distance + Domain Relevance",
      };

      toast({
        title: "Match Score Calculated!",
        description: `${data.matchScore}% (${sourceLabels[data.matchScoreSource] || data.matchScoreSource})`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalculatingMatchScore(null);
    }
  };

  const handleScoreIndustryRelevance = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Score Industry Relevance",
        description: "Domain is required. Run enrichment first.",
        variant: "destructive",
      });
      return;
    }

    setScoringIndustry(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("score-industry-relevance", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          micsSector: lead.mics_sector,
          micsSubsector: lead.mics_subsector,
          micsSegment: lead.mics_segment,
        },
      });

      if (error) throw error;

      toast({
        title: "Industry Relevance Scored!",
        description: `Score: ${data.score}/100`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Scoring Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScoringIndustry(null);
    }
  };

  const handleScoreVehicleTrackingInterest = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Score Vehicle Tracking Interest",
        description: "Domain is required. Run enrichment first.",
        variant: "destructive",
      });
      return;
    }

    setScoringVehicleTracking(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("score-vehicle-tracking-interest", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          company: lead.company,
          micsSector: lead.mics_sector,
        },
      });

      if (error) throw error;

      toast({
        title: "Vehicle Tracking Interest Scored!",
        description: `Score: ${data.score}/100`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Scoring Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScoringVehicleTracking(null);
    }
  };

  const handleEnrichCompanyDetails = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Enrich Company Details",
        description: "Domain is required. Run enrichment first.",
        variant: "destructive",
      });
      return;
    }

    setEnrichingCompanyDetails(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-company-details", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
        },
      });

      if (error) throw error;

      toast({
        title: "Company Details Enriched!",
        description: "Size, revenue, industry, and more have been populated.",
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingCompanyDetails(null);
    }
  };

  const handleGetCompanyNews = async (lead: Lead) => {
    setFetchingNews(lead.id);

    try {
      const { data, error } = await supabase.functions.invoke('get-company-news', {
        body: { 
          leadId: lead.id, 
          company: lead.company,
          state: lead.state,
          domain: lead.domain
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Found ${data.newsCount} news articles`,
      });

      onEnrichComplete();
    } catch (error: any) {
      console.error('Error fetching company news:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch company news",
        variant: "destructive",
      });
    } finally {
      setFetchingNews(null);
    }
  };

  const showLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetails(true);
  };
  return (
    <>
      <StickyScrollTable className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>MICS Sector</TableHead>
              <TableHead>Zipcode</TableHead>
              <TableHead>DMA</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Company Domain
                </div>
              </TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="min-w-[250px]">Description</TableHead>
              <TableHead>Annual Revenue</TableHead>
              <TableHead className="min-w-[250px]">Tech Stack</TableHead>
              <TableHead>Company Industry</TableHead>
              <TableHead>Linkedin</TableHead>
              <TableHead>News</TableHead>
              <TableHead className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                  No leads yet. Add your first lead above.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => showLeadDetails(lead)}
                >
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.company || "—"}</TableCell>
                  <TableCell>{lead.mics_sector || "—"}</TableCell>
                  <TableCell>{lead.zipcode || "—"}</TableCell>
                  <TableCell>{lead.dma || "—"}</TableCell>
                  <TableCell>
                    {lead.domain ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://${lead.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {lead.match_score !== null && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-white text-black border-border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.match_score}%
                          </Badge>
                        )}
                      </div>
                    ) : lead.enrichment_logs && lead.enrichment_logs.length > 0 ? (
                      (() => {
                        const checkedSources = new Set<string>();
                        lead.enrichment_logs.forEach((log) => {
                          if (log.source.startsWith("email_")) {
                            checkedSources.add("Email");
                          } else if (log.source === "google_knowledge_graph" || log.source === "google_local_results") {
                            checkedSources.add("Google");
                          } else if (log.source === "apollo_api" || log.source === "apollo_api_error") {
                            checkedSources.add("Apollo");
                          }
                        });
                        const sourceList = Array.from(checkedSources).join(", ");
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-sm">Not found in {sourceList}</span>
                            {lead.diagnosis_category && (
                              <Badge variant="outline" className="text-xs w-fit">
                                {lead.diagnosis_category}
                              </Badge>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{lead.size || "—"}</TableCell>
                  <TableCell 
                    className="max-w-[250px] cursor-pointer hover:text-primary"
                    onClick={(e) => {
                      if (lead.description) {
                        e.stopPropagation();
                        setModalContent({ title: "Description", text: lead.description });
                        setShowTextModal(true);
                      }
                    }}
                  >
                    <div className="truncate">
                      {lead.description || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{lead.annual_revenue || "—"}</TableCell>
                  <TableCell 
                    className="max-w-[250px] cursor-pointer hover:text-primary"
                    onClick={(e) => {
                      if (lead.tech_stack) {
                        e.stopPropagation();
                        setModalContent({ title: "Tech Stack", text: lead.tech_stack });
                        setShowTextModal(true);
                      }
                    }}
                  >
                    <div className="truncate">
                      {lead.tech_stack || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{lead.company_industry || "—"}</TableCell>
                  <TableCell>
                    {lead.linkedin ? (
                      <a
                        href={lead.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{lead.news || "—"}</TableCell>
                  <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Drawer
                        direction="right"
                        open={openDrawer === lead.id}
                        onOpenChange={(open) => setOpenDrawer(open ? lead.id : null)}
                      >
                        <DrawerTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Search className="h-4 w-4" />
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent
                          direction="right"
                          className="bg-background [&_*]:select-text [&_button]:select-none [&_[role=button]]:select-none"
                        >
                          <DrawerHeader className="flex flex-row items-center justify-between select-none">
                            <DrawerTitle className="select-none">Enrichments</DrawerTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setOpenDrawer(null)}
                              className="select-none"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </DrawerHeader>
                          <div className="px-4 pb-8 select-text overflow-y-auto" style={{ userSelect: "text" }}>
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="company-domain" className="border-border">
                                <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                  Company Domain
                                </AccordionTrigger>
                                <AccordionContent className="select-text" style={{ userSelect: "text" }}>
                                  <div className="space-y-3 pt-2">
                                    {lead.enrichment_logs && lead.enrichment_logs.length > 0 ? (
                                      <>
                                        {/* Group logs by source */}
                                        {(() => {
                                          const logsBySource = lead.enrichment_logs.reduce(
                                            (acc, log) => {
                                              // Normalize all email sources to a single "email" key
                                              let groupKey = log.source;
                                              if (log.source.startsWith("email_")) {
                                                groupKey = "email";
                                              } else if (
                                                log.source === "google_knowledge_graph" ||
                                                log.source === "google_local_results"
                                              ) {
                                                groupKey = "google";
                                              } else if (log.source === "apollo_api") {
                                                groupKey = "apollo";
                                              }

                                              if (!acc[groupKey]) {
                                                acc[groupKey] = [];
                                              }
                                              acc[groupKey].push(log);
                                              return acc;
                                            },
                                            {} as Record<string, EnrichmentLog[]>,
                                          );

                                          return Object.entries(logsBySource).map(([source, logs]) => {
                                            const mostRecentLog = logs[logs.length - 1]; // Get the most recent log (last in array)
                                            const sourceLabel =
                                              source === "apollo"
                                                ? "Apollo"
                                                : source === "google"
                                                  ? "Google"
                                                  : source === "email"
                                                    ? "Email"
                                                    : source;

                                            return (
                                              <div
                                                key={source}
                                                className="border rounded-lg p-3 space-y-3"
                                                style={{ userSelect: "text" }}
                                              >
                                                {/* Source Header */}
                                                <div className="flex items-center justify-between select-none">
                                                  <h4 className="font-semibold text-sm select-none">{sourceLabel}</h4>
                                                  {mostRecentLog.domain && (
                                                    <div className="flex items-center gap-1">
                                                      <Badge variant="outline" className="text-xs">
                                                        {mostRecentLog.confidence}% confidence
                                                      </Badge>
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                          </TooltipTrigger>
                                                          <TooltipContent className="max-w-xs">
                                                            <p className="text-xs">
                                                              {getConfidenceExplanation(
                                                                source,
                                                                mostRecentLog.confidence,
                                                              )}
                                                            </p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Domain Display */}
                                                <div style={{ userSelect: "text" }}>
                                                  <p className="text-xs text-muted-foreground mb-1 select-text">
                                                    Domain:
                                                  </p>
                                                {mostRecentLog.domain ? (
                                                    <a
                                                      href={`https://${mostRecentLog.domain}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-sm text-primary hover:underline flex items-center gap-1 select-text"
                                                      onClick={(e) => e.stopPropagation()}
                                                      style={{ userSelect: "text" }}
                                                    >
                                                      {mostRecentLog.domain}
                                                      <ExternalLink className="h-3 w-3 select-none" />
                                                    </a>
                                                  ) : (
                                                    <p className="text-sm text-muted-foreground select-text">
                                                      No domain found
                                                    </p>
                                                  )}
                                                </div>

                                                {/* View Logs Button */}
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() =>
                                                    setShowLogsForSource(showLogsForSource === source ? null : source)
                                                  }
                                                  className="w-full select-none"
                                                >
                                                  {showLogsForSource === source ? "Hide Logs" : "View Logs"}
                                                </Button>

                                                {/* Collapsible Logs Section */}
                                                {showLogsForSource === source && (
                                                  <div
                                                    className="space-y-2 max-h-96 overflow-y-auto pt-2 border-t"
                                                    style={{ userSelect: "text" }}
                                                  >
                                                    {/* Show only the most recent log */}
                                                    {(() => {
                                                      const latestLog = logs[logs.length - 1];
                                                      return (
                                                        <div
                                                          className="bg-muted/30 rounded-md p-2 text-xs space-y-1"
                                                          style={{ userSelect: "text" }}
                                                        >
                                                          <div className="flex items-center justify-between">
                                                            <span className="font-medium text-muted-foreground">
                                                              {new Date(latestLog.timestamp).toLocaleString()}
                                                            </span>
                                                          </div>

                                                          {/* Search Steps */}
                                                          {latestLog.searchSteps &&
                                                            latestLog.searchSteps.length > 0 && (
                                                              <div className="border rounded p-2 mb-2 bg-background/50">
                                                                <p className="font-medium mb-2">Search Path:</p>
                                                                <div className="space-y-2">
                                                                   {latestLog.searchSteps.map((step, idx) => (
                                                                    <div
                                                                      key={idx}
                                                                      className="border-l-2 border-primary/30 pl-2"
                                                                    >
                                                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                        <Badge
                                                                          variant={
                                                                            step.query.startsWith("Skipped")
                                                                              ? "outline"
                                                                              : step.resultFound
                                                                                ? "default"
                                                                                : "secondary"
                                                                          }
                                                                          className="text-xs h-5"
                                                                        >
                                                                          Step {step.step}
                                                                        </Badge>
                                                                        {step.spellingCorrected && (
                                                                          <Badge variant="outline" className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-300">
                                                                            Corrected
                                                                          </Badge>
                                                                        )}
                                                                        {step.resultFound && step.source && (
                                                                          <span className="text-muted-foreground text-xs">
                                                                            via {step.source}
                                                                          </span>
                                                                        )}
                                                                        {step.query.startsWith("Skipped") && (
                                                                          <span className="text-muted-foreground text-xs italic">
                                                                            Skipped
                                                                          </span>
                                                                        )}
                                                                      </div>
                                                                      {step.spellingCorrection && (
                                                                        <div className="text-amber-600 text-xs mt-1 mb-2 bg-amber-50 p-2 rounded border border-amber-200">
                                                                          ✏️ Spelling correction: <span className="font-semibold">"{step.spellingCorrection.original}"</span> → <span className="font-semibold">"{step.spellingCorrection.corrected}"</span>
                                                                        </div>
                                                                      )}
                                                                      <p className="text-muted-foreground break-all font-mono text-xs mt-1 bg-muted/50 p-1 rounded">
                                                                        {step.query}
                                                                      </p>
                                                                      <p className="mt-1 font-medium text-xs">
                                                                        {step.query.startsWith("Skipped")
                                                                          ? "⊘ Skipped"
                                                                          : step.resultFound
                                                                            ? "✓ Found results"
                                                                            : "✗ No results"}
                                                                      </p>
                                                                    </div>
                                                                  ))}
                                                                </div>
                                                              </div>
                                                            )}

                                                          <div className="text-muted-foreground space-y-0.5">
                                                            <p>
                                                              <span className="font-medium">Company:</span>{" "}
                                                              {latestLog.searchParams.company}
                                                            </p>
                                                            {latestLog.searchParams.city && (
                                                              <p>
                                                                <span className="font-medium">City:</span>{" "}
                                                                {latestLog.searchParams.city}
                                                              </p>
                                                            )}
                                                            {latestLog.searchParams.state && (
                                                              <p>
                                                                <span className="font-medium">State:</span>{" "}
                                                                {latestLog.searchParams.state}
                                                              </p>
                                                            )}
                                                            {latestLog.searchParams.micsSector && (
                                                              <p>
                                                                <span className="font-medium">MICS Sector:</span>{" "}
                                                                {latestLog.searchParams.micsSector}
                                                              </p>
                                                            )}
                                                            {latestLog.searchParams.email && (
                                                              <p>
                                                                <span className="font-medium">Email:</span>{" "}
                                                                {latestLog.searchParams.email}
                                                              </p>
                                                            )}
                                                            {latestLog.searchParams.extractedDomain && (
                                                              <p>
                                                                <span className="font-medium">Extracted Domain:</span>{" "}
                                                                {latestLog.searchParams.extractedDomain}
                                                              </p>
                                                            )}
                                                            <p>
                                                              <span className="font-medium">Organizations found:</span>{" "}
                                                              {latestLog.organizationsFound}
                                                            </p>
                                                          </div>
                                                          {latestLog.selectedOrganization && (
                                                            <div className="border-t pt-1 mt-1 space-y-0.5">
                                                              <p className="font-medium">
                                                                {latestLog.selectedOrganization.name}
                                                              </p>
                                                              <p>Domain: {latestLog.selectedOrganization.domain}</p>
                                                              {latestLog.selectedOrganization.revenue && (
                                                                <p>Revenue: {latestLog.selectedOrganization.revenue}</p>
                                                              )}
                                                              {latestLog.selectedOrganization.foundedYear && (
                                                                <p>
                                                                  Founded: {latestLog.selectedOrganization.foundedYear}
                                                                </p>
                                                              )}
                                                            </div>
                                                          )}
                                                          {latestLog.gpsCoordinates && (
                                                            <div className="border-t pt-1 mt-1 space-y-0.5">
                                                              <p className="font-medium">GPS Coordinates</p>
                                                              <p>Latitude: {latestLog.gpsCoordinates.latitude}</p>
                                                              <p>Longitude: {latestLog.gpsCoordinates.longitude}</p>
                                                            </div>
                                                          )}
                                                          {latestLog.searchInformation && (
                                                            <div className="border-t pt-1 mt-1 space-y-0.5">
                                                              <p className="font-medium">Search Info</p>
                                                              <p>
                                                                Query: {latestLog.searchInformation.query_displayed}
                                                              </p>
                                                              <p>
                                                                Results for: {latestLog.searchInformation.results_for}
                                                              </p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          });
                                         })()}
                                       </>
                                     ) : (
                                       <p className="text-sm text-muted-foreground">No enrichment data yet</p>
                                     )}

                                     {/* Generic Diagnose Button - appears when no domains found in Apollo and Google */}
                                     {lead.enrichment_logs && lead.enrichment_logs.length > 0 && (() => {
                                       const hasApolloOrGoogle = lead.enrichment_logs.some(log => 
                                         log.source === "apollo_api" || 
                                         log.source.startsWith("google_")
                                       );
                                       const hasAnyDomain = lead.enrichment_logs.some(log => log.domain);
                                       
                                       return hasApolloOrGoogle && !hasAnyDomain ? (
                                         <div className="mt-4 pt-4 border-t space-y-3">
                                           <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() => handleDiagnose(lead)}
                                             disabled={diagnosing?.leadId === lead.id}
                                             className="w-full select-none"
                                           >
                                             {diagnosing?.leadId === lead.id ? (
                                               <>
                                                 <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                 Diagnosing...
                                               </>
                                             ) : (
                                               <>
                                                 <Sparkles className="h-3 w-3 mr-2" />
                                                 Diagnose Why No Domain Found
                                               </>
                                             )}
                                           </Button>
                                            
                                            {/* Diagnosis Results */}
                                            {lead.diagnosis_category && (
                                              <div className="border rounded-lg overflow-hidden">
                                                {/* Category Header - Collapsible */}
                                                <button
                                                  onClick={() => setExpandedDiagnosis(expandedDiagnosis === lead.id ? null : lead.id)}
                                                  className="w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left"
                                                >
                                                  <div className="flex items-center gap-2 flex-1">
                                                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                                                    <span className="text-sm font-medium">
                                                      {lead.diagnosis_category}
                                                    </span>
                                                    <Badge 
                                                      variant={
                                                        lead.diagnosis_confidence === "high" 
                                                          ? "default" 
                                                          : lead.diagnosis_confidence === "medium"
                                                          ? "secondary"
                                                          : "outline"
                                                      }
                                                      className="text-xs"
                                                    >
                                                      {lead.diagnosis_confidence}
                                                    </Badge>
                                                  </div>
                                                  <svg
                                                    className={`h-4 w-4 transition-transform ${expandedDiagnosis === lead.id ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                  </svg>
                                                </button>
                                                
                                                {/* Expanded Details */}
                                                {expandedDiagnosis === lead.id && (
                                                  <div className="p-3 bg-background space-y-2 border-t">
                                                    <div>
                                                      <p className="text-xs font-medium mb-1">Diagnosis</p>
                                                      <p className="text-xs text-muted-foreground">
                                                        {lead.diagnosis_explanation}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-medium mb-1">Recommendation</p>
                                                      <p className="text-xs text-muted-foreground">
                                                        {lead.diagnosis_recommendation}
                                                      </p>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                         </div>
                                        ) : null;
                                      })()}

                                      {/* Enrich Company Details Button - only show when domain is found */}
                                      {lead.domain && (
                                        <div className="pt-4 border-t">
                                          <Button
                                            size="sm"
                                            onClick={() => handleEnrichCompanyDetails(lead)}
                                            disabled={enrichingCompanyDetails === lead.id}
                                            className="w-full"
                                          >
                                            {enrichingCompanyDetails === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Enriching Company Details...
                                              </>
                                            ) : (
                                              <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich Company Details
                                              </>
                                            )}
                                          </Button>
                                          <p className="text-xs text-muted-foreground mt-2 text-center">
                                            Fetches: Size, Revenue, Industry, Description, Tech Stack, LinkedIn
                                          </p>
                                        </div>
                                      )}

                                      {/* Enrich Buttons */}
                                      <div className="space-y-2 mt-4">
                                      <Button
                                        size="sm"
                                        onClick={() => handleEnrich(lead, "apollo")}
                                        disabled={enrichingSource?.leadId === lead.id || !lead.company}
                                        className="w-full"
                                        variant="outline"
                                      >
                                        {enrichingSource?.leadId === lead.id && enrichingSource?.source === "apollo" ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enriching with Apollo...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Enrich with Apollo
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleEnrich(lead, "google")}
                                        disabled={enrichingSource?.leadId === lead.id || !lead.company}
                                        className="w-full"
                                        variant="outline"
                                      >
                                        {enrichingSource?.leadId === lead.id && enrichingSource?.source === "google" ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enriching with Google...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Enrich with Google
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleEnrich(lead, "email")}
                                        disabled={enrichingSource?.leadId === lead.id || !lead.email}
                                        className="w-full"
                                        variant="outline"
                                      >
                                        {enrichingSource?.leadId === lead.id && enrichingSource?.source === "email" ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enriching with Email...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Enrich with Email
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>

                              <AccordionItem value="match-score" className="border-border">
                                <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                  Match Score
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-3 pt-2">
                                    {/* Overall Match Score Display */}
                                    <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground mb-1">
                                            Overall Match Score
                                          </p>
                                          {lead.match_score !== null ? (
                                            <div className="flex items-center gap-3">
                                              <p className="text-4xl font-bold">{lead.match_score}%</p>
                                              <Badge
                                                variant={
                                                  lead.match_score >= 80
                                                    ? "default"
                                                    : lead.match_score >= 50
                                                      ? "secondary"
                                                      : "destructive"
                                                }
                                                className={
                                                  lead.match_score >= 80
                                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                    : lead.match_score >= 50
                                                      ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                      : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                }
                                              >
                                                {lead.match_score >= 80
                                                  ? "🟢 High"
                                                  : lead.match_score >= 50
                                                    ? "🟡 Medium"
                                                    : "🔴 Low"}
                                              </Badge>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground italic">Not calculated yet</p>
                                          )}
                                        </div>
                                      </div>

                                      {lead.match_score_source && (
                                        <div className="mb-3 pb-3 border-b">
                                          <p className="text-xs text-muted-foreground mb-1">Determined by:</p>
                                          <p className="text-sm font-medium">
                                            {lead.match_score_source === "email_domain" && "📧 Email Domain Verified"}
                                            {lead.match_score_source === "google_knowledge_graph" &&
                                              "🌐 Google Knowledge Graph"}
                                            {lead.match_score_source === "calculated" &&
                                              "📊 Distance + Domain Relevance + Industry Relevance + Vehicle Tracking Interest"}
                                          </p>
                                        </div>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="w-full"
                                        disabled={calculatingMatchScore === lead.id}
                                        onClick={() => handleCalculateMatchScore(lead)}
                                      >
                                        {calculatingMatchScore === lead.id ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Calculating...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Calculate Match Score
                                          </>
                                        )}
                                      </Button>
                                    </div>

                                    {/* Nested Accordion for Distance */}
                                    <Accordion type="single" collapsible className="w-full">
                                      <AccordionItem value="distance" className="border-border">
                                        <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer py-3">
                                          <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-2">
                                              <span>Distance</span>
                                              {lead.distance_miles && (
                                                <span className="font-semibold text-foreground">
                                                  {lead.distance_miles} miles
                                                </span>
                                              )}
                                            </div>
                                            {lead.distance_confidence && (
                                              <Badge
                                                variant={
                                                  lead.distance_confidence === "high"
                                                    ? "default"
                                                    : lead.distance_confidence === "medium"
                                                      ? "secondary"
                                                      : "destructive"
                                                }
                                                className={
                                                  lead.distance_confidence === "high"
                                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                    : lead.distance_confidence === "medium"
                                                      ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                      : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {lead.distance_confidence === "high"
                                                  ? "🟢 High"
                                                  : lead.distance_confidence === "medium"
                                                    ? "🟡 Medium"
                                                    : "🔴 Low"}
                                              </Badge>
                                            )}
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="space-y-3 pt-2">
                                            {/* Distance Details (if calculated) */}
                                            {lead.distance_miles ? (
                                              <div className="p-4 bg-muted rounded-lg space-y-3">
                                                <div>
                                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                                    Distance
                                                  </p>
                                                  <p className="text-3xl font-bold">{lead.distance_miles} miles</p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    📍 From {lead.city}, {lead.state} {lead.zipcode}
                                                  </p>
                                                </div>

                                                {/* Distance Confidence Details */}
                                                {lead.distance_confidence && (
                                                  <div className="pt-3 border-t">
                                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                                      Confidence Level
                                                    </p>
                                                    <Badge
                                                      variant={
                                                        lead.distance_confidence === "high"
                                                          ? "default"
                                                          : lead.distance_confidence === "medium"
                                                            ? "secondary"
                                                            : "destructive"
                                                      }
                                                      className={
                                                        lead.distance_confidence === "high"
                                                          ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                          : lead.distance_confidence === "medium"
                                                            ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                            : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                      }
                                                    >
                                                      {lead.distance_confidence === "high"
                                                        ? "🟢 High Confidence"
                                                        : lead.distance_confidence === "medium"
                                                          ? "🟡 Medium Confidence"
                                                          : "🔴 Low Confidence"}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                      {lead.distance_confidence === "high"
                                                        ? "Lead is within 20 miles - likely a strong match"
                                                        : lead.distance_confidence === "medium"
                                                          ? "Lead is 20-60 miles away - moderate match"
                                                          : "Lead is over 60 miles away - lower match likelihood"}
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground">
                                                No distance calculated yet
                                              </p>
                                            )}

                                            {/* Show Find Coordinates button if domain exists but no coordinates */}
                                            {(!lead.latitude || !lead.longitude) && lead.domain && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                disabled={findingCoordinates === lead.id}
                                                onClick={() => handleFindCoordinates(lead)}
                                              >
                                                {findingCoordinates === lead.id ? (
                                                  <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Finding Coordinates...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Search className="mr-2 h-4 w-4" />
                                                    Find Coordinates from Company
                                                  </>
                                                )}
                                              </Button>
                                            )}

                                            {/* Calculate Distance button (enabled when coordinates exist) */}
                                            {lead.latitude && lead.longitude && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                disabled={
                                                  !lead.city ||
                                                  !lead.zipcode ||
                                                  calculatingDistance === lead.id
                                                }
                                                onClick={() => handleCalculateDistance(lead)}
                                              >
                                                {calculatingDistance === lead.id ? (
                                                  <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Calculating...
                                                  </>
                                                ) : (
                                                  <>
                                                    <MapPin className="mr-2 h-4 w-4" />
                                                    Calculate Distance
                                                  </>
                                                )}
                                              </Button>
                                            )}

                                            {/* Show message only if no domain and no coordinates */}
                                            {(!lead.latitude || !lead.longitude) && !lead.domain && (
                                              <p className="text-xs text-muted-foreground text-center">
                                                Run enrichment first to find a domain
                                              </p>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>

                                      {/* Domain Relevance Accordion Item */}
                                      <AccordionItem value="domain-relevance" className="border-border">
                                        <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer py-3">
                                          <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-2">
                                              <span>Domain Relevance</span>
                                              {lead.domain_relevance_score !== null && (
                                                <span className="font-semibold text-foreground">
                                                  {lead.domain_relevance_score}/100
                                                </span>
                                              )}
                                            </div>
                                            {lead.domain_relevance_score !== null && (
                                              <Badge
                                                variant={
                                                  lead.domain_relevance_score >= 80
                                                    ? "default"
                                                    : lead.domain_relevance_score >= 50
                                                      ? "secondary"
                                                      : "destructive"
                                                }
                                                className={
                                                  lead.domain_relevance_score >= 80
                                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                    : lead.domain_relevance_score >= 50
                                                      ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                      : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {lead.domain_relevance_score >= 80
                                                  ? "🟢 High"
                                                  : lead.domain_relevance_score >= 50
                                                    ? "🟡 Medium"
                                                    : "🔴 Low"}
                                              </Badge>
                                            )}
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="space-y-3 pt-2">
                                            {/* Domain Relevance Details */}
                                            {lead.domain_relevance_score !== null ? (
                                              <div className="p-4 bg-muted rounded-lg space-y-3">
                                                <div>
                                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                                    AI Relevance Score
                                                  </p>
                                                  <p className="text-3xl font-bold">
                                                    {lead.domain_relevance_score}/100
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    Evaluated by ChatGPT
                                                  </p>
                                                </div>

                                                {lead.domain_relevance_explanation && (
                                                  <div className="pt-3 border-t">
                                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                                      Analysis
                                                    </p>
                                                    <p className="text-sm text-foreground">
                                                      {lead.domain_relevance_explanation}
                                                    </p>
                                                  </div>
                                                )}

                                                <div className="pt-3 border-t">
                                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                                    Company
                                                  </p>
                                                  <p className="text-sm text-foreground font-medium">{lead.company}</p>
                                                  <p className="text-sm font-medium text-muted-foreground mb-2 mt-3">
                                                    Domain
                                                  </p>
                                                  <a
                                                    href={`https://${lead.domain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                                  >
                                                    {lead.domain}
                                                    <ExternalLink className="h-3 w-3" />
                                                  </a>
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground">
                                                No relevance score calculated yet
                                              </p>
                                            )}

                                            {/* Score Button */}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full"
                                              disabled={!lead.company || !lead.domain || scoringDomain === lead.id}
                                              onClick={() => handleScoreDomainRelevance(lead)}
                                            >
                                              {scoringDomain === lead.id ? (
                                                <>
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                  Scoring...
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles className="mr-2 h-4 w-4" />
                                                  Score Domain Relevance
                                                </>
                                              )}
                                            </Button>

                                            {/* Show message if domain not available */}
                                            {(!lead.domain || !lead.company) && (
                                              <p className="text-xs text-muted-foreground text-center">
                                                Run domain enrichment first to get company domain
                                              </p>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>

                                      {/* Industry Relevance Accordion Item */}
                                      <AccordionItem value="industry-relevance" className="border-border">
                                        <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer py-3">
                                          <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-2">
                                              <span>Industry Relevance</span>
                                              {lead.industry_relevance_score !== null && (
                                                <span className="font-semibold text-foreground">
                                                  {lead.industry_relevance_score}/100
                                                </span>
                                              )}
                                            </div>
                                            {lead.industry_relevance_score !== null && (
                                              <Badge
                                                variant={
                                                  lead.industry_relevance_score >= 80
                                                    ? "default"
                                                    : lead.industry_relevance_score >= 50
                                                      ? "secondary"
                                                      : "destructive"
                                                }
                                                className={
                                                  lead.industry_relevance_score >= 80
                                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                    : lead.industry_relevance_score >= 50
                                                      ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                      : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {lead.industry_relevance_score >= 80
                                                  ? "🟢 High"
                                                  : lead.industry_relevance_score >= 50
                                                    ? "🟡 Medium"
                                                    : "🔴 Low"}
                                              </Badge>
                                            )}
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="space-y-3 pt-2">
                                            {lead.industry_relevance_score !== null ? (
                                              <div className="p-4 bg-muted rounded-lg space-y-3">
                                                <div>
                                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                                    AI Industry Match Score
                                                  </p>
                                                  <p className="text-3xl font-bold">
                                                    {lead.industry_relevance_score}/100
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    Evaluated by Gemini AI
                                                  </p>
                                                </div>

                                                {lead.industry_relevance_explanation && (
                                                  <div className="pt-3 border-t">
                                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                                      Analysis
                                                    </p>
                                                    <p className="text-sm text-foreground">
                                                      {lead.industry_relevance_explanation}
                                                    </p>
                                                  </div>
                                                )}

                                                <div className="pt-3 border-t">
                                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                                    MICS Classification
                                                  </p>
                                                  {lead.mics_sector && (
                                                    <p className="text-sm text-foreground">
                                                      <span className="font-medium">Sector:</span> {lead.mics_sector}
                                                    </p>
                                                  )}
                                                  {lead.mics_subsector && (
                                                    <p className="text-sm text-foreground mt-1">
                                                      <span className="font-medium">Subsector:</span> {lead.mics_subsector}
                                                    </p>
                                                  )}
                                                  {lead.mics_segment && (
                                                    <p className="text-sm text-foreground mt-1">
                                                      <span className="font-medium">Segment:</span> {lead.mics_segment}
                                                    </p>
                                                  )}
                                                  {!lead.mics_sector && !lead.mics_subsector && !lead.mics_segment && (
                                                    <p className="text-sm text-muted-foreground italic">
                                                      No MICS classification data available
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground">
                                                No industry relevance score calculated yet
                                              </p>
                                            )}

                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full"
                                              disabled={!lead.domain || scoringIndustry === lead.id}
                                              onClick={() => handleScoreIndustryRelevance(lead)}
                                            >
                                              {scoringIndustry === lead.id ? (
                                                <>
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                  Scoring...
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles className="mr-2 h-4 w-4" />
                                                  Calculate Industry Relevance
                                                </>
                                              )}
                                            </Button>

                                            {!lead.domain && (
                                              <p className="text-xs text-muted-foreground text-center">
                                                Run domain enrichment first
                                              </p>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>

                                      {/* Vehicle Tracking Interest Accordion Item */}
                                      <AccordionItem value="vehicle-tracking-interest" className="border-border">
                                        <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer py-3">
                                          <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-2">
                                              <span>Vehicle Tracking Interest</span>
                                              {lead.vehicle_tracking_interest_score !== null && (
                                                <span className="font-semibold text-foreground">
                                                  {lead.vehicle_tracking_interest_score}/100
                                                </span>
                                              )}
                                            </div>
                                            {lead.vehicle_tracking_interest_score !== null && (
                                              <Badge
                                                variant={
                                                  lead.vehicle_tracking_interest_score >= 80
                                                    ? "default"
                                                    : lead.vehicle_tracking_interest_score >= 50
                                                      ? "secondary"
                                                      : "destructive"
                                                }
                                                className={
                                                  lead.vehicle_tracking_interest_score >= 80
                                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                    : lead.vehicle_tracking_interest_score >= 50
                                                      ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                      : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {lead.vehicle_tracking_interest_score >= 80
                                                  ? "🟢 High"
                                                  : lead.vehicle_tracking_interest_score >= 50
                                                    ? "🟡 Medium"
                                                    : "🔴 Low"}
                                              </Badge>
                                            )}
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="space-y-3 pt-2">
                                            {lead.vehicle_tracking_interest_score !== null ? (
                                              <div className="p-4 bg-muted rounded-lg space-y-3">
                                                <div>
                                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                                    AI Interest Score
                                                  </p>
                                                  <p className="text-3xl font-bold">
                                                    {lead.vehicle_tracking_interest_score}/100
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    Evaluated by Gemini AI
                                                  </p>
                                                </div>

                                                {lead.vehicle_tracking_interest_explanation && (
                                                  <div className="pt-3 border-t">
                                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                                      Analysis
                                                    </p>
                                                    <p className="text-sm text-foreground">
                                                      {lead.vehicle_tracking_interest_explanation}
                                                    </p>
                                                  </div>
                                                )}

                                                <div className="pt-3 border-t">
                                                  <p className="text-sm font-medium text-muted-foreground mb-2">
                                                    Company
                                                  </p>
                                                  <p className="text-sm text-foreground font-medium">{lead.company}</p>
                                                  <p className="text-sm font-medium text-muted-foreground mb-2 mt-3">
                                                    Domain
                                                  </p>
                                                  <a
                                                    href={`https://${lead.domain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                                  >
                                                    {lead.domain}
                                                    <ExternalLink className="h-3 w-3" />
                                                  </a>
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-muted-foreground">
                                                No vehicle tracking interest score calculated yet
                                              </p>
                                            )}

                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full"
                                              disabled={!lead.domain || scoringVehicleTracking === lead.id}
                                              onClick={() => handleScoreVehicleTrackingInterest(lead)}
                                            >
                                              {scoringVehicleTracking === lead.id ? (
                                                <>
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                  Scoring...
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles className="mr-2 h-4 w-4" />
                                                  Calculate Vehicle Tracking Interest
                                                </>
                                              )}
                                            </Button>

                                            {!lead.domain && (
                                              <p className="text-xs text-muted-foreground text-center">
                                                Run domain enrichment first
                                              </p>
                                            )}
                                          </div>
                                        </AccordionContent>
                                       </AccordionItem>
                                     </Accordion>
                                   </div>
                                 </AccordionContent>
                               </AccordionItem>

                               {/* Company Details Accordion Item - Only visible when domain exists */}
                               {lead.domain && (
                                 <AccordionItem value="company-details" className="border-border">
                                   <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                     Company Details
                                   </AccordionTrigger>
                                   <AccordionContent>
                                     <div className="space-y-3 pt-2">
                                       <p className="text-sm text-muted-foreground mb-3">
                                         Enrich this lead with detailed company information from Apollo
                                       </p>
                                       
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full"
                          disabled={enrichingCompanyDetails === lead.id}
                          onClick={() => handleEnrichCompanyDetails(lead)}
                        >
                          {enrichingCompanyDetails === lead.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enriching Company Details...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Enrich Company Details
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={fetchingNews === lead.id}
                          onClick={() => handleGetCompanyNews(lead)}
                        >
                          {fetchingNews === lead.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Fetching News...
                            </>
                          ) : (
                            <>
                              <Search className="mr-2 h-4 w-4" />
                              Get Company News
                            </>
                          )}
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                         <span>• Company Size</span>
                                         <span>• Annual Revenue</span>
                                         <span>• Industry</span>
                                         <span>• Description</span>
                                         <span>• Tech Stack</span>
                                         <span>• LinkedIn URL</span>
                                       </div>
                                     </div>
                                   </AccordionContent>
                                 </AccordionItem>
                               )}
                             </Accordion>
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </StickyScrollTable>

      <Dialog open={showTextModal} onOpenChange={setShowTextModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{modalContent.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm whitespace-pre-wrap">{modalContent.text}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>Complete information for this lead</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-sm">{selectedLead.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedLead.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p className="text-sm">{selectedLead.company || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">City</p>
                  <p className="text-sm">{selectedLead.city || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">State</p>
                  <p className="text-sm">{selectedLead.state || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">DMA</p>
                  <p className="text-sm">{selectedLead.dma || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zipcode</p>
                  <p className="text-sm">{selectedLead.zipcode || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MICS Sector</p>
                  <p className="text-sm">{selectedLead.mics_sector || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MICS Subsector</p>
                  <p className="text-sm">{selectedLead.mics_subsector || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MICS Segment</p>
                  <p className="text-sm">{selectedLead.mics_segment || "—"}</p>
                </div>
              </div>
              {selectedLead.domain && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Enrichment Data</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Domain</p>
                      <p className="text-sm">{selectedLead.domain}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Source</p>
                      <p className="text-sm">{selectedLead.enrichment_source || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Confidence</p>
                      <p className="text-sm">
                        {selectedLead.enrichment_confidence ? `${selectedLead.enrichment_confidence}%` : "—"}
                      </p>
                    </div>
                    {selectedLead.enriched_at && (
                      <div>
                        <p className="text-sm font-medium">Enriched At</p>
                        <p className="text-sm">{new Date(selectedLead.enriched_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
export default LeadsTable;
