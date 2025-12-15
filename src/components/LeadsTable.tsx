import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
  Link2,
  Info,
  X,
  MapPin,
  CheckCircle,
  XCircle,
  Users,
  Mail,
  Newspaper,
  ChevronRight,
  ChevronDown,
  Linkedin,
  Instagram,
  Facebook,
  ChevronsRight,
  Twitter,
  Github,
  ArrowDown,
  Download,
  FileText,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StickyScrollTable } from "./StickyScrollTable";
import { EnrichContactStepper } from "./EnrichContactStepper";
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
  sourceUrl?: string | null;
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
  category: string;
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
  size: string | null;
  description: string | null;
  annual_revenue: string | null;
  tech_stack: string | null;
  company_industry: string | null;
  linkedin: string | null;
  linkedin_confidence: number | null;
  linkedin_source_url: string | null;
  news: string | null;
  diagnosis_category: string | null;
  diagnosis_explanation: string | null;
  diagnosis_recommendation: string | null;
  diagnosis_confidence: string | null;
  diagnosed_at: string | null;
  facebook: string | null;
  facebook_confidence: number | null;
  founded_date: string | null;
  logo_url: string | null;
  products_services: string | null;
  source_url: string | null;
  apollo_not_found: boolean | null;
  contact_email: string | null;
  contact_email_personal: boolean | null;
  email_domain_validated: boolean | null;
  instagram: string | null;
  instagram_confidence: number | null;
  instagram_source_url: string | null;
  facebook_validated: boolean | null;
  linkedin_validated: boolean | null;
  instagram_validated: boolean | null;
  vehicles_count: string | null;
  confirm_vehicles_50_plus: string | null;
  truck_types: string | null;
  features: string | null;
  vehicle_tracking_interest_explanation: string | null;
  likely_business_cases: string | null;
  short_summary: string | null;
  long_summary: string | null;
  products_services_summary: string | null;
  must_knows: string | null;
  contact_linkedin: string | null;
  contact_facebook: string | null;
  contact_youtube: string | null;
  contact_details: {
    location?: string;
    phone?: string;
    latest_experience?: string;
    title?: string;
    company?: string;
  } | null;
  social_validation_log: {
    timestamp: string;
    lead_info: Record<string, string | null>;
    results: {
      facebook: { valid: boolean; reason: string };
      linkedin: { valid: boolean; reason: string };
      instagram: { valid: boolean; reason: string };
    };
  } | null;
  company_contacts: Array<{
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    email?: string | null;
    email_status?: string | null;
    linkedin_url?: string;
    facebook_url?: string;
    twitter_url?: string;
    github_url?: string;
    youtube_url?: string;
    source: string;
    is_personal?: boolean;
    found_without_role_filter?: boolean;
    social_search_logs?: Array<{
      platform: string;
      query: string;
      found: boolean;
      source: "apollo" | "google_search";
      url?: string;
    }>;
  }> | null;
  scraped_data_log: {
    // Common
    source?: "apollo" | "scraper";
    // Apollo-specific
    organization_name?: string;
    fields_populated?: string[];
    enrichment_steps?: Array<{
      step: number;
      action: string;
      status: string;
      timestamp: string;
      details?: Record<string, any>;
    }>;
    apollo_data?: {
      estimated_employees?: number;
      revenue?: string;
      industry?: string;
      industries?: string[];
      keywords?: string[];
      founded_year?: number;
      city?: string;
      state?: string;
      country?: string;
    };
    // Scraper-specific
    title?: string;
    h1?: string;
    meta_description?: string;
    meta_keywords?: string;
    logo_url?: string;
    linkedin?: string;
    facebook?: string;
    about_pages?: string[];
    nav_links?: string[];
    services?: string[];
    deep_scrape?: {
      pages_scraped: string[];
      founded_year: string | null;
      employee_count: string | null;
      contact_email: string | null;
      contact_email_personal: boolean;
      sources: {
        founded_year_source?: string;
        employee_count_source?: string;
        contact_email_source?: string;
      } | null;
    };
  } | null;
}
export type ViewMode = 'all' | 'company' | 'contact';

interface LeadsTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
  hideFilterBar?: boolean;
  domainFilter?: "all" | "valid" | "invalid" | "not_enriched";
  onDomainFilterChange?: (value: "all" | "valid" | "invalid" | "not_enriched") => void;
  viewMode?: ViewMode;
}
const LeadsTable = ({
  leads,
  onEnrichComplete,
  hideFilterBar = false,
  domainFilter: externalDomainFilter,
  onDomainFilterChange,
  viewMode = 'all',
}: LeadsTableProps) => {
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
  
  const [findingCoordinates, setFindingCoordinates] = useState<string | null>(null);
  const [enrichingCompanyDetails, setEnrichingCompanyDetails] = useState<string | null>(null);
  const [companyDetailsStep, setCompanyDetailsStep] = useState<{ step: number; message: string } | null>(null);
  const [fetchingNews, setFetchingNews] = useState<string | null>(null);
  const [enrichingFacebook, setEnrichingFacebook] = useState<string | null>(null);
  const [enrichingLinkedin, setEnrichingLinkedin] = useState<string | null>(null);
  const [enrichingInstagram, setEnrichingInstagram] = useState<string | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; text: string }>({ title: "", text: "" });
  const [findingContacts, setFindingContacts] = useState<string | null>(null);
  const [enrichingContact, setEnrichingContact] = useState<string | null>(null);
  const [enrichingWithClay, setEnrichingWithClay] = useState<string | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contactsModalLead, setContactsModalLead] = useState<Lead | null>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsModalData, setNewsModalData] = useState<{
    items: Array<{
      title: string;
      source: string;
      date: string;
      snippet: string;
      link: string;
    }>;
  } | null>(null);
  const [internalDomainFilter, setInternalDomainFilter] = useState<"all" | "valid" | "invalid">("all");
  const [scoringSocials, setScoringSocials] = useState<string | null>(null);
  const [showEnrichedColumns, setShowEnrichedColumns] = useState(true);
  const [generatingVehicleInterest, setGeneratingVehicleInterest] = useState(false);
  const [generatingShortSummary, setGeneratingShortSummary] = useState(false);
  const [generatingLongSummary, setGeneratingLongSummary] = useState(false);
  const [generatingProductsSummary, setGeneratingProductsSummary] = useState(false);
  const [generatingMustKnows, setGeneratingMustKnows] = useState(false);
  const [generatingBusinessCases, setGeneratingBusinessCases] = useState(false);
  const [findingDomain, setFindingDomain] = useState<string | null>(null);
  const [findDomainStep, setFindDomainStep] = useState<string | null>(null);
  const [checkingDomain, setCheckingDomain] = useState<string | null>(null);
  const [descriptionModalLead, setDescriptionModalLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [enrichContactSteps, setEnrichContactSteps] = useState<{
    check_existing: { status: string; message?: string; data?: Record<string, any> };
    apollo_search: { status: string; message?: string; data?: Record<string, any> };
    google_socials: { status: string; message?: string; data?: Record<string, any> };
  } | null>(null);
  const [enrichedContactResult, setEnrichedContactResult] = useState<{
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    email?: string;
    email_status?: string;
    linkedin_url?: string;
    facebook_url?: string;
    twitter_url?: string;
    github_url?: string;
    organization_name?: string;
    source?: string;
    social_search_logs?: Array<{
      platform: string;
      found: boolean;
      source: string;
      url?: string;
    }>;
  } | null>(null);
  const [clayEnrichments, setClayEnrichments] = useState<Array<{
    id: string;
    lead_id: string;
    full_name: string | null;
    email: string | null;
    linkedin: string | null;
    title_clay: string | null;
    company_clay: string | null;
    twitter_url_clay: string | null;
    facebook_url_clay: string | null;
    latest_experience_clay: string | null;
    location_clay: string | null;
    phone_clay: string | null;
    created_at: string | null;
    raw_response: any;
  }>>([]);
  const [allClayEnrichments, setAllClayEnrichments] = useState<Record<string, {
    title_clay: string | null;
    company_clay: string | null;
    location_clay: string | null;
    phone_clay: string | null;
  }>>({});

  // Use external filter if provided, otherwise use internal state
  const domainFilter = externalDomainFilter ?? internalDomainFilter;
  const setDomainFilter = onDomainFilterChange ?? setInternalDomainFilter;

  // Sync selectedLead with latest leads data when leads are refreshed
  useEffect(() => {
    if (selectedLead) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead && JSON.stringify(updatedLead) !== JSON.stringify(selectedLead)) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead]);

  // Clear selection when leads data changes
  useEffect(() => {
    setSelectedLeads(new Set());
  }, [leads]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedLeads.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeads.size} leads?`)) return;
    
    try {
      const { error } = await supabase.from("leads").delete().in("id", Array.from(selectedLeads));
      if (error) throw error;
      toast({ title: "Success", description: `${selectedLeads.size} leads deleted.` });
      setSelectedLeads(new Set());
      onEnrichComplete();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Fetch clay enrichments when selectedLead changes
  useEffect(() => {
    const fetchClayEnrichments = async () => {
      if (!selectedLead) {
        setClayEnrichments([]);
        return;
      }

      const { data, error } = await supabase
        .from('clay_enrichments')
        .select('*')
        .eq('lead_id', selectedLead.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clay enrichments:', error);
        return;
      }

      setClayEnrichments(data || []);
    };

    fetchClayEnrichments();
  }, [selectedLead]);

  // Fetch clay enrichments for all leads to display in table columns
  useEffect(() => {
    const fetchAllClayEnrichments = async () => {
      if (leads.length === 0) {
        setAllClayEnrichments({});
        return;
      }

      const leadIds = leads.map(l => l.id);
      const { data, error } = await supabase
        .from('clay_enrichments')
        .select('lead_id, title_clay, company_clay, location_clay, phone_clay')
        .in('lead_id', leadIds);

      if (error) {
        console.error('Error fetching all clay enrichments:', error);
        return;
      }

      // Create a map of lead_id -> enrichment data (use the most recent one per lead)
      const enrichmentMap: Record<string, { title_clay: string | null; company_clay: string | null; location_clay: string | null; phone_clay: string | null }> = {};
      data?.forEach(enrichment => {
        if (!enrichmentMap[enrichment.lead_id]) {
          enrichmentMap[enrichment.lead_id] = {
            title_clay: enrichment.title_clay,
            company_clay: enrichment.company_clay,
            location_clay: enrichment.location_clay,
            phone_clay: enrichment.phone_clay,
          };
        }
      });
      setAllClayEnrichments(enrichmentMap);
    };

    fetchAllClayEnrichments();
  }, [leads]);

  // Filter leads based on domain validity (Match Score >= 50% = valid)
  const filteredLeads = leads.filter((lead) => {
    if (domainFilter === "all") return true;
    if (domainFilter === "valid") return lead.match_score !== null && lead.match_score >= 50;
    if (domainFilter === "invalid") return lead.match_score === null || lead.match_score < 50;
    return true;
  });

  const wasFoundViaGoogle = (logs: EnrichmentLog[] | null): boolean => {
    if (!logs) return false;
    return logs.some(
      (log) => log.domain && (log.source === "google_knowledge_graph" || log.source === "google_local_results"),
    );
  };

  const handleExportCSV = () => {
    const headers = ["Company Name", "Domain", "Confidence Score"];
    const rows = filteredLeads.map((lead) => [
      lead.company || "",
      lead.domain || "",
      lead.enrichment_confidence !== null ? `${lead.enrichment_confidence}%` : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads-export-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredLeads.length} leads to CSV`,
    });
  };

  const handleFindCoordinates = async (lead: Lead) => {
    setFindingCoordinates(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("find-company-coordinates", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          sourceUrl: lead.source_url,
        },
      });
      if (error) throw error;

      if (data.notFound) {
        toast({
          title: "No Coordinates Found",
          description: "Could not locate GPS coordinates for this company",
        });
      } else {
        toast({
          title: "Coordinates Found!",
          description: `Located at ${data.latitude}, ${data.longitude}`,
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      const errorMessage = error.message?.includes('quota') || error.message?.includes('rate limit')
        ? "SerpAPI account has hit its request quota. Please try again later."
        : error.message;
      toast({
        title: "Coordinate Lookup Failed",
        description: errorMessage,
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

  const handleFindDomain = async (lead: Lead) => {
    setFindingDomain(lead.id);
    let domainFound = false;

    try {
      // Step 1: Apollo (always run)
      setFindDomainStep('Searching Apollo (1/3)...');
      const apolloResult = await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          email: lead.email,
          source: "apollo",
        },
      });
      if (apolloResult.data?.domain) domainFound = true;

      // Step 2: Google (always run)
      setFindDomainStep('Searching Google (2/3)...');
      const googleResult = await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          email: lead.email,
          source: "google",
        },
      });
      if (googleResult.data?.domain) domainFound = true;

      // Step 3: Email (always run if email exists)
      if (lead.email) {
        setFindDomainStep('Checking Email (3/3)...');
        const emailResult = await supabase.functions.invoke("enrich-lead", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
            mics_sector: lead.mics_sector,
            email: lead.email,
            source: "email",
          },
        });
        if (emailResult.data?.domain) domainFound = true;
      }

      // Step 4: Always run diagnosis when no domain found from any source
      if (!domainFound) {
        setFindDomainStep('Diagnosing...');
        // Refetch lead to get updated enrichment_logs
        const { data: updatedLead } = await supabase
          .from("leads")
          .select("enrichment_logs")
          .eq("id", lead.id)
          .single();

        await supabase.functions.invoke("diagnose-enrichment", {
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
            enrichmentLogs: updatedLead?.enrichment_logs || [],
          },
        });

        toast({
          title: "No Domain Found",
          description: "All 3 sources checked. AI diagnosis generated.",
        });
      } else {
        toast({
          title: "Search Complete",
          description: "All sources checked. Domain(s) found - check enrichment logs to compare.",
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Find Domain Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFindingDomain(null);
      setFindDomainStep(null);
    }
  };

  const handleCheckDomain = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Check Domain",
        description: "No domain found. Run domain enrichment first.",
        variant: "destructive",
      });
      return;
    }

    setCheckingDomain(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("check-domain", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          company: lead.company,
          city: lead.city,
          state: lead.state,
        },
      });

      if (error) throw error;

      toast({
        title: data.isValid ? "Domain Valid ✓" : "Domain Invalid ✗",
        description: data.reason,
        variant: data.isValid ? "default" : "destructive",
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Domain Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCheckingDomain(null);
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
          city: lead.city,
          state: lead.state,
          dma: lead.dma,
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


  const handleSearchFacebookSerper = async (lead: Lead) => {
    setEnrichingFacebook(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("search-facebook-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          phone: lead.phone,
          micsSector: lead.mics_sector,
        },
      });
      if (error) throw error;

      toast({
        title: data.facebook ? "Facebook Found!" : "No Facebook Found",
        description: data.facebook
          ? `Found with ${data.confidence}% confidence (${data.stepsExecuted} steps)`
          : `No Facebook page found after ${data.stepsExecuted} search steps`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Facebook Search Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingFacebook(null);
    }
  };

  const handleSearchLinkedinSerper = async (lead: Lead) => {
    setEnrichingLinkedin(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("search-linkedin-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          micsSector: lead.mics_sector,
        },
      });
      if (error) throw error;

      toast({
        title: data.linkedin ? "LinkedIn Found!" : "No LinkedIn Found",
        description: data.linkedin
          ? `Found with ${data.confidence}% confidence (${data.stepsExecuted} steps)`
          : `No LinkedIn page found after ${data.stepsExecuted} search steps`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "LinkedIn Search Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingLinkedin(null);
    }
  };

  const handleSearchInstagramSerper = async (lead: Lead) => {
    setEnrichingInstagram(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("search-instagram-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
        },
      });
      if (error) throw error;

      toast({
        title: data.instagram ? "Instagram Found!" : "No Instagram Found",
        description: data.instagram
          ? `Found: ${data.instagram} (${data.confidence}% confidence)`
          : "No Instagram profile found",
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Instagram Search Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingInstagram(null);
    }
  };

  const handleScoreSocialRelevance = async (lead: Lead) => {
    setScoringSocials(lead.id);
    try {
      // Extract organic results from enrichment logs
      const fbLog = lead.enrichment_logs
        ?.slice()
        .reverse()
        .find((log) => log.action === "facebook_search_serper") as any;
      const liLog = lead.enrichment_logs
        ?.slice()
        .reverse()
        .find((log) => log.action === "linkedin_search_serper") as any;
      const igLog = lead.enrichment_logs
        ?.slice()
        .reverse()
        .find((log) => log.action === "instagram_search_serper") as any;

      const facebookResults = fbLog?.top3Results || fbLog?.searchSteps?.[0]?.organicResults || [];
      const linkedinResults = liLog?.top3Results || liLog?.searchSteps?.[0]?.organicResults || [];
      const instagramResults = igLog?.top3Results || [];

      const { data, error } = await supabase.functions.invoke("score-social-relevance", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          mics_subsector: lead.mics_subsector,
          mics_segment: lead.mics_segment,
          facebookResults,
          linkedinResults,
          instagramResults,
        },
      });

      if (error) throw error;

      toast({
        title: "Social Profiles Scored!",
        description: `Facebook: ${data.facebook_validated === null ? "N/A" : data.facebook_validated ? "Valid" : "Invalid"}, LinkedIn: ${data.linkedin_validated === null ? "N/A" : data.linkedin_validated ? "Valid" : "Invalid"}, Instagram: ${data.instagram_validated === null ? "N/A" : data.instagram_validated ? "Valid" : "Invalid"}`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Social Scoring Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScoringSocials(null);
    }
  };

  const handleGenerateShortSummary = async (lead: Lead) => {
    if (!lead.description && !lead.products_services && !lead.company_industry) {
      toast({
        title: "Cannot Generate",
        description: "Company details are required. Run Enrich Company Details first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingShortSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-short-summary", {
        body: {
          leadId: lead.id,
          company: lead.company,
          description: lead.description,
          products_services: lead.products_services,
          company_industry: lead.company_industry,
          zipcode: lead.zipcode,
          dma: lead.dma,
          domain: lead.domain,
        },
      });

      if (error) throw error;

      toast({
        title: "Short Summary Generated!",
        description: "A 2-3 line summary has been created.",
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          short_summary: data.short_summary,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingShortSummary(false);
    }
  };

  const handleGenerateLongSummary = async (lead: Lead) => {
    if (!lead.description && !lead.products_services && !lead.company_industry) {
      toast({
        title: "Cannot Generate",
        description: "Company details are required. Run Enrich Company Details first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingLongSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-long-summary", {
        body: {
          leadId: lead.id,
          company: lead.company,
          company_industry: lead.company_industry,
          mics_sector: lead.mics_sector,
          founded_date: lead.founded_date,
          description: lead.description,
          products_services: lead.products_services,
          annual_revenue: lead.annual_revenue,
          size: lead.size,
          zipcode: lead.zipcode,
          dma: lead.dma,
          domain: lead.domain,
          linkedin: lead.linkedin,
          facebook: lead.facebook,
          instagram: lead.instagram,
          news: lead.news,
        },
      });

      if (error) throw error;

      toast({
        title: "Detailed Profile Generated!",
        description: "A rich 5-8 line company profile has been created.",
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          long_summary: data.long_summary,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingLongSummary(false);
    }
  };

  const handleGenerateProductsSummary = async (lead: Lead) => {
    if (!lead.products_services && !lead.description && !lead.company_industry) {
      toast({
        title: "Cannot Generate",
        description: "Products/services, description, or industry data is required. Run Enrich Company Details first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingProductsSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-products-services-summary", {
        body: {
          leadId: lead.id,
          company: lead.company,
          products_services: lead.products_services,
          description: lead.description,
          company_industry: lead.company_industry,
          mics_sector: lead.mics_sector,
          news: lead.news,
        },
      });

      if (error) throw error;

      toast({
        title: "Products & Services Summary Generated!",
        description: "A professional summary of company offerings has been created.",
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          products_services_summary: data.products_services_summary,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingProductsSummary(false);
    }
  };

  const handleGenerateMustKnows = async (lead: Lead) => {
    if (!lead.company) {
      toast({
        title: "Cannot Generate",
        description: "Company name is required for Must Knows generation.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingMustKnows(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-must-knows", {
        body: {
          leadId: lead.id,
          company: lead.company,
          company_industry: lead.company_industry,
          mics_sector: lead.mics_sector,
          products_services: lead.products_services,
          size: lead.size,
          annual_revenue: lead.annual_revenue,
          founded_date: lead.founded_date,
          zipcode: lead.zipcode,
          dma: lead.dma,
          domain: lead.domain,
          linkedin: lead.linkedin,
          facebook: lead.facebook,
          instagram: lead.instagram,
          news: lead.news,
        },
      });

      if (error) throw error;

      toast({
        title: "Must Knows Generated!",
        description: "Key facts summary has been created for SDR briefing.",
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          must_knows: data.must_knows,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingMustKnows(false);
    }
  };

  const handleGenerateVehicleInterest = async (lead: Lead) => {
    if (!lead.description) {
      toast({
        title: "Cannot Generate",
        description: "Company description is required. Run Enrich Company Details first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingVehicleInterest(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vehicle-interest", {
        body: {
          leadId: lead.id,
          company: lead.company,
          description: lead.description,
          // Vehicle fields
          vehicles_count: lead.vehicles_count,
          confirm_vehicles_50_plus: lead.confirm_vehicles_50_plus,
          truck_types: lead.truck_types,
          features: lead.features,
          // Additional business context fields
          company_industry: lead.company_industry,
          products_services: lead.products_services,
          size: lead.size,
          annual_revenue: lead.annual_revenue,
          mics_sector: lead.mics_sector,
        },
      });

      if (error) throw error;

      toast({
        title: "Interest Analysis Generated!",
        description: "Vehicle tracking interest explanation has been created.",
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          vehicle_tracking_interest_explanation: data.explanation,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingVehicleInterest(false);
    }
  };

  const handleGenerateBusinessCases = async (lead: Lead) => {
    if (!lead.vehicles_count && !lead.truck_types && !lead.features) {
      toast({
        title: "Cannot Generate",
        description: "Vehicle data is required. Add vehicle information during lead import.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingBusinessCases(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-business-cases", {
        body: {
          leadId: lead.id,
          company: lead.company,
          description: lead.description,
          company_industry: lead.company_industry,
          products_services: lead.products_services,
          vehicles_count: lead.vehicles_count,
          truck_types: lead.truck_types,
          features: lead.features,
        },
      });

      if (error) throw error;

      toast({
        title: "Business Cases Generated!",
        description: "Likely business cases have been created.",
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          likely_business_cases: data.businessCases,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingBusinessCases(false);
    }
  };

  const handleFindContacts = async (lead: Lead) => {
    setFindingContacts(lead.id);
    try {
      // Get current user ID for category role lookup
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("find-company-contacts", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          category: lead.category,
          userId: user?.id,
        },
      });
      if (error) throw error;

      toast({
        title: data.contactsFound > 0 ? "Contacts Found!" : "No Contacts Found",
        description:
          data.contactsFound > 0
            ? `Found ${data.contactsFound} key contacts at this company`
            : "No key contacts found for this company",
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Contact Search Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFindingContacts(null);
    }
  };

  const handleEnrichContact = async (lead: Lead) => {
    setEnrichingContact(lead.id);
    setEnrichContactSteps(null); // Reset steps
    setEnrichedContactResult(null); // Reset enriched contact

    try {
      const { data, error } = await supabase.functions.invoke("enrich-contact", {
        body: {
          leadId: lead.id,
          full_name: lead.full_name,
          email: lead.email,
          domain: lead.domain,
          company: lead.company,
        },
      });
      if (error) throw error;

      // Store steps for display
      if (data.steps) {
        setEnrichContactSteps(data.steps);
      }

      // Store enriched contact for display
      if (data.enrichedContact) {
        setEnrichedContactResult(data.enrichedContact);
      }

      if (data.success && data.enrichedContact) {
        toast({
          title: "Contact Enriched!",
          description: `Found additional details for ${lead.full_name}`,
        });
      } else {
        toast({
          title: "Contact Not Found",
          description: data.message || "No matching contact found in Apollo",
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Contact Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
      setEnrichContactSteps(null);
      setEnrichedContactResult(null);
    } finally {
      setEnrichingContact(null);
    }
  };

  const handleEnrichWithClay = async (lead: Lead, linkedinUrl: string) => {
    setEnrichingWithClay(lead.id);
    
    try {
      console.log('Sending contact to Clay via edge function:', lead.full_name, linkedinUrl);
      
      const { data, error } = await supabase.functions.invoke('send-to-clay', {
        body: {
          fullName: lead.full_name,
          email: lead.email,
          linkedin: linkedinUrl,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send to Clay');
      }

      console.log('Clay edge function response:', data);

      toast({
        title: "Sent to Clay",
        description: "Contact details sent to Clay for enrichment.",
      });
      
    } catch (error) {
      console.error('Clay webhook error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send to Clay.",
        variant: "destructive",
      });
    } finally {
      setEnrichingWithClay(null);
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

    const isDirectApollo = lead.enrichment_source === "apollo_api";
    const skipApollo = lead.apollo_not_found === true;

    setEnrichingCompanyDetails(lead.id);

    // Set initial step message based on path
    if (skipApollo) {
      setCompanyDetailsStep({ step: 1, message: "Scraping website..." });
    } else if (isDirectApollo) {
      setCompanyDetailsStep({ step: 1, message: "Retrieving details from Apollo..." });
    } else {
      setCompanyDetailsStep({ step: 1, message: "Searching Apollo for domain..." });
    }

    try {
      const { data, error } = await supabase.functions.invoke("enrich-company-details", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          enrichmentSource: lead.enrichment_source,
          apolloNotFound: lead.apollo_not_found,
        },
      });

      if (error) throw error;

      // Log the enrichment steps for debugging
      console.log("=== COMPANY DETAILS ENRICHMENT RESULT ===");
      console.log("Source:", data.source);
      console.log("Enriched Fields:", data.enrichedFields);
      console.log("Enrichment Steps:", JSON.stringify(data.enrichmentSteps, null, 2));
      if (data.scrapedData) {
        console.log("Scraped Data:", JSON.stringify(data.scrapedData, null, 2));
      }

      // Handle not found case
      if (data.notFound) {
        toast({
          title: "Company Not Found",
          description: "Could not find company details from Apollo or website scraping.",
        });
      } else {
        const fieldsCount = data.enrichedFields?.length || 0;
        const sourceLabel = data.source === "scraper" ? "website scraping" : "Apollo";
        toast({
          title: "Company Details Enriched!",
          description: `${fieldsCount} fields populated from ${sourceLabel}.`,
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      console.error("Company Details Enrichment Error:", error);
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingCompanyDetails(null);
      setCompanyDetailsStep(null);
    }
  };

  const handleGetCompanyNews = async (lead: Lead) => {
    setFetchingNews(lead.id);

    try {
      const { data, error } = await supabase.functions.invoke("get-company-news", {
        body: {
          leadId: lead.id,
          company: lead.company,
          domain: lead.domain,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Found ${data.newsCount} news articles`,
      });

      onEnrichComplete();
    } catch (error: any) {
      console.error("Error fetching company news:", error);
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
      {/* Bulk Delete Button - always visible when leads selected */}
      {selectedLeads.size > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete ({selectedLeads.size})
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      {/* Filter Bar */}
      {!hideFilterBar && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by:</span>
            <Select value={domainFilter} onValueChange={(value: "all" | "valid" | "invalid") => setDomainFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Domain Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="valid">Valid (≥50% Match)</SelectItem>
                <SelectItem value="invalid">Invalid (&lt;50% Match)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <span className="text-sm text-muted-foreground">
            Showing {filteredLeads.length} of {leads.length} leads
          </span>
        </div>
      )}

      <StickyScrollTable className="overflow-x-auto">
        <div className="min-w-max">
          {/* Collapse/Expand button row - only show in View All mode */}
          {viewMode === 'all' && (
            <div className="flex" style={{ paddingBottom: 0, marginBottom: -1 }}>
              <div style={{ width: "940px" }} className="shrink-0" />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-sm font-normal border-border/50 text-muted-foreground hover:bg-muted/50"
                style={{ backgroundColor: "white", borderRadius: 0 }}
                onClick={() => setShowEnrichedColumns(!showEnrichedColumns)}
                title={showEnrichedColumns ? "Collapse enriched details" : "Expand enriched details"}
              >
                <ArrowDown className="h-4 w-4 mr-2 text-muted-foreground/70" />
                <span className="border-r border-border/50 pr-2 mr-2">{showEnrichedColumns ? "Collapse" : "Expand"}</span>
                <ChevronsRight
                  className={`h-4 w-4 text-muted-foreground/70 transition-transform ${showEnrichedColumns ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
          )}
          <div className="rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-20">
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length}
                      onCheckedChange={toggleAllSelection}
                    />
                  </TableHead>
                  {/* View All & Contact: Name */}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead>Name</TableHead>}
{/* View All & Contact: Email */}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead>Email</TableHead>}
                  {/* View All & Company & Contact: Company */}
                  {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && <TableHead className={viewMode === 'company' || viewMode === 'contact' ? "border-r border-border" : ""}>Company</TableHead>}
                  {/* Contact only: Contact Socials (after Company) */}
                  {viewMode === 'contact' && <TableHead>Contact Socials</TableHead>}
                  {/* View All only */}
                  {viewMode === 'all' && <TableHead className="w-[80px] max-w-[80px]">MICS Sector</TableHead>}
                  {viewMode === 'all' && <TableHead>Zipcode</TableHead>}
                  {viewMode === 'all' && <TableHead className="w-[80px] max-w-[80px] border-r border-border">DMA</TableHead>}
                  {/* View All & Company: Company Domain */}
                  {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && (
                    <TableHead className={viewMode === 'all' && showEnrichedColumns ? "border-t-2 border-lavender" : ""}>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Company Domain
                      </div>
                    </TableHead>
                  )}
                  {/* Clay Enrichment Columns */}
                  {(viewMode === 'all' || viewMode === 'contact') && (
                    <TableHead>Role Clay</TableHead>
                  )}
                  {(viewMode === 'all' || viewMode === 'contact') && (
                    <TableHead>Company Clay</TableHead>
                  )}
                  {(viewMode === 'all' || viewMode === 'contact') && (
                    <TableHead>Location Clay</TableHead>
                  )}
                  {(viewMode === 'all' || viewMode === 'contact') && (
                    <TableHead>Phone Clay</TableHead>
                  )}
                  {/* View All & Company: Description */}
                  {(viewMode === 'all' || viewMode === 'company') && (
                    <TableHead className={viewMode === 'all' && showEnrichedColumns ? "min-w-[250px] border-t-2 border-lavender" : "min-w-[250px]"}>
                      Description
                    </TableHead>
                  )}
                  {/* View All: Contact Socials */}
                  {viewMode === 'all' && (
                    <TableHead className={showEnrichedColumns ? "border-t-2 border-lavender" : ""}>
                      Contact Socials
                    </TableHead>
                  )}
                  {/* View All & Company: Socials */}
                  {viewMode === 'all' && showEnrichedColumns && (
                    <TableHead className="border-t-2 border-lavender">Socials</TableHead>
                  )}
                  {viewMode === 'company' && <TableHead>Socials</TableHead>}
                  {/* Company View: Additional columns */}
                  {viewMode === 'company' && (
                    <>
                      <TableHead>Industry</TableHead>
                      <TableHead>Founded</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead className="min-w-[200px]">Products/Services</TableHead>
                      <TableHead>News</TableHead>
                    </>
                  )}
                  {viewMode === 'all' && showEnrichedColumns && (
                    <>
                      <TableHead className="border-t-2 border-lavender">Size</TableHead>
                      <TableHead className="border-t-2 border-lavender">Annual Revenue</TableHead>
                      <TableHead className="border-t-2 border-lavender">Industry</TableHead>
                      <TableHead className="border-t-2 border-lavender">Founded</TableHead>
                      <TableHead className="border-t-2 border-lavender">Contacts</TableHead>
                      <TableHead className="border-t-2 border-lavender">Logo</TableHead>
                      <TableHead className="min-w-[200px] border-t-2 border-lavender">Products/Services</TableHead>
                      <TableHead className="border-t-2 border-lavender">News</TableHead>
                    </>
                  )}
                  <TableHead className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] min-w-[100px] border-t-2 border-background">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showEnrichedColumns ? 20 : 10}
                      className="text-center text-muted-foreground py-8"
                    >
                      {leads.length === 0
                        ? "No leads yet. Add your first lead above."
                        : "No leads match the current filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50 group"
                      onClick={() => showLeadDetails(lead)}
                    >
                      {/* Checkbox cell */}
                      <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                        />
                      </TableCell>
                      {/* View All & Contact: Name */}
                      {(viewMode === 'all' || viewMode === 'contact') && (
                        <TableCell className="font-medium">{lead.full_name}</TableCell>
                      )}
                      {/* View All & Contact: Email */}
                      {(viewMode === 'all' || viewMode === 'contact') && (
                        <TableCell>{lead.email || "—"}</TableCell>
                      )}
                      {/* View All & Company & Contact: Company */}
                      {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && (
                        <TableCell className={viewMode === 'company' || viewMode === 'contact' ? "border-r border-border" : ""}>{lead.company || "—"}</TableCell>
                      )}
                      {/* Contact only: Contact Socials (after Company) */}
                      {viewMode === 'contact' && (
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {/* LinkedIn */}
                            <div className="flex items-center gap-1.5">
                              <Linkedin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.contact_linkedin ? (
                                <a
                                  href={lead.contact_linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.contact_linkedin).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.contact_linkedin;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                            {/* Facebook */}
                            <div className="flex items-center gap-1.5">
                              <Facebook className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.contact_facebook ? (
                                <a
                                  href={lead.contact_facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.contact_facebook).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.contact_facebook;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {/* View All only */}
                      {viewMode === 'all' && <TableCell>{lead.mics_sector || "—"}</TableCell>}
                      {viewMode === 'all' && <TableCell>{lead.zipcode || "—"}</TableCell>}
                      {viewMode === 'all' && <TableCell className="border-r border-border">{lead.dma || "—"}</TableCell>}
                      {/* All views: Company Domain */}
                      {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && (
                        <TableCell>
                          {lead.domain ? (
                            <div className="flex flex-col gap-1">
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
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {lead.email_domain_validated === false 
                                    ? "0%" 
                                    : lead.enrichment_confidence !== null 
                                      ? `${lead.enrichment_confidence}%` 
                                      : "—"} confidence
                                </Badge>
                                {lead.email_domain_validated !== null && (
                                  <Badge 
                                    variant={lead.email_domain_validated ? "default" : "destructive"}
                                    className={`text-xs ${lead.email_domain_validated ? "bg-green-600 hover:bg-green-600" : ""}`}
                                  >
                                    {lead.email_domain_validated ? "✓ VALID" : "✗ INVALID"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : lead.enrichment_logs && lead.enrichment_logs.length > 0 ? (
                            (() => {
                              const checkedSources = new Set<string>();
                              lead.enrichment_logs.forEach((log) => {
                                if (log.source.startsWith("email_")) {
                                  checkedSources.add("Email");
                                } else if (
                                  log.source === "google_knowledge_graph" ||
                                  log.source === "google_local_results"
                                ) {
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
                      )}
                      {/* Clay Enrichment Cells */}
                      {(viewMode === 'all' || viewMode === 'contact') && (
                        <TableCell>{allClayEnrichments[lead.id]?.title_clay || "—"}</TableCell>
                      )}
                      {(viewMode === 'all' || viewMode === 'contact') && (
                        <TableCell>{allClayEnrichments[lead.id]?.company_clay || "—"}</TableCell>
                      )}
                      {(viewMode === 'all' || viewMode === 'contact') && (
                        <TableCell>{allClayEnrichments[lead.id]?.location_clay || "—"}</TableCell>
                      )}
                      {(viewMode === 'all' || viewMode === 'contact') && (
                        <TableCell>{allClayEnrichments[lead.id]?.phone_clay || "—"}</TableCell>
                      )}
                      {/* View All & Company: Description */}
                      {(viewMode === 'all' || viewMode === 'company') && (
                        <TableCell
                          className="max-w-[250px] cursor-pointer hover:text-primary"
                          onClick={(e) => {
                            if (lead.description || lead.vehicle_tracking_interest_explanation) {
                              e.stopPropagation();
                              setDescriptionModalLead(lead);
                            }
                          }}
                        >
                          <div className="truncate">{lead.short_summary || lead.description || "—"}</div>
                        </TableCell>
                      )}
                      {/* View All: Contact Socials */}
                      {viewMode === 'all' && (
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {/* LinkedIn */}
                            <div className="flex items-center gap-1.5">
                              <Linkedin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.contact_linkedin ? (
                                <a
                                  href={lead.contact_linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.contact_linkedin).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.contact_linkedin;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                            {/* Facebook */}
                            <div className="flex items-center gap-1.5">
                              <Facebook className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.contact_facebook ? (
                                <a
                                  href={lead.contact_facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.contact_facebook).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.contact_facebook;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {/* View All: Enriched columns (Socials, Size, etc.) */}
                      {viewMode === 'all' && showEnrichedColumns && (
                        <>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {/* LinkedIn */}
                              <div className="flex items-center gap-1.5">
                                <Linkedin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                {lead.linkedin ? (
                                  <>
                                    <a
                                      href={lead.linkedin}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline truncate max-w-[120px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {(() => {
                                        try {
                                          return new URL(lead.linkedin).pathname.replace(/\/$/, "") || "/";
                                        } catch {
                                          return lead.linkedin;
                                        }
                                      })()}
                                    </a>
                                    {lead.linkedin_validated === false && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 text-destructive border-destructive"
                                      >
                                        Invalid
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">not found</span>
                                )}
                              </div>

                              {/* Instagram */}
                              <div className="flex items-center gap-1.5">
                                <Instagram className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                {lead.instagram ? (
                                  <>
                                    <a
                                      href={lead.instagram}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline truncate max-w-[120px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {(() => {
                                        try {
                                          return new URL(lead.instagram).pathname.replace(/\/$/, "") || "/";
                                        } catch {
                                          return lead.instagram;
                                        }
                                      })()}
                                    </a>
                                    {lead.instagram_validated === false && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 text-destructive border-destructive"
                                      >
                                        Invalid
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">not found</span>
                                )}
                              </div>

                              {/* Facebook */}
                              <div className="flex items-center gap-1.5">
                                <Facebook className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                {lead.facebook ? (
                                  <>
                                    <a
                                      href={lead.facebook}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline truncate max-w-[120px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {(() => {
                                        try {
                                          return new URL(lead.facebook).pathname.replace(/\/$/, "") || "/";
                                        } catch {
                                          return lead.facebook;
                                        }
                                      })()}
                                    </a>
                                    {lead.facebook_validated === false && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 text-destructive border-destructive"
                                      >
                                        Invalid
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">not found</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{lead.size || "—"}</TableCell>
                          <TableCell>{lead.annual_revenue || "—"}</TableCell>
                          <TableCell>{lead.company_industry || "—"}</TableCell>
                          <TableCell>{lead.founded_date || "—"}</TableCell>
                          <TableCell>
                            {(() => {
                              const apolloContacts =
                                lead.company_contacts?.filter((c) => c.source === "apollo_people_search") || [];
                              const scraperContacts =
                                lead.company_contacts?.filter((c) => c.source !== "apollo_people_search") || [];
                              const totalContacts =
                                apolloContacts.length + scraperContacts.length + (lead.contact_email ? 1 : 0);

                              if (totalContacts === 0) return "—";

                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1 text-primary hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContactsModalLead(lead);
                                    setShowContactsModal(true);
                                  }}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  {totalContacts} contact{totalContacts > 1 ? "s" : ""}
                                </Button>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {lead.logo_url ? (
                              <a
                                href={lead.logo_url}
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
                          <TableCell
                            className="max-w-[200px] cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              if (lead.products_services) {
                                e.stopPropagation();
                                setModalContent({ title: "Products/Services", text: lead.products_services });
                                setShowTextModal(true);
                              }
                            }}
                          >
                            <div className="truncate">{lead.products_services || "—"}</div>
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              if (lead.news) {
                                e.stopPropagation();
                                try {
                                  const newsData = JSON.parse(lead.news);
                                  setNewsModalData(newsData);
                                  setShowNewsModal(true);
                                } catch {
                                  setModalContent({ title: "News", text: lead.news });
                                  setShowTextModal(true);
                                }
                              }
                            }}
                          >
                            <div className="truncate">
                              {lead.news
                                ? (() => {
                                    try {
                                      const newsData = JSON.parse(lead.news);
                                      return newsData.news_count > 0
                                        ? `${newsData.news_count} article${newsData.news_count > 1 ? "s" : ""}`
                                        : "No news";
                                    } catch {
                                      return lead.news;
                                    }
                                  })()
                                : "—"}
                            </div>
                          </TableCell>
                        </>
                      )}
                      {/* Company View: Socials */}
                      {viewMode === 'company' && (
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Linkedin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.linkedin ? (
                                <a
                                  href={lead.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.linkedin).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.linkedin;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Instagram className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.instagram ? (
                                <a
                                  href={lead.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.instagram).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.instagram;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Facebook className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {lead.facebook ? (
                                <a
                                  href={lead.facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(() => {
                                    try {
                                      return new URL(lead.facebook).pathname.replace(/\/$/, "") || "/";
                                    } catch {
                                      return lead.facebook;
                                    }
                                  })()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {/* Company View: Industry, Founded, Contacts, Logo, Products/Services, News */}
                      {viewMode === 'company' && (
                        <>
                          <TableCell>{lead.company_industry || "—"}</TableCell>
                          <TableCell>{lead.founded_date || "—"}</TableCell>
                          <TableCell>
                            {(() => {
                              const apolloContacts =
                                lead.company_contacts?.filter((c) => c.source === "apollo_people_search") || [];
                              const scraperContacts =
                                lead.company_contacts?.filter((c) => c.source !== "apollo_people_search") || [];
                              const totalContacts =
                                apolloContacts.length + scraperContacts.length + (lead.contact_email ? 1 : 0);

                              if (totalContacts === 0) return "—";

                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1 text-primary hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContactsModalLead(lead);
                                    setShowContactsModal(true);
                                  }}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  {totalContacts} contact{totalContacts > 1 ? "s" : ""}
                                </Button>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {lead.logo_url ? (
                              <a
                                href={lead.logo_url}
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
                          <TableCell
                            className="max-w-[200px] cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              if (lead.products_services) {
                                e.stopPropagation();
                                setModalContent({ title: "Products/Services", text: lead.products_services });
                                setShowTextModal(true);
                              }
                            }}
                          >
                            <div className="truncate">{lead.products_services || "—"}</div>
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              if (lead.news) {
                                e.stopPropagation();
                                try {
                                  const newsData = JSON.parse(lead.news);
                                  setNewsModalData(newsData);
                                  setShowNewsModal(true);
                                } catch {
                                  setModalContent({ title: "News", text: lead.news });
                                  setShowTextModal(true);
                                }
                              }
                            }}
                          >
                            <div className="truncate">
                              {lead.news
                                ? (() => {
                                    try {
                                      const newsData = JSON.parse(lead.news);
                                      return newsData.news_count > 0
                                        ? `${newsData.news_count} article${newsData.news_count > 1 ? "s" : ""}`
                                        : "No news";
                                    } catch {
                                      return lead.news;
                                    }
                                  })()
                                : "—"}
                            </div>
                          </TableCell>
                        </>
                      )}
                      <TableCell
                        className="text-right sticky right-0 bg-background group-hover:bg-muted/50 z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] min-w-[100px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <Drawer
                            direction="right"
                            open={openDrawer === lead.id}
                            onOpenChange={(open) => {
                              setOpenDrawer(open ? lead.id : null);
                              if (open) {
                                setSelectedLead(lead);
                              }
                            }}
                            dismissible={false}
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
                                <div>
                                  <DrawerTitle className="select-none">Enrichments</DrawerTitle>
                                  <p className="text-sm text-muted-foreground mt-1 select-text">
                                    {lead.domain || lead.company || "Unknown"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete "${lead.full_name}"?`)) {
                                        handleDelete(lead.id);
                                        setOpenDrawer(null);
                                      }
                                    }}
                                    className="select-none text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setOpenDrawer(null)}
                                    className="select-none"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
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
                                              // Filter out social search sources - they belong in Socials Search section
                                              const socialSources = [
                                                "serpapi_facebook_search",
                                                "serpapi_linkedin_search",
                                                "serpapi_instagram_search",
                                              ];

                                              const logsBySource = lead.enrichment_logs
                                                .filter((log) => !socialSources.includes(log.source))
                                                .reduce(
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
                                                      <h4 className="font-semibold text-sm select-none">
                                                        {sourceLabel}
                                                      </h4>
                                                      {mostRecentLog.domain && (
                                                        <div className="flex items-center gap-1">
                                                          <Badge variant="outline" className="text-xs">
                                                            {lead.email_domain_validated === false && lead.domain === mostRecentLog.domain 
                                                              ? "0%" 
                                                              : `${mostRecentLog.confidence}%`} confidence
                                                          </Badge>
                                                          {lead.email_domain_validated !== null && lead.domain === mostRecentLog.domain && (
                                                            <TooltipProvider>
                                                              <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                  <Badge 
                                                                    variant={lead.email_domain_validated ? "default" : "destructive"}
                                                                    className={`text-xs ${lead.email_domain_validated ? "bg-green-600 hover:bg-green-600" : ""}`}
                                                                  >
                                                                    {lead.email_domain_validated ? "✓ VALID" : "✗ INVALID"}
                                                                  </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                  <p className="text-xs">
                                                                    {lead.domain_relevance_explanation || "Domain validation result"}
                                                                  </p>
                                                                </TooltipContent>
                                                              </Tooltip>
                                                            </TooltipProvider>
                                                          )}
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

                                                    {/* Source URL Display (if different from domain) */}
                                                    {mostRecentLog.sourceUrl &&
                                                      mostRecentLog.sourceUrl !== mostRecentLog.domain && (
                                                        <div style={{ userSelect: "text" }} className="mt-2">
                                                          <p className="text-xs text-muted-foreground mb-1 select-text">
                                                            Source URL:
                                                          </p>
                                                          <a
                                                            href={`https://${mostRecentLog.sourceUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ userSelect: "text" }}
                                                          >
                                                            {mostRecentLog.sourceUrl}
                                                            <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                          </a>
                                                        </div>
                                                      )}

                                                    {/* View Logs Button */}
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() =>
                                                        setShowLogsForSource(
                                                          showLogsForSource === source ? null : source,
                                                        )
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
                                                                              <Badge
                                                                                variant="outline"
                                                                                className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-300"
                                                                              >
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
                                                                              ✏️ Spelling correction:{" "}
                                                                              <span className="font-semibold">
                                                                                "{step.spellingCorrection.original}"
                                                                              </span>{" "}
                                                                              →{" "}
                                                                              <span className="font-semibold">
                                                                                "{step.spellingCorrection.corrected}"
                                                                              </span>
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
                                                                    <span className="font-medium">
                                                                      Extracted Domain:
                                                                    </span>{" "}
                                                                    {latestLog.searchParams.extractedDomain}
                                                                  </p>
                                                                )}
                                                                <p>
                                                                  <span className="font-medium">
                                                                    Organizations found:
                                                                  </span>{" "}
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
                                                                    <p>
                                                                      Revenue: {latestLog.selectedOrganization.revenue}
                                                                    </p>
                                                                  )}
                                                                  {latestLog.selectedOrganization.foundedYear && (
                                                                    <p>
                                                                      Founded:{" "}
                                                                      {latestLog.selectedOrganization.foundedYear}
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
                                                                    Results for:{" "}
                                                                    {latestLog.searchInformation.results_for}
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

                                        {/* Facebook Profile Section */}
                                        {lead.facebook && (
                                          <div className="border rounded-lg p-3 space-y-3">
                                            <div className="flex items-center justify-between select-none">
                                              <h4 className="font-semibold text-sm select-none">Facebook</h4>
                                              {lead.facebook_confidence && (
                                                <div className="flex items-center gap-1">
                                                  <Badge variant="outline" className="text-xs">
                                                    {lead.facebook_confidence}% confidence
                                                  </Badge>
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.facebook_confidence === 85
                                                            ? "85% - Found with company name + location (high confidence)"
                                                            : "50% - Found with company name only (medium confidence)"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                </div>
                                              )}
                                            </div>
                                            <div style={{ userSelect: "text" }}>
                                              <p className="text-xs text-muted-foreground mb-1 select-text">Profile:</p>
                                              <a
                                                href={lead.facebook}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {lead.facebook}
                                                <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                              </a>
                                            </div>
                                          </div>
                                        )}

                                        {/* Generic Diagnose Button - appears when no domain currently found */}
                                        {lead.enrichment_logs &&
                                          lead.enrichment_logs.length > 0 &&
                                          (() => {
                                            const hasApolloOrGoogle = lead.enrichment_logs.some(
                                              (log) => log.source === "apollo_api" || log.source.startsWith("google_"),
                                            );

                                            return hasApolloOrGoogle && !lead.domain ? (
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
                                                      onClick={() =>
                                                        setExpandedDiagnosis(
                                                          expandedDiagnosis === lead.id ? null : lead.id,
                                                        )
                                                      }
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
                                                        className={`h-4 w-4 transition-transform ${expandedDiagnosis === lead.id ? "rotate-180" : ""}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                      >
                                                        <path
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M19 9l-7 7-7-7"
                                                        />
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

                                        {/* Enrich Company Details Button - only show when domain is found and match_score >= 50% */}
                                        {lead.domain && (lead.match_score ?? 0) >= 50 && (
                                          <div className="pt-4 border-t space-y-2">
                                            {lead.enrichment_source === "apollo_api" && (
                                              <p className="text-xs text-primary">
                                                ✓ Domain found via Apollo - direct retrieval
                                              </p>
                                            )}
                                            <Button
                                              size="sm"
                                              onClick={() => handleEnrichCompanyDetails(lead)}
                                              disabled={enrichingCompanyDetails === lead.id}
                                              className="w-full"
                                            >
                                              {enrichingCompanyDetails === lead.id ? (
                                                <>
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                  {companyDetailsStep?.message || "Enriching..."}
                                                </>
                                              ) : (
                                                <>
                                                  <Sparkles className="mr-2 h-4 w-4" />
                                                  Enrich Company Details
                                                </>
                                              )}
                                            </Button>
                                            {enrichingCompanyDetails !== lead.id && (
                                              <p className="text-xs text-muted-foreground text-center">
                                                Fetches: Size, Revenue, Industry, Description, Tech Stack, LinkedIn
                                              </p>
                                            )}
                                          </div>
                                        )}
                                        {lead.domain && (lead.match_score === null || (lead.match_score ?? 0) < 50) && (
                                          <div className="pt-4 border-t">
                                            <p className="text-xs text-destructive/70 text-center">
                                              {lead.match_score === null
                                                ? "Blocked: Match Score not calculated (run Calculate Match Score first)"
                                                : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                            </p>
                                          </div>
                                        )}

                                        {/* Find Domain - Combined Action */}
                                        <div className="mb-4">
                                          <Button
                                            size="sm"
                                            onClick={() => handleFindDomain(lead)}
                                            disabled={findingDomain === lead.id || !lead.company}
                                            className="w-full"
                                            variant="default"
                                          >
                                            {findingDomain === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {findDomainStep || "Finding Domain..."}
                                              </>
                                            ) : (
                                              <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Find Domain
                                              </>
                                            )}
                                          </Button>
                                          
                                          {/* Check Domain Validity Button */}
                                          <Button
                                            size="sm"
                                            onClick={() => handleCheckDomain(lead)}
                                            disabled={checkingDomain === lead.id || !lead.domain}
                                            className="w-full mt-2"
                                            variant="outline"
                                          >
                                            {checkingDomain === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Checking Domain...
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Check Domain
                                              </>
                                            )}
                                          </Button>
                                          {!lead.domain && (
                                            <p className="text-xs text-muted-foreground text-center mt-1">
                                              Find a domain first to check validity
                                            </p>
                                          )}
                                        </div>

                                        {/* Enrich Buttons */}
                                        <div className="space-y-2 mt-4">
                                          <Button
                                            size="sm"
                                            onClick={() => handleEnrich(lead, "apollo")}
                                            disabled={enrichingSource?.leadId === lead.id || findingDomain === lead.id || !lead.company}
                                            className="w-full"
                                            variant="outline"
                                          >
                                            {enrichingSource?.leadId === lead.id &&
                                            enrichingSource?.source === "apollo" ? (
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
                                            disabled={enrichingSource?.leadId === lead.id || findingDomain === lead.id || !lead.company}
                                            className="w-full"
                                            variant="outline"
                                          >
                                            {enrichingSource?.leadId === lead.id &&
                                            enrichingSource?.source === "google" ? (
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
                                            disabled={enrichingSource?.leadId === lead.id || findingDomain === lead.id || !lead.email}
                                            className="w-full"
                                            variant="outline"
                                          >
                                            {enrichingSource?.leadId === lead.id &&
                                            enrichingSource?.source === "email" ? (
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

                                  {/* Socials Search Section */}
                                  <AccordionItem value="socials-search" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      Socials Search
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4 pt-2">
                                        {/* Facebook Section */}
                                        <div className="space-y-3">
                                          <p className="text-xs font-medium text-muted-foreground">Facebook</p>

                                          {/* Existing Facebook result display */}
                                          {lead.facebook && (
                                            <div className="p-3 border rounded-lg bg-muted/30">
                                              <div className="flex items-center justify-between">
                                                <div style={{ userSelect: "text" }}>
                                                  <a
                                                    href={lead.facebook}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {lead.facebook}
                                                    <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                  </a>
                                                </div>
                                                {lead.facebook_validated !== null && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge
                                                          variant={lead.facebook_validated ? "default" : "destructive"}
                                                          className={`text-xs ${lead.facebook_validated ? "bg-green-600 hover:bg-green-600" : ""}`}
                                                        >
                                                          {lead.facebook_validated ? "✓ Valid" : "✗ Invalid"}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.social_validation_log?.results?.facebook?.reason ||
                                                            "AI validation result"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Facebook Search Logs */}
                                          {lead.enrichment_logs &&
                                            lead.enrichment_logs.some(
                                              (log) => log.action === "facebook_search_serper",
                                            ) && (
                                              <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Search Logs
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                                    {(() => {
                                                      const fbLog = [...lead.enrichment_logs]
                                                        .reverse()
                                                        .find((log) => log.action === "facebook_search_serper") as any;
                                                      if (!fbLog) return null;

                                                      // Support both old format (searchSteps[0].organicResults) and new format (top3Results)
                                                      const query = fbLog.query || fbLog.searchSteps?.[0]?.query || "";
                                                      const organicResults =
                                                        fbLog.top3Results ||
                                                        fbLog.searchSteps?.[0]?.organicResults ||
                                                        [];

                                                      return (
                                                        <>
                                                          <p className="text-muted-foreground">
                                                            <span className="font-medium">Searched:</span>{" "}
                                                            {new Date(fbLog.timestamp).toLocaleString()}
                                                          </p>
                                                          {query && (
                                                            <div className="mt-2">
                                                              <p className="text-muted-foreground font-medium mb-1">
                                                                Query:
                                                              </p>
                                                              <p className="font-mono text-xs break-all bg-muted/50 p-1 rounded">
                                                                {query}
                                                              </p>
                                                            </div>
                                                          )}
                                                          {organicResults.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                              <p className="text-muted-foreground font-medium">
                                                                organic_results ({organicResults.length}):
                                                              </p>
                                                              {organicResults.map((result: any, rIdx: number) => (
                                                                <pre
                                                                  key={rIdx}
                                                                  className="p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto"
                                                                >
                                                                  {JSON.stringify(result, null, 2)}
                                                                </pre>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </>
                                                      );
                                                    })()}
                                                  </div>
                                                </CollapsibleContent>
                                              </Collapsible>
                                            )}

                                          {/* Search Facebook Button */}
                                          <Button
                                            size="sm"
                                            onClick={() => handleSearchFacebookSerper(lead)}
                                            disabled={enrichingFacebook === lead.id || !lead.company}
                                            className="w-full"
                                            variant="outline"
                                          >
                                            {enrichingFacebook === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching Facebook...
                                              </>
                                            ) : (
                                              <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search Facebook
                                              </>
                                            )}
                                          </Button>
                                        </div>

                                        {/* LinkedIn Section */}
                                        <div className="space-y-3 pt-3 border-t">
                                          <p className="text-xs font-medium text-muted-foreground">LinkedIn</p>

                                          {/* LinkedIn result display */}
                                          {lead.linkedin && (
                                            <div className="p-3 border rounded-lg bg-muted/30">
                                              <div className="flex items-center justify-between">
                                                <div style={{ userSelect: "text" }}>
                                                  <a
                                                    href={lead.linkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {lead.linkedin}
                                                    <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                  </a>
                                                </div>
                                                {lead.linkedin_validated !== null && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge
                                                          variant={lead.linkedin_validated ? "default" : "destructive"}
                                                          className={`text-xs ${lead.linkedin_validated ? "bg-green-600 hover:bg-green-600" : ""}`}
                                                        >
                                                          {lead.linkedin_validated ? "✓ Valid" : "✗ Invalid"}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.social_validation_log?.results?.linkedin?.reason ||
                                                            "AI validation result"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* LinkedIn Search Logs */}
                                          {lead.enrichment_logs &&
                                            lead.enrichment_logs.some(
                                              (log) => log.action === "linkedin_search_serper",
                                            ) && (
                                              <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Search Logs
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                                    {(() => {
                                                      const liLog = [...lead.enrichment_logs]
                                                        .reverse()
                                                        .find((log) => log.action === "linkedin_search_serper") as any;
                                                      if (!liLog) return null;

                                                      // Support both old format (searchSteps) and new format (query + top3Results)
                                                      const query = liLog.query || liLog.searchSteps?.[0]?.query || "";
                                                      const organicResults =
                                                        liLog.top3Results ||
                                                        liLog.searchSteps?.[0]?.organicResults ||
                                                        [];

                                                      return (
                                                        <>
                                                          <p className="text-muted-foreground">
                                                            <span className="font-medium">Searched:</span>{" "}
                                                            {new Date(liLog.timestamp).toLocaleString()}
                                                          </p>
                                                          {query && (
                                                            <div className="mt-2">
                                                              <p className="text-muted-foreground font-medium mb-1">
                                                                Query:
                                                              </p>
                                                              <p className="font-mono text-xs break-all bg-muted/50 p-1 rounded">
                                                                {query}
                                                              </p>
                                                            </div>
                                                          )}
                                                          {organicResults.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                              <p className="text-muted-foreground font-medium">
                                                                organic_results ({organicResults.length}):
                                                              </p>
                                                              {organicResults.map((result: any, rIdx: number) => (
                                                                <pre
                                                                  key={rIdx}
                                                                  className="p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto"
                                                                >
                                                                  {JSON.stringify(result, null, 2)}
                                                                </pre>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </>
                                                      );
                                                    })()}
                                                  </div>
                                                </CollapsibleContent>
                                              </Collapsible>
                                            )}

                                          {/* Search LinkedIn Button */}
                                          <Button
                                            size="sm"
                                            onClick={() => handleSearchLinkedinSerper(lead)}
                                            disabled={enrichingLinkedin === lead.id || !lead.company}
                                            className="w-full"
                                            variant="outline"
                                          >
                                            {enrichingLinkedin === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching LinkedIn...
                                              </>
                                            ) : (
                                              <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search LinkedIn
                                              </>
                                            )}
                                          </Button>
                                        </div>

                                        {/* Instagram Section */}
                                        <div className="space-y-3 pt-3 border-t">
                                          <p className="text-xs font-medium text-muted-foreground">Instagram</p>

                                          {/* Instagram result display */}
                                          {lead.instagram && (
                                            <div className="p-3 border rounded-lg bg-muted/30">
                                              <div className="flex items-center justify-between">
                                                <div style={{ userSelect: "text" }}>
                                                  <a
                                                    href={lead.instagram}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {lead.instagram}
                                                    <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                  </a>
                                                </div>
                                                {lead.instagram_validated !== null && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge
                                                          variant={lead.instagram_validated ? "default" : "destructive"}
                                                          className={`text-xs ${lead.instagram_validated ? "bg-green-600 hover:bg-green-600" : ""}`}
                                                        >
                                                          {lead.instagram_validated ? "✓ Valid" : "✗ Invalid"}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.social_validation_log?.results?.instagram?.reason ||
                                                            "AI validation result"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Instagram Search Logs */}
                                          {lead.enrichment_logs &&
                                            lead.enrichment_logs.some(
                                              (log) => log.action === "instagram_search_serper",
                                            ) && (
                                              <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Search Logs
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                                    {(() => {
                                                      const igLog = [...lead.enrichment_logs]
                                                        .reverse()
                                                        .find((log) => log.action === "instagram_search_serper") as any;
                                                      if (!igLog) return null;

                                                      const query = igLog.query || "";
                                                      const organicResults = igLog.top3Results || [];

                                                      return (
                                                        <>
                                                          <p className="text-muted-foreground">
                                                            <span className="font-medium">Searched:</span>{" "}
                                                            {new Date(igLog.timestamp).toLocaleString()}
                                                          </p>
                                                          {query && (
                                                            <div className="mt-2">
                                                              <p className="text-muted-foreground font-medium mb-1">
                                                                Query:
                                                              </p>
                                                              <p className="font-mono text-xs break-all bg-muted/50 p-1 rounded">
                                                                {query}
                                                              </p>
                                                            </div>
                                                          )}
                                                          {organicResults.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                              <p className="text-muted-foreground font-medium">
                                                                organic_results ({organicResults.length}):
                                                              </p>
                                                              {organicResults.map((result: any, rIdx: number) => (
                                                                <pre
                                                                  key={rIdx}
                                                                  className="p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto"
                                                                >
                                                                  {JSON.stringify(result, null, 2)}
                                                                </pre>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </>
                                                      );
                                                    })()}
                                                  </div>
                                                </CollapsibleContent>
                                              </Collapsible>
                                            )}

                                          {/* Search Instagram Button */}
                                          <Button
                                            size="sm"
                                            onClick={() => handleSearchInstagramSerper(lead)}
                                            disabled={enrichingInstagram === lead.id || !lead.company}
                                            className="w-full"
                                            variant="outline"
                                          >
                                            {enrichingInstagram === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching Instagram...
                                              </>
                                            ) : (
                                              <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search Instagram
                                              </>
                                            )}
                                          </Button>
                                        </div>

                                        {/* Calculate Score Button */}
                                        <div className="pt-4 border-t">
                                          <Button
                                            size="sm"
                                            onClick={() => handleScoreSocialRelevance(lead)}
                                            disabled={
                                              scoringSocials === lead.id ||
                                              (!lead.facebook && !lead.linkedin && !lead.instagram)
                                            }
                                            className="w-full"
                                            variant="default"
                                          >
                                            {scoringSocials === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Scoring Socials...
                                              </>
                                            ) : (
                                              <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Calculate Score
                                              </>
                                            )}
                                          </Button>
                                          {!lead.facebook && !lead.linkedin && !lead.instagram && (
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                              Search for at least one social profile first
                                            </p>
                                          )}
                                        </div>

                                        <p className="text-xs text-muted-foreground text-center pt-2">
                                          Social search: Facebook, LinkedIn, Instagram
                                        </p>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  <AccordionItem value="match-score" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      Match Score
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-3 pt-2">
                                        {/* Email Validated Banner - Show when email_domain_validated is true */}
                                        {lead.email_domain_validated && (
                                          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                                            <div className="flex items-center gap-2">
                                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                              <div className="flex-1">
                                                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                                                  Domain Validated via Email Match
                                                </p>
                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                  Scraped contact email matches lead's email address
                                                </p>
                                              </div>
                                              <Badge className="bg-green-600 hover:bg-green-600 text-white border-green-600">
                                                100% Confirmed
                                              </Badge>
                                            </div>
                                          </div>
                                        )}

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
                                                <p className="text-sm text-muted-foreground italic">
                                                  Not calculated yet
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {lead.match_score_source && (
                                            <div className="mb-3 pb-3 border-b">
                                              <p className="text-xs text-muted-foreground mb-1">Determined by:</p>
                                              <p className="text-sm font-medium">
                                                {lead.match_score_source === "email_validated" &&
                                                  "✅ Email Validated via Website Scrape"}
                                                {lead.match_score_source === "email_domain" &&
                                                  "📧 Email Domain Verified"}
                                                {lead.match_score_source === "google_knowledge_graph" &&
                                                  "🌐 Google Knowledge Graph"}
                                                {lead.match_score_source === "calculated" &&
                                                  "📊 Distance + Domain Relevance"}
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
                                                          : lead.distance_confidence === "undefined"
                                                            ? "outline"
                                                            : "destructive"
                                                    }
                                                    className={
                                                      lead.distance_confidence === "high"
                                                        ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                        : lead.distance_confidence === "medium"
                                                          ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                          : lead.distance_confidence === "undefined"
                                                            ? "bg-gray-200 hover:bg-gray-300 text-gray-600 border-gray-300"
                                                            : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                    }
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {lead.distance_confidence === "high"
                                                      ? "🟢 High"
                                                      : lead.distance_confidence === "medium"
                                                        ? "🟡 Medium"
                                                        : lead.distance_confidence === "undefined"
                                                          ? "⚪ Undefined"
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
                                                                : lead.distance_confidence === "undefined"
                                                                  ? "outline"
                                                                  : "destructive"
                                                          }
                                                          className={
                                                            lead.distance_confidence === "high"
                                                              ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                                                              : lead.distance_confidence === "medium"
                                                                ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500"
                                                                : lead.distance_confidence === "undefined"
                                                                  ? "bg-gray-200 hover:bg-gray-300 text-gray-600 border-gray-300"
                                                                  : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                                                          }
                                                        >
                                                          {lead.distance_confidence === "high"
                                                            ? "🟢 High Confidence"
                                                            : lead.distance_confidence === "medium"
                                                              ? "🟡 Medium Confidence"
                                                              : lead.distance_confidence === "undefined"
                                                                ? "⚪ Undefined"
                                                                : "🔴 Low Confidence"}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                          {lead.distance_confidence === "high"
                                                            ? "Lead is within 50 miles - likely a strong match"
                                                            : lead.distance_confidence === "medium"
                                                              ? "Lead is 50-100 miles away - moderate match"
                                                              : lead.distance_confidence === "undefined"
                                                                ? "No coordinates found for this company"
                                                                : "Lead is over 100 miles away - lower match likelihood"}
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
                                                {lead.domain && (
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
                                                      !lead.city || !lead.zipcode || calculatingDistance === lead.id
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
                                                      <p className="text-sm text-foreground font-medium">
                                                        {lead.company}
                                                      </p>
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
                                            {lead.apollo_not_found ? (
                                              <>
                                                {lead.scraped_data_log ? (
                                                  <>
                                                    Company details enriched via website scraping
                                                    <span className="block text-xs text-green-600 mt-1">
                                                      ✓ Scraped from website (Apollo: Company not found)
                                                    </span>
                                                  </>
                                                ) : (
                                                  <>
                                                    Enrich this lead by scraping the company website
                                                    <span className="block text-xs text-yellow-600 mt-1">
                                                      ⚠ Apollo: Company not found - will use website scraping
                                                    </span>
                                                  </>
                                                )}
                                              </>
                                            ) : lead.enrichment_source === "apollo_api" ? (
                                              <>
                                                Enrich this lead with detailed company information from Apollo
                                                <span className="block text-xs text-primary mt-1">
                                                  ✓ Domain found via Apollo - direct retrieval available
                                                </span>
                                              </>
                                            ) : (
                                              "Enrich this lead with detailed company information"
                                            )}
                                          </p>

                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="w-full"
                                            disabled={
                                              enrichingCompanyDetails === lead.id ||
                                              lead.match_score === null ||
                                              (lead.match_score ?? 0) < 50
                                            }
                                            onClick={() => handleEnrichCompanyDetails(lead)}
                                          >
                                            {enrichingCompanyDetails === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {companyDetailsStep?.message || "Enriching..."}
                                              </>
                                            ) : (
                                              <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich Company Details
                                              </>
                                            )}
                                          </Button>
                                          {(lead.match_score === null || (lead.match_score ?? 0) < 50) && (
                                            <p className="text-xs text-destructive/70">
                                              {lead.match_score === null
                                                ? "Blocked: Match Score not calculated (run Calculate Match Score first)"
                                                : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                            </p>
                                          )}

                                          {/* Step progress indicator */}
                                          {enrichingCompanyDetails === lead.id && companyDetailsStep && (
                                            <div className="bg-muted/50 rounded-md p-3 space-y-2">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                {lead.apollo_not_found ? (
                                                  // ScraperAPI path (4 steps)
                                                  <>
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium bg-yellow-500 text-white">
                                                        ✗
                                                      </div>
                                                      <span className="text-muted-foreground line-through">Apollo</span>
                                                    </div>
                                                    <div className="w-3 h-px bg-border" />
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <div
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                          companyDetailsStep.step === 1
                                                            ? "bg-primary text-primary-foreground animate-pulse"
                                                            : "bg-green-500 text-white"
                                                        }`}
                                                      >
                                                        1
                                                      </div>
                                                      <span className="text-muted-foreground">Scrape</span>
                                                    </div>
                                                    <div className="w-3 h-px bg-border" />
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <div
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                          companyDetailsStep.step === 2
                                                            ? "bg-primary text-primary-foreground animate-pulse"
                                                            : companyDetailsStep.step > 2
                                                              ? "bg-green-500 text-white"
                                                              : "bg-muted text-muted-foreground"
                                                        }`}
                                                      >
                                                        2
                                                      </div>
                                                      <span className="text-muted-foreground">Parse</span>
                                                    </div>
                                                    <div className="w-3 h-px bg-border" />
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <div
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                          companyDetailsStep.step === 3
                                                            ? "bg-primary text-primary-foreground animate-pulse"
                                                            : companyDetailsStep.step > 3
                                                              ? "bg-green-500 text-white"
                                                              : "bg-muted text-muted-foreground"
                                                        }`}
                                                      >
                                                        3
                                                      </div>
                                                      <span className="text-muted-foreground">AI</span>
                                                    </div>
                                                  </>
                                                ) : lead.enrichment_source === "apollo_api" ? (
                                                  // Single step for direct Apollo
                                                  <div className="flex items-center gap-2 text-xs">
                                                    <div
                                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                        companyDetailsStep.step === 1
                                                          ? "bg-primary text-primary-foreground animate-pulse"
                                                          : "bg-green-500 text-white"
                                                      }`}
                                                    >
                                                      1
                                                    </div>
                                                    <span className="text-muted-foreground">Direct retrieval</span>
                                                  </div>
                                                ) : (
                                                  // Two steps for non-Apollo sources (may fallback to scraper)
                                                  <>
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <div
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                          companyDetailsStep.step === 1
                                                            ? "bg-primary text-primary-foreground animate-pulse"
                                                            : "bg-green-500 text-white"
                                                        }`}
                                                      >
                                                        1
                                                      </div>
                                                      <span className="text-muted-foreground">Search Apollo</span>
                                                    </div>
                                                    <div className="w-4 h-px bg-border" />
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <div
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                          companyDetailsStep.step === 2
                                                            ? "bg-primary text-primary-foreground animate-pulse"
                                                            : companyDetailsStep.step > 2
                                                              ? "bg-green-500 text-white"
                                                              : "bg-muted text-muted-foreground"
                                                        }`}
                                                      >
                                                        2
                                                      </div>
                                                      <span className="text-muted-foreground">Get details</span>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {companyDetailsStep.message}
                                              </p>
                                            </div>
                                          )}

                                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <span>• Company Size</span>
                                            <span>• Annual Revenue</span>
                                            <span>• Industry</span>
                                            <span>• Description</span>
                                            <span>• Tech Stack</span>
                                            <span>• LinkedIn URL</span>
                                          </div>

                                          {/* Scraped Data Log Section */}
                                          {lead.scraped_data_log && (
                                            <Accordion type="single" collapsible className="mt-4">
                                              <AccordionItem
                                                value="scraped-data"
                                                className="border rounded-lg bg-muted/30"
                                              >
                                                <AccordionTrigger className="text-xs hover:no-underline px-3 py-2">
                                                  <div className="flex items-center gap-2">
                                                    {lead.scraped_data_log.source === "apollo" ? (
                                                      <>
                                                        <span>🚀 Apollo Enrichment Log</span>
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
                                                        >
                                                          {lead.scraped_data_log.fields_populated?.length || 0} fields
                                                        </Badge>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <span>📄 View Scraped Data</span>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                          {lead.scraped_data_log.services?.length || 0} services found
                                                        </Badge>
                                                      </>
                                                    )}
                                                  </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-3 pb-3">
                                                  <div className="space-y-2 text-xs">
                                                    {/* Apollo Data Display */}
                                                    {lead.scraped_data_log.source === "apollo" &&
                                                      lead.scraped_data_log.apollo_data && (
                                                        <div className="grid gap-1.5">
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Organization:</span>
                                                            <span className="font-medium">
                                                              {lead.scraped_data_log.organization_name}
                                                            </span>
                                                          </div>
                                                          {lead.scraped_data_log.apollo_data.industry && (
                                                            <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Industry:</span>
                                                              <span>{lead.scraped_data_log.apollo_data.industry}</span>
                                                            </div>
                                                          )}
                                                          {lead.scraped_data_log.apollo_data.estimated_employees && (
                                                            <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Employees:</span>
                                                              <span>
                                                                {lead.scraped_data_log.apollo_data.estimated_employees.toLocaleString()}
                                                              </span>
                                                            </div>
                                                          )}
                                                          {lead.scraped_data_log.apollo_data.revenue && (
                                                            <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Revenue:</span>
                                                              <span>{lead.scraped_data_log.apollo_data.revenue}</span>
                                                            </div>
                                                          )}
                                                          {lead.scraped_data_log.apollo_data.founded_year && (
                                                            <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Founded:</span>
                                                              <span>
                                                                {lead.scraped_data_log.apollo_data.founded_year}
                                                              </span>
                                                            </div>
                                                          )}
                                                          {lead.scraped_data_log.apollo_data.city && (
                                                            <div className="flex justify-between">
                                                              <span className="text-muted-foreground">
                                                                HQ Location:
                                                              </span>
                                                              <span>
                                                                {[
                                                                  lead.scraped_data_log.apollo_data.city,
                                                                  lead.scraped_data_log.apollo_data.state,
                                                                  lead.scraped_data_log.apollo_data.country,
                                                                ]
                                                                  .filter(Boolean)
                                                                  .join(", ")}
                                                              </span>
                                                            </div>
                                                          )}
                                                          {lead.scraped_data_log.apollo_data.keywords &&
                                                            lead.scraped_data_log.apollo_data.keywords.length > 0 && (
                                                              <div>
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Keywords:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {lead.scraped_data_log.apollo_data.keywords.map(
                                                                    (kw, idx) => (
                                                                      <span
                                                                        key={idx}
                                                                        className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                                                                      >
                                                                        {kw}
                                                                      </span>
                                                                    ),
                                                                  )}
                                                                </div>
                                                              </div>
                                                            )}
                                                          {lead.scraped_data_log.fields_populated &&
                                                            lead.scraped_data_log.fields_populated.length > 0 && (
                                                              <div className="mt-2 pt-2 border-t border-dashed">
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Fields Populated:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {lead.scraped_data_log.fields_populated.map(
                                                                    (field, idx) => (
                                                                      <Badge
                                                                        key={idx}
                                                                        variant="secondary"
                                                                        className="text-[10px] px-1.5 py-0"
                                                                      >
                                                                        {field}
                                                                      </Badge>
                                                                    ),
                                                                  )}
                                                                </div>
                                                              </div>
                                                            )}
                                                          {/* Enrichment Steps */}
                                                          {lead.scraped_data_log.enrichment_steps &&
                                                            lead.scraped_data_log.enrichment_steps.length > 0 && (
                                                              <div className="mt-2 pt-2 border-t border-dashed">
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Enrichment Steps:
                                                                </span>
                                                                <div className="space-y-1">
                                                                  {lead.scraped_data_log.enrichment_steps.map(
                                                                    (step, idx) => (
                                                                      <div
                                                                        key={idx}
                                                                        className="flex items-center gap-2 text-[10px]"
                                                                      >
                                                                        <Badge
                                                                          variant={
                                                                            step.status === "success"
                                                                              ? "default"
                                                                              : step.status === "failed"
                                                                                ? "destructive"
                                                                                : "secondary"
                                                                          }
                                                                          className="text-[9px] px-1 py-0"
                                                                        >
                                                                          Step {step.step}
                                                                        </Badge>
                                                                        <span className="text-muted-foreground">
                                                                          {step.action.replace(/_/g, " ")}
                                                                        </span>
                                                                        <span
                                                                          className={
                                                                            step.status === "success"
                                                                              ? "text-green-600"
                                                                              : step.status === "failed"
                                                                                ? "text-red-600"
                                                                                : "text-muted-foreground"
                                                                          }
                                                                        >
                                                                          {step.status === "success"
                                                                            ? "✓"
                                                                            : step.status === "failed"
                                                                              ? "✗"
                                                                              : "..."}
                                                                        </span>
                                                                      </div>
                                                                    ),
                                                                  )}
                                                                </div>
                                                              </div>
                                                            )}
                                                        </div>
                                                      )}

                                                    {/* Scraper Data Display (existing) */}
                                                    {lead.scraped_data_log.source !== "apollo" && (
                                                      <div className="grid gap-1.5">
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">Title:</span>
                                                          <span
                                                            className="text-right max-w-[200px] truncate"
                                                            title={lead.scraped_data_log.title || ""}
                                                          >
                                                            {lead.scraped_data_log.title || (
                                                              <span className="text-muted-foreground/50 italic">
                                                                Not found
                                                              </span>
                                                            )}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">H1:</span>
                                                          <span
                                                            className="text-right max-w-[200px] truncate"
                                                            title={lead.scraped_data_log.h1 || ""}
                                                          >
                                                            {lead.scraped_data_log.h1 || (
                                                              <span className="text-muted-foreground/50 italic">
                                                                Not found
                                                              </span>
                                                            )}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">
                                                            Meta Description:
                                                          </span>
                                                          <span
                                                            className="text-right max-w-[200px] truncate"
                                                            title={lead.scraped_data_log.meta_description || ""}
                                                          >
                                                            {lead.scraped_data_log.meta_description || (
                                                              <span className="text-muted-foreground/50 italic">
                                                                Not found
                                                              </span>
                                                            )}
                                                          </span>
                                                        </div>
                                                        {lead.scraped_data_log.meta_keywords && (
                                                          <div>
                                                            <span className="text-muted-foreground block mb-1">
                                                              Meta Keywords:
                                                            </span>
                                                            <span className="text-[10px] block bg-muted/50 p-1.5 rounded break-words">
                                                              {lead.scraped_data_log.meta_keywords}
                                                            </span>
                                                          </div>
                                                        )}
                                                        {lead.scraped_data_log.logo_url && (
                                                          <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">Logo URL:</span>
                                                            <a
                                                              href={
                                                                lead.scraped_data_log.logo_url.startsWith("http")
                                                                  ? lead.scraped_data_log.logo_url
                                                                  : `https://${lead.domain}${lead.scraped_data_log.logo_url}`
                                                              }
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-primary hover:underline flex items-center gap-1"
                                                            >
                                                              View <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                          </div>
                                                        )}
                                                        {lead.scraped_data_log.linkedin && (
                                                          <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">LinkedIn:</span>
                                                            <a
                                                              href={
                                                                lead.scraped_data_log.linkedin.startsWith("http")
                                                                  ? lead.scraped_data_log.linkedin
                                                                  : `https://${lead.scraped_data_log.linkedin}`
                                                              }
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-primary hover:underline flex items-center gap-1"
                                                            >
                                                              View <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                          </div>
                                                        )}
                                                        {lead.scraped_data_log.facebook && (
                                                          <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">Facebook:</span>
                                                            <a
                                                              href={
                                                                lead.scraped_data_log.facebook.startsWith("http")
                                                                  ? lead.scraped_data_log.facebook
                                                                  : `https://${lead.scraped_data_log.facebook}`
                                                              }
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-primary hover:underline flex items-center gap-1"
                                                            >
                                                              View <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                          </div>
                                                        )}
                                                        {lead.scraped_data_log.about_pages &&
                                                          lead.scraped_data_log.about_pages.length > 0 && (
                                                            <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                About Pages ({lead.scraped_data_log.about_pages.length}
                                                                ):
                                                              </span>
                                                              <div className="text-[10px] space-y-0.5">
                                                                {lead.scraped_data_log.about_pages
                                                                  .slice(0, 5)
                                                                  .map((page, idx) => (
                                                                    <a
                                                                      key={idx}
                                                                      href={
                                                                        page.startsWith("http")
                                                                          ? page
                                                                          : `https://${lead.domain}${page}`
                                                                      }
                                                                      target="_blank"
                                                                      rel="noopener noreferrer"
                                                                      className="text-primary hover:underline block truncate"
                                                                    >
                                                                      {page}
                                                                    </a>
                                                                  ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                        {lead.scraped_data_log.nav_links &&
                                                          lead.scraped_data_log.nav_links.length > 0 && (
                                                            <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                Nav Links ({lead.scraped_data_log.nav_links.length}):
                                                              </span>
                                                              <div className="flex flex-wrap gap-1">
                                                                {lead.scraped_data_log.nav_links
                                                                  .slice(0, 15)
                                                                  .map((link, idx) => (
                                                                    <span
                                                                      key={idx}
                                                                      className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                                                                    >
                                                                      {link}
                                                                    </span>
                                                                  ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                        {lead.scraped_data_log.services &&
                                                          lead.scraped_data_log.services.length > 0 && (
                                                            <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                Services Found ({lead.scraped_data_log.services.length}
                                                                ):
                                                              </span>
                                                              <div className="text-[10px] bg-muted/50 p-1.5 rounded max-h-24 overflow-y-auto">
                                                                {lead.scraped_data_log.services.join(" • ")}
                                                              </div>
                                                            </div>
                                                          )}

                                                        {/* Deep Scrape Results Section */}
                                                        {lead.scraped_data_log.deep_scrape && (
                                                          <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground font-medium block mb-2">
                                                              🔍 Deep Scrape Results
                                                            </span>

                                                            {/* Pages Scraped */}
                                                            {lead.scraped_data_log.deep_scrape.pages_scraped?.length >
                                                            0 ? (
                                                              <div className="mb-2">
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Pages Scraped (
                                                                  {
                                                                    lead.scraped_data_log.deep_scrape.pages_scraped
                                                                      .length
                                                                  }
                                                                  ):
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {lead.scraped_data_log.deep_scrape.pages_scraped.map(
                                                                    (url, idx) => (
                                                                      <a
                                                                        key={idx}
                                                                        href={
                                                                          url.startsWith("http")
                                                                            ? url
                                                                            : `https://${lead.domain}${url.startsWith("/") ? "" : "/"}${url}`
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
                                                                      >
                                                                        {url.split("/").pop() || url}
                                                                      </a>
                                                                    ),
                                                                  )}
                                                                </div>
                                                              </div>
                                                            ) : (
                                                              <div className="mb-2 text-muted-foreground/50 italic text-[10px]">
                                                                No high-value pages found to scrape
                                                              </div>
                                                            )}

                                                            {/* Found Data Grid */}
                                                            <div className="grid gap-1.5 text-[11px]">
                                                              {/* Founded Year */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Founded Year:
                                                                </span>
                                                                {lead.scraped_data_log.deep_scrape.founded_year ? (
                                                                  <span className="flex items-center gap-1">
                                                                    {lead.scraped_data_log.deep_scrape.founded_year}
                                                                    {lead.scraped_data_log.deep_scrape.sources
                                                                      ?.founded_year_source && (
                                                                      <Badge
                                                                        variant="outline"
                                                                        className="text-[9px] px-1 py-0"
                                                                      >
                                                                        from{" "}
                                                                        {
                                                                          lead.scraped_data_log.deep_scrape.sources
                                                                            .founded_year_source
                                                                        }
                                                                      </Badge>
                                                                    )}
                                                                  </span>
                                                                ) : (
                                                                  <span className="text-muted-foreground/50 italic">
                                                                    Not found
                                                                  </span>
                                                                )}
                                                              </div>

                                                              {/* Employee Count */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Employee Count:
                                                                </span>
                                                                {lead.scraped_data_log.deep_scrape.employee_count ? (
                                                                  <span className="flex items-center gap-1">
                                                                    {lead.scraped_data_log.deep_scrape.employee_count}
                                                                    {lead.scraped_data_log.deep_scrape.sources
                                                                      ?.employee_count_source && (
                                                                      <Badge
                                                                        variant="outline"
                                                                        className="text-[9px] px-1 py-0"
                                                                      >
                                                                        from{" "}
                                                                        {
                                                                          lead.scraped_data_log.deep_scrape.sources
                                                                            .employee_count_source
                                                                        }
                                                                      </Badge>
                                                                    )}
                                                                  </span>
                                                                ) : (
                                                                  <span className="text-muted-foreground/50 italic">
                                                                    Not found
                                                                  </span>
                                                                )}
                                                              </div>

                                                              {/* Contact Email */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Contact Email:
                                                                </span>
                                                                {lead.scraped_data_log.deep_scrape.contact_email ? (
                                                                  <span className="flex items-center gap-1">
                                                                    <a
                                                                      href={`mailto:${lead.scraped_data_log.deep_scrape.contact_email}`}
                                                                      className="text-primary hover:underline"
                                                                    >
                                                                      {lead.scraped_data_log.deep_scrape.contact_email}
                                                                    </a>
                                                                    {lead.scraped_data_log.deep_scrape
                                                                      .contact_email_personal && (
                                                                      <Badge
                                                                        variant="secondary"
                                                                        className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700"
                                                                      >
                                                                        Personal
                                                                      </Badge>
                                                                    )}
                                                                    {lead.scraped_data_log.deep_scrape.sources
                                                                      ?.contact_email_source && (
                                                                      <Badge
                                                                        variant="outline"
                                                                        className="text-[9px] px-1 py-0"
                                                                      >
                                                                        from{" "}
                                                                        {
                                                                          lead.scraped_data_log.deep_scrape.sources
                                                                            .contact_email_source
                                                                        }
                                                                      </Badge>
                                                                    )}
                                                                  </span>
                                                                ) : (
                                                                  <span className="text-muted-foreground/50 italic">
                                                                    Not found
                                                                  </span>
                                                                )}
                                                              </div>

                                                              {/* Email Validation Status */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Email Validation:
                                                                </span>
                                                                {lead.email_domain_validated ? (
                                                                  <span className="flex items-center gap-1 text-green-600">
                                                                    <span className="text-[10px]">
                                                                      ✓ Matches lead email
                                                                    </span>
                                                                    <Badge className="text-[9px] px-1 py-0 bg-green-100 text-green-700 border-green-300">
                                                                      100% Valid
                                                                    </Badge>
                                                                  </span>
                                                                ) : lead.scraped_data_log?.deep_scrape?.contact_email &&
                                                                  lead.email ? (
                                                                  <span className="text-amber-600 text-[10px]">
                                                                    Different from lead
                                                                  </span>
                                                                ) : (
                                                                  <span className="text-muted-foreground/50 italic text-[10px]">
                                                                    —
                                                                  </span>
                                                                )}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )}

                                                        {/* Company Contacts Found */}
                                                        {lead.company_contacts && lead.company_contacts.length > 0 && (
                                                          <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground font-medium block mb-2">
                                                              📧 Additional Contacts ({lead.company_contacts.length})
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                              {lead.company_contacts.map((contact, idx) => (
                                                                <a
                                                                  key={idx}
                                                                  href={`mailto:${contact.email}`}
                                                                  className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-100"
                                                                >
                                                                  {contact.email}
                                                                  {contact.is_personal && (
                                                                    <Badge
                                                                      variant="secondary"
                                                                      className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700"
                                                                    >
                                                                      Personal
                                                                    </Badge>
                                                                  )}
                                                                </a>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}

                                                        {/* Show message if no deep scrape was performed */}
                                                        {!lead.scraped_data_log.deep_scrape && (
                                                          <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground/50 italic text-[10px]">
                                                              🔍 Deep Scrape: Not performed
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </AccordionContent>
                                              </AccordionItem>
                                            </Accordion>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                  {/* Find Contacts Accordion - Always visible when Apollo enriched */}
                                  <AccordionItem value="find-contacts" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>Find Contacts</span>
                                        {lead.company_contacts &&
                                          lead.company_contacts.filter((c) => c.name).length > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                              {lead.company_contacts.filter((c) => c.name).length} found
                                            </Badge>
                                          )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Find Contacts Button */}
                                        <div className="space-y-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            disabled={
                                              findingContacts === lead.id ||
                                              !lead.domain ||
                                              lead.match_score === null ||
                                              (lead.match_score ?? 0) < 50
                                            }
                                            onClick={() => handleFindContacts(lead)}
                                          >
                                            {findingContacts === lead.id ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching Contacts...
                                              </>
                                            ) : (
                                              <>
                                                <Users className="mr-2 h-4 w-4" />
                                                Find Company Contacts
                                              </>
                                            )}
                                          </Button>

                                          {/* Show disabled state reason */}
                                          {!lead.domain ? (
                                            <p className="text-xs text-muted-foreground text-center">
                                              ⚠️ Domain required. Run enrichment first.
                                            </p>
                                          ) : (
                                            (lead.match_score === null || (lead.match_score ?? 0) < 50) && (
                                              <p className="text-xs text-destructive/70 text-center">
                                                {lead.match_score === null
                                                  ? "Blocked: Match Score not calculated"
                                                  : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                              </p>
                                            )
                                          )}
                                        </div>

                                        {/* Display Found Contacts */}
                                        {lead.company_contacts &&
                                          lead.company_contacts.filter((c) => c.name).length > 0 && (
                                            <div className="space-y-3 pt-2 border-t">
                                              <p className="text-xs text-muted-foreground">Discovered Contacts:</p>
                                              <div className="space-y-2">
                                                {lead.company_contacts
                                                  .filter((contact) => contact.name)
                                                  .map((contact, idx) => (
                                                    <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                                                      <div className="flex items-start justify-between">
                                                        <div>
                                                          <p className="font-medium text-sm">{contact.name}</p>
                                                          {contact.title && (
                                                            <p className="text-xs text-muted-foreground">
                                                              {contact.title}
                                                            </p>
                                                          )}
                                                        </div>
                                                        {contact.email_status === "verified" && (
                                                          <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
                                                            Verified
                                                          </Badge>
                                                        )}
                                                      </div>
                                                      <div className="mt-2 space-y-1">
                                                        {contact.email && (
                                                          <div className="flex items-center gap-2 text-xs">
                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                            <a
                                                              href={`mailto:${contact.email}`}
                                                              className="text-primary hover:underline"
                                                            >
                                                              {contact.email}
                                                            </a>
                                                          </div>
                                                        )}
                                                        {contact.linkedin_url && (
                                                          <div className="flex items-center gap-2 text-xs">
                                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                            <a
                                                              href={contact.linkedin_url}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-primary hover:underline"
                                                            >
                                                              LinkedIn Profile
                                                            </a>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Enrich Contact Accordion - Check if lead exists in company contacts */}
                                  <AccordionItem value="enrich-contact" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>Enrich Contact</span>
                                        {(() => {
                                          // Check if lead exists in company_contacts by email or name
                                          const matchedContact = lead.company_contacts?.find(
                                            (c) =>
                                              (lead.email &&
                                                c.email &&
                                                c.email.toLowerCase() === lead.email.toLowerCase()) ||
                                              (lead.full_name &&
                                                c.name &&
                                                c.name.toLowerCase() === lead.full_name.toLowerCase()),
                                          );
                                          return matchedContact ? (
                                            <Badge className="ml-2 bg-green-100 text-green-800 border-green-300">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Found
                                            </Badge>
                                          ) : null;
                                        })()}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Check if lead contact exists in company_contacts */}
                                        {(() => {
                                          const matchedContact = lead.company_contacts?.find(
                                            (c) =>
                                              (lead.email &&
                                                c.email &&
                                                c.email.toLowerCase() === lead.email.toLowerCase()) ||
                                              (lead.full_name &&
                                                c.name &&
                                                c.name.toLowerCase() === lead.full_name.toLowerCase()),
                                          );

                                          if (matchedContact) {
                                            const contactName = matchedContact.name ||
                                              `${matchedContact.first_name || ""} ${matchedContact.last_name || ""}`.trim();
                                            
                                            // Collect found social profiles
                                            const foundSocials: Array<{ platform: string; url: string; icon: React.ReactNode }> = [];
                                            if (selectedLead?.contact_linkedin || matchedContact.linkedin_url) {
                                              foundSocials.push({
                                                platform: 'linkedin',
                                                url: selectedLead?.contact_linkedin || matchedContact.linkedin_url || '',
                                                icon: <Linkedin className="h-3 w-3" />
                                              });
                                            }
                                            if (selectedLead?.contact_facebook || matchedContact.facebook_url) {
                                              foundSocials.push({
                                                platform: 'facebook',
                                                url: selectedLead?.contact_facebook || matchedContact.facebook_url || '',
                                                icon: <Facebook className="h-3 w-3" />
                                              });
                                            }
                                            if (selectedLead?.contact_youtube || matchedContact.youtube_url) {
                                              foundSocials.push({
                                                platform: 'youtube',
                                                url: selectedLead?.contact_youtube || matchedContact.youtube_url || '',
                                                icon: <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                              });
                                            }
                                            if (matchedContact.twitter_url) {
                                              foundSocials.push({
                                                platform: 'twitter',
                                                url: matchedContact.twitter_url,
                                                icon: <Twitter className="h-3 w-3" />
                                              });
                                            }
                                            if (matchedContact.github_url) {
                                              foundSocials.push({
                                                platform: 'github',
                                                url: matchedContact.github_url,
                                                icon: <Github className="h-3 w-3" />
                                              });
                                            }

                                            return (
                                              <div className="space-y-3">
                                                {/* Compact display: Name + Social profiles only */}
                                                <div className="space-y-2">
                                                  {/* Contact name */}
                                                  {contactName && (
                                                    <p className="text-sm font-medium">{contactName}</p>
                                                  )}
                                                  
                                                  {/* Social profiles only */}
                                                  <div className="space-y-1">
                                                    {foundSocials.length > 0 ? (
                                                      foundSocials.map(({ platform, url, icon }) => (
                                                        <div key={platform} className="flex items-center gap-2 text-xs">
                                                          {icon}
                                                          <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline truncate"
                                                          >
                                                            {url.replace("https://", "").replace("www.", "").replace("linkedin.com/", "").replace("facebook.com/", "").replace("youtube.com/", "").replace("twitter.com/", "").replace("github.com/", "")}
                                                          </a>
                                                        </div>
                                                      ))
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">No socials found</span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* View More collapsible */}
                                                <Collapsible>
                                                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                    <ChevronDown className="h-3 w-3" />
                                                    <span>View More</span>
                                                  </CollapsibleTrigger>
                                                  <CollapsibleContent className="mt-3 space-y-3">
                                                    {/* Contact details */}
                                                    <div className="space-y-2 text-xs border-t border-border pt-3">
                                                      {matchedContact.title && (
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">Title</span>
                                                          <span>{matchedContact.title}</span>
                                                        </div>
                                                      )}
                                                      {matchedContact.email && (
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">Email</span>
                                                          <a href={`mailto:${matchedContact.email}`} className="text-primary hover:underline">
                                                            {matchedContact.email}
                                                          </a>
                                                        </div>
                                                      )}
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Source</span>
                                                        <span>{matchedContact.source === "apollo_people_search" ? "Apollo" : "Scraped"}</span>
                                                      </div>
                                                    </div>

                                                    {/* Enrichment logs */}
                                                    {matchedContact.social_search_logs && matchedContact.social_search_logs.length > 0 && (
                                                      <div className="border-t border-border pt-3 space-y-2">
                                                        <p className="text-xs text-muted-foreground font-medium">Enrichment Logs</p>
                                                        {matchedContact.social_search_logs.map((log: any, idx: number) => (
                                                          <div key={idx} className="bg-muted/50 rounded p-2 text-xs space-y-1">
                                                            <div className="flex items-center gap-2">
                                                              <span className="font-medium capitalize">{log.platform}</span>
                                                              {log.found ? (
                                                                <CheckCircle className="h-3 w-3 text-green-600" />
                                                              ) : (
                                                                <XCircle className="h-3 w-3 text-red-500" />
                                                              )}
                                                              <span className="text-muted-foreground">
                                                                via {log.source === "apollo" ? "Apollo" : "Google"}
                                                              </span>
                                                            </div>
                                                            {log.query && (
                                                              <p className="text-muted-foreground font-mono text-[10px] break-all">
                                                                Query: {log.query}
                                                              </p>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}

                                                    {/* Re-search button */}
                                                    <div className="pt-2 space-y-2">
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full"
                                                        disabled={enrichingContact === lead.id || !lead.email || !lead.full_name}
                                                        onClick={() => handleEnrichContact(lead)}
                                                      >
                                                        {enrichingContact === lead.id ? (
                                                          <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Searching...
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Search className="mr-2 h-4 w-4" />
                                                            Re-search in Apollo
                                                          </>
                                                        )}
                                                      </Button>
                                                      
                                                      {/* Get contact details with Clay - enabled when LinkedIn URL exists */}
                                                      {(() => {
                                                        const linkedinUrl = selectedLead?.contact_linkedin || matchedContact.linkedin_url;
                                                        return (
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                            disabled={!linkedinUrl || enrichingWithClay === lead.id}
                                                            onClick={() => linkedinUrl && handleEnrichWithClay(lead, linkedinUrl)}
                                                          >
                                                            {enrichingWithClay === lead.id ? (
                                                              <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Enriching...
                                                              </>
                                                            ) : (
                                                              <>
                                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                                Get contact details with Clay
                                                              </>
                                                            )}
                                                          </Button>
                                                        );
                                                      })()}
                                                    </div>
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              </div>
                                            );
                                          }

                                          // Contact not found in company_contacts
                                          return (
                                            <div className="space-y-3">
                                              {/* Show lead's current data */}
                                              <div className="border rounded-lg p-3 space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">Lead Data</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                  <span className="text-muted-foreground">Name:</span>
                                                  <span>{lead.full_name}</span>
                                                  <span className="text-muted-foreground">Email:</span>
                                                  <span>{lead.email || "—"}</span>
                                                  <span className="text-muted-foreground">Company:</span>
                                                  <span>{lead.company || "—"}</span>
                                                  <span className="text-muted-foreground">Domain:</span>
                                                  <span>{lead.domain || "—"}</span>
                                                </div>
                                              </div>

                                              {/* Search Button */}
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                disabled={
                                                  enrichingContact === lead.id || !lead.email || !lead.full_name
                                                }
                                                onClick={() => handleEnrichContact(lead)}
                                              >
                                                {enrichingContact === lead.id ? (
                                                  <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Searching...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Search className="mr-2 h-4 w-4" />
                                                    Enrich Contact
                                                  </>
                                                )}
                                              </Button>
                                              {(!lead.email || !lead.full_name) && (
                                                <p className="text-xs text-muted-foreground">
                                                  Name and email required to search Apollo.
                                                </p>
                                              )}

                                              {/* Visual Stepper - Show when enriching or when we have steps */}
                                              {(enrichingContact === lead.id || enrichContactSteps) && (
                                                <EnrichContactStepper
                                                  steps={enrichContactSteps}
                                                  isLoading={enrichingContact === lead.id}
                                                  enrichedContact={enrichedContactResult}
                                                />
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Company News Accordion - After Find Contacts */}
                                  <AccordionItem value="company-news" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <Newspaper className="h-4 w-4" />
                                        <span>Company News</span>
                                        {lead.news &&
                                          (() => {
                                            try {
                                              const newsData = JSON.parse(lead.news);
                                              if (newsData.news_count > 0) {
                                                return (
                                                  <Badge variant="secondary" className="ml-2">
                                                    {newsData.news_count} articles
                                                  </Badge>
                                                );
                                              }
                                            } catch {}
                                            return null;
                                          })()}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Get Company News Button */}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          disabled={
                                            fetchingNews === lead.id ||
                                            !lead.domain ||
                                            lead.match_score === null ||
                                            (lead.match_score ?? 0) < 50
                                          }
                                          onClick={() => handleGetCompanyNews(lead)}
                                        >
                                          {fetchingNews === lead.id ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Fetching News...
                                            </>
                                          ) : (
                                            <>
                                              <Newspaper className="mr-2 h-4 w-4" />
                                              Get Company News
                                            </>
                                          )}
                                        </Button>
                                        {!lead.domain ? (
                                          <p className="text-xs text-muted-foreground">
                                            Domain required. Run enrichment first.
                                          </p>
                                        ) : (
                                          (lead.match_score === null || (lead.match_score ?? 0) < 50) && (
                                            <p className="text-xs text-destructive/70">
                                              {lead.match_score === null
                                                ? "Blocked: Match Score not calculated"
                                                : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                            </p>
                                          )
                                        )}

                                        {/* Display News Results with Logs */}
                                        {lead.news &&
                                          (() => {
                                            try {
                                              const newsData = JSON.parse(lead.news);
                                              return (
                                                <div className="space-y-3 pt-2 border-t">
                                                  {/* Search Logs */}
                                                  <Collapsible>
                                                    <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                                                      <ChevronRight className="h-3 w-3 transition-transform duration-200 data-[state=open]:rotate-90" />
                                                      View Search Logs
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                                                      <p>
                                                        <strong>Query:</strong> {newsData.search_query}
                                                      </p>
                                                      <p>
                                                        <strong>Searched:</strong>{" "}
                                                        {new Date(newsData.searched_at).toLocaleString()}
                                                      </p>
                                                      <p>
                                                        <strong>Results:</strong> {newsData.news_count} articles found
                                                      </p>
                                                    </CollapsibleContent>
                                                  </Collapsible>

                                                  {/* News Items */}
                                                  {newsData.items?.length > 0 ? (
                                                    <div className="space-y-2">
                                                      <p className="text-xs text-muted-foreground">Latest News:</p>
                                                      {newsData.items.map((item: any, idx: number) => (
                                                        <div
                                                          key={idx}
                                                          className="p-3 border rounded-lg bg-muted/30 space-y-2"
                                                        >
                                                          {/* Title with link */}
                                                          <a
                                                            href={item.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-sm text-primary hover:underline block"
                                                          >
                                                            {item.title}
                                                          </a>

                                                          {/* Source and date */}
                                                          <p className="text-xs text-muted-foreground">
                                                            {item.source} • {item.date}
                                                          </p>

                                                          {/* Snippet as description */}
                                                          {item.snippet && (
                                                            <p className="text-xs text-foreground/80 leading-relaxed">
                                                              {item.snippet}
                                                            </p>
                                                          )}

                                                          {/* Explicit link to article */}
                                                          {item.link && (
                                                            <a
                                                              href={item.link}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                                            >
                                                              <ExternalLink className="h-3 w-3" />
                                                              Read full article
                                                            </a>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                      No news articles found.
                                                    </p>
                                                  )}
                                                </div>
                                              );
                                            } catch {
                                              // Fallback for old text format
                                              return (
                                                <div className="space-y-2 pt-2 border-t">
                                                  <pre className="text-xs whitespace-pre-wrap">{lead.news}</pre>
                                                </div>
                                              );
                                            }
                                          })()}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Enrichment Logs from Clay */}
                                  <AccordionItem value="clay-enrichments" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Enrichment Logs from Clay</span>
                                        {clayEnrichments.length > 0 && (
                                          <Badge variant="secondary" className="ml-2">
                                            {clayEnrichments.length} {clayEnrichments.length === 1 ? 'log' : 'logs'}
                                          </Badge>
                                        )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {clayEnrichments.length > 0 ? (
                                          clayEnrichments.map((enrichment) => (
                                            <div key={enrichment.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                                              {/* Header with timestamp */}
                                              <div className="flex items-center justify-between">
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(enrichment.created_at).toLocaleString()}
                                                </p>
                                                <Badge variant="outline" className="text-[10px]">From Clay</Badge>
                                              </div>

                                              {/* Contact Info */}
                                              <div className="grid gap-2 text-sm">
                                                {enrichment.full_name && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Name:</span>
                                                    <span className="font-medium">{enrichment.full_name}</span>
                                                  </div>
                                                )}
                                                {enrichment.title_clay && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Title:</span>
                                                    <span>{enrichment.title_clay}</span>
                                                  </div>
                                                )}
                                                {enrichment.company_clay && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Company:</span>
                                                    <span>{enrichment.company_clay}</span>
                                                  </div>
                                                )}
                                                {enrichment.email && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Email:</span>
                                                    <a href={`mailto:${enrichment.email}`} className="text-primary hover:underline">
                                                      {enrichment.email}
                                                    </a>
                                                  </div>
                                                )}
                                                {enrichment.phone_clay && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Phone:</span>
                                                    <span>{enrichment.phone_clay}</span>
                                                  </div>
                                                )}
                                                {enrichment.location_clay && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Location:</span>
                                                    <span>{enrichment.location_clay}</span>
                                                  </div>
                                                )}
                                                {enrichment.latest_experience_clay && (
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Latest Experience:</span>
                                                    <span>{enrichment.latest_experience_clay}</span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Social Profiles */}
                                              {(enrichment.linkedin || enrichment.facebook_url_clay || enrichment.twitter_url_clay) && (
                                                <div className="pt-2 border-t space-y-1">
                                                  <p className="text-xs text-muted-foreground font-medium">Social Profiles:</p>
                                                  {enrichment.linkedin && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <Linkedin className="h-3 w-3" />
                                                      <a
                                                        href={enrichment.linkedin}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline truncate"
                                                      >
                                                        {enrichment.linkedin.replace("https://", "").replace("www.", "")}
                                                      </a>
                                                    </div>
                                                  )}
                                                  {enrichment.facebook_url_clay && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <Facebook className="h-3 w-3" />
                                                      <a
                                                        href={enrichment.facebook_url_clay}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline truncate"
                                                      >
                                                        {enrichment.facebook_url_clay.replace("https://", "").replace("www.", "")}
                                                      </a>
                                                    </div>
                                                  )}
                                                  {enrichment.twitter_url_clay && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <Twitter className="h-3 w-3" />
                                                      <a
                                                        href={enrichment.twitter_url_clay}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline truncate"
                                                      >
                                                        {enrichment.twitter_url_clay.replace("https://", "").replace("www.", "")}
                                                      </a>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* Raw Response Collapsible */}
                                              <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Raw Response
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <pre className="mt-2 p-2 bg-background rounded border text-[10px] font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-48 overflow-y-auto">
                                                    {JSON.stringify(enrichment.raw_response, null, 2)}
                                                  </pre>
                                                </CollapsibleContent>
                                              </Collapsible>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-sm text-muted-foreground">
                                            No Clay enrichment logs yet. Send data from Clay to see logs here.
                                          </p>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
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
          </div>
        </div>
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

      {/* Description Modal */}
      <Dialog open={!!descriptionModalLead} onOpenChange={(open) => !open && setDescriptionModalLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Description</DialogTitle>
            <DialogDescription>{descriptionModalLead?.company || descriptionModalLead?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 1. Short Summary Section - First */}
            {descriptionModalLead?.short_summary ? (
              <div className="bg-muted/50 py-4 px-0 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Short Summary</h4>
                <p className="text-sm">{descriptionModalLead.short_summary}</p>
              </div>
            ) : (
              <div className="bg-muted/50 py-4 px-0 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Short Summary</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Generate a concise 2-3 line summary of what the business does and where it operates.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => descriptionModalLead && handleGenerateShortSummary(descriptionModalLead)}
                  disabled={generatingShortSummary || (!descriptionModalLead?.description && !descriptionModalLead?.products_services && !descriptionModalLead?.company_industry)}
                  className="w-full"
                >
                  {generatingShortSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Short Summary
                    </>
                  )}
                </Button>
                {!descriptionModalLead?.description && !descriptionModalLead?.products_services && !descriptionModalLead?.company_industry && (
                  <p className="text-xs text-destructive mt-2">
                    Company details required. Run "Enrich Company Details" first.
                  </p>
                )}
              </div>
            )}

            {/* 2. Must Knows Section - Opened by default */}
            <Accordion type="single" collapsible defaultValue="must-knows" className="w-full">
              <AccordionItem value="must-knows" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Key Insights</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.must_knows ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{descriptionModalLead.must_knows}</div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Generate 4-6 quick bullet points summarizing key company facts for SDR briefings:
                        who they are, what they do, how big they are, where they operate, and anything notable.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => descriptionModalLead && handleGenerateMustKnows(descriptionModalLead)}
                        disabled={generatingMustKnows || !descriptionModalLead?.company}
                        className="w-full"
                      >
                        {generatingMustKnows ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Must Knows
                          </>
                        )}
                      </Button>
                      {!descriptionModalLead?.company && (
                        <p className="text-xs text-destructive">
                          Company name is required for Must Knows generation.
                        </p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 3. Detailed Company Profile - Closed */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="long-summary" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Company Overview</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.long_summary ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{descriptionModalLead.long_summary}</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Generate a rich 5-8 line company profile including founding history, 
                        operations, scale, location, and notable achievements.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => descriptionModalLead && handleGenerateLongSummary(descriptionModalLead)}
                        disabled={generatingLongSummary || (!descriptionModalLead?.description && !descriptionModalLead?.products_services && !descriptionModalLead?.company_industry)}
                        className="w-full"
                      >
                        {generatingLongSummary ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Detailed Profile
                          </>
                        )}
                      </Button>
                      {!descriptionModalLead?.description && !descriptionModalLead?.products_services && !descriptionModalLead?.company_industry && (
                        <p className="text-xs text-destructive">
                          Company details required. Run "Enrich Company Details" first.
                        </p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 4. Products & Services Summary - Closed */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="products-summary" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Products & Services</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.products_services_summary ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{descriptionModalLead.products_services_summary}</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Generate a professional summary of the company's products and services,
                        including core offerings, specialties, and customer segments.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => descriptionModalLead && handleGenerateProductsSummary(descriptionModalLead)}
                        disabled={generatingProductsSummary || (!descriptionModalLead?.products_services && !descriptionModalLead?.description && !descriptionModalLead?.company_industry)}
                        className="w-full"
                      >
                        {generatingProductsSummary ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Products Summary
                          </>
                        )}
                      </Button>
                      {!descriptionModalLead?.products_services && !descriptionModalLead?.description && !descriptionModalLead?.company_industry && (
                        <p className="text-xs text-destructive">
                          Products/services, description, or industry data required. Run "Enrich Company Details" first.
                        </p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 5. Likely Business Cases - Last */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="business-cases" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Business Use Cases</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.likely_business_cases ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {descriptionModalLead.likely_business_cases}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {descriptionModalLead?.vehicles_count ||
                      descriptionModalLead?.truck_types ||
                      descriptionModalLead?.features ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Generate likely business cases for vehicle tracking based on this company's 
                            fleet profile, industry, and operational needs.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => descriptionModalLead && handleGenerateBusinessCases(descriptionModalLead)}
                            disabled={generatingBusinessCases}
                            className="w-full"
                          >
                            {generatingBusinessCases ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Likely Business Cases
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No vehicle data available. Add vehicle information during lead import to enable this feature.
                        </p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </DialogContent>
      </Dialog>

      {/* News Modal - matches drawer format */}
      <Dialog open={showNewsModal} onOpenChange={setShowNewsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>News</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {newsModalData?.items?.length ? (
              newsModalData.items.map((item: any, idx: number) => (
                <div key={idx} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm text-primary hover:underline block"
                  >
                    {item.title}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {item.source} • {item.date}
                  </p>
                  {item.snippet && <p className="text-xs text-foreground/80 leading-relaxed">{item.snippet}</p>}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Read full article
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No news articles found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
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

              {/* Vehicle Details - Collapsible Section */}
              {(selectedLead.vehicles_count ||
                selectedLead.confirm_vehicles_50_plus ||
                selectedLead.truck_types ||
                selectedLead.features) && (
                <Collapsible className="border-t pt-4">
                  <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    Vehicle Details
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLead.vehicles_count && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Fleet Size</p>
                          <p className="text-sm">{selectedLead.vehicles_count}</p>
                        </div>
                      )}
                      {selectedLead.confirm_vehicles_50_plus && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Confirmed 50+</p>
                          <p className="text-sm">{selectedLead.confirm_vehicles_50_plus}</p>
                        </div>
                      )}
                      {selectedLead.truck_types && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Vehicle Types</p>
                          <p className="text-sm">{selectedLead.truck_types}</p>
                        </div>
                      )}
                      {selectedLead.features && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Features</p>
                          <p className="text-sm">{selectedLead.features}</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
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

      {/* Contacts Modal */}
      <Dialog open={showContactsModal} onOpenChange={setShowContactsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contacts for {contactsModalLead?.company || contactsModalLead?.full_name}</DialogTitle>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Apollo Contacts */}
              {contactsModalLead?.company_contacts
                ?.filter((c) => c.source === "apollo_people_search")
                .map((contact, idx) => (
                  <TableRow key={`apollo-${idx}`}>
                    <TableCell className="font-medium">
                      {contact.name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "—"}
                    </TableCell>
                    <TableCell>{contact.title || "—"}</TableCell>
                    <TableCell>
                      {contact.found_without_role_filter ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline text-sm">
                          {contact.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Apollo
                        </Badge>
                        {contact.found_without_role_filter && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                            Name Only
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.email_status === "verified" && !contact.found_without_role_filter && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.linkedin_url ? (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}

              {/* Scraped Contacts (from company_contacts with other sources) */}
              {contactsModalLead?.company_contacts
                ?.filter((c) => c.source !== "apollo_people_search")
                .map((contact, idx) => (
                  <TableRow key={`scraper-${idx}`}>
                    <TableCell className="font-medium">{contact.name || "—"}</TableCell>
                    <TableCell>{contact.title || "—"}</TableCell>
                    <TableCell>
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline text-sm">
                        {contact.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Google
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contact.is_personal && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Personal</Badge>
                      )}
                    </TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                ))}

              {/* Primary scraped contact_email (if exists and not already in company_contacts) */}
              {contactsModalLead?.contact_email &&
                !contactsModalLead?.company_contacts?.some((c) => c.email === contactsModalLead.contact_email) && (
                  <TableRow>
                    <TableCell className="font-medium">—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${contactsModalLead.contact_email}`}
                        className="text-primary hover:underline text-sm"
                      >
                        {contactsModalLead.contact_email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Google
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contactsModalLead.contact_email_personal && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Personal</Badge>
                      )}
                      {contactsModalLead.email_domain_validated && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">Validated</Badge>
                      )}
                    </TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>

          {/* Empty state */}
          {!contactsModalLead?.company_contacts?.length && !contactsModalLead?.contact_email && (
            <p className="text-muted-foreground text-center py-4">No contacts found</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
export default LeadsTable;
