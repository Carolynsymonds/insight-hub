import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Sparkles, Loader2, Trash2, ExternalLink, Link2, Info, X, MapPin, CheckCircle, XCircle, Users, Mail, Newspaper, ChevronRight, ChevronDown, Linkedin, Instagram, Facebook, ChevronsRight, Twitter, Github, ArrowDown, Download, FileText, Shield, Zap, Globe, ArrowRight } from "lucide-react";
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
      facebook: {
        valid: boolean;
        reason: string;
      };
      linkedin: {
        valid: boolean;
        reason: string;
      };
      instagram: {
        valid: boolean;
        reason: string;
      };
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
    // Common (older versions used `source`; newer uses `primary_source`)
    source?: string;
    primary_source?: string;
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
      organization_name?: string;
      fields_populated?: string[];
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
    // Supplemental scrape for Apollo sources (website data collected in addition to Apollo)
    supplemental_scrape?: {
      scraped_data?: {
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
      };
      deep_scrape?: {
        pages_scraped?: string[];
        founded_year?: string | null;
        employee_count?: string | null;
        contact_email?: string | null;
        contact_email_personal?: boolean;
        sources?: {
          founded_year_source?: string;
          employee_count_source?: string;
          contact_email_source?: string;
        } | null;
      };
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
  domainFilter?: "all" | "valid" | "invalid" | "not_enriched" | "today_enriched";
  onDomainFilterChange?: (value: "all" | "valid" | "invalid" | "not_enriched" | "today_enriched") => void;
  viewMode?: ViewMode;
  userRole?: 'admin' | 'user' | 'client' | null;
}
const LeadsTable = ({
  leads,
  onEnrichComplete,
  hideFilterBar = false,
  domainFilter: externalDomainFilter,
  onDomainFilterChange,
  viewMode = 'all',
  userRole = null
}: LeadsTableProps) => {
  // Check if user is a client to hide provider-specific UI
  const isClientRole = userRole === 'client';
  const {
    toast
  } = useToast();
  const [enrichingSource, setEnrichingSource] = useState<{
    leadId: string;
    source: string;
  } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLogsForSource, setShowLogsForSource] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState<string | null>(null);
  const [scoringDomain, setScoringDomain] = useState<string | null>(null);
  const [calculatingMatchScore, setCalculatingMatchScore] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState<{
    leadId: string;
    source: string;
  } | null>(null);
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<string | null>(null);
  const [findingCoordinates, setFindingCoordinates] = useState<string | null>(null);
  const [enrichingCompanyDetails, setEnrichingCompanyDetails] = useState<string | null>(null);
  const [companyDetailsStep, setCompanyDetailsStep] = useState<{
    step: number;
    message: string;
  } | null>(null);
  const [fetchingNews, setFetchingNews] = useState<string | null>(null);
  const [enrichingFacebook, setEnrichingFacebook] = useState<string | null>(null);
  const [enrichingLinkedin, setEnrichingLinkedin] = useState<string | null>(null);
  const [enrichingInstagram, setEnrichingInstagram] = useState<string | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    text: string;
  }>({
    title: "",
    text: ""
  });
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
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [pipelineCompleted, setPipelineCompleted] = useState<{ domainValidated: boolean; socialsSearched: boolean }>({ domainValidated: false, socialsSearched: false });
  const [pipelineDuration, setPipelineDuration] = useState<Record<string, number>>({});
  const [descriptionModalLead, setDescriptionModalLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [enrichContactSteps, setEnrichContactSteps] = useState<{
    check_existing: {
      status: string;
      message?: string;
      data?: Record<string, any>;
    };
    apollo_search: {
      status: string;
      message?: string;
      data?: Record<string, any>;
    };
    google_socials: {
      status: string;
      message?: string;
      data?: Record<string, any>;
    };
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
    profile_match_score: number | null;
    profile_match_confidence: string | null;
    profile_match_reasons: string[] | null;
    profile_match_evaluated_at: string | null;
  }>>([]);
  const [clayCompanyEnrichments, setClayCompanyEnrichments] = useState<Array<{
    id: string;
    lead_id: string;
    domain: string | null;
    size_clay: string | null;
    industry_clay: string | null;
    locality_clay: string | null;
    logo_clay: string | null;
    annual_revenue_clay: string | null;
    founded_clay: string | null;
    description_clay: string | null;
    created_at: string | null;
    raw_response: any;
  }>>([]);
  const [evaluatingMatchId, setEvaluatingMatchId] = useState<string | null>(null);
  const [bulkEvaluatingMatches, setBulkEvaluatingMatches] = useState(false);
  const [bulkEvaluateProgress, setBulkEvaluateProgress] = useState({
    current: 0,
    total: 0
  });
  const [allClayEnrichments, setAllClayEnrichments] = useState<Record<string, {
    full_name: string | null;
    email: string | null;
    linkedin: string | null;
    title_clay: string | null;
    company_clay: string | null;
    location_clay: string | null;
    phone_clay: string | null;
    summary_clay: string | null;
    profile_match_score: number | null;
    profile_match_confidence: string | null;
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
      const {
        error
      } = await supabase.from("leads").delete().in("id", Array.from(selectedLeads));
      if (error) throw error;
      toast({
        title: "Success",
        description: `${selectedLeads.size} leads deleted.`
      });
      setSelectedLeads(new Set());
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Fetch clay enrichments when selectedLead changes
  useEffect(() => {
    const fetchClayEnrichments = async () => {
      if (!selectedLead) {
        setClayEnrichments([]);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('clay_enrichments').select('*').eq('lead_id', selectedLead.id).order('created_at', {
        ascending: false
      }).limit(1);
      if (error) {
        console.error('Error fetching clay enrichments:', error);
        return;
      }

      // Cast the data to include new match evaluation fields
      const enrichmentsWithMatch = (data || []).map(d => ({
        ...d,
        profile_match_score: d.profile_match_score as number | null,
        profile_match_confidence: d.profile_match_confidence as string | null,
        profile_match_reasons: d.profile_match_reasons as string[] | null,
        profile_match_evaluated_at: d.profile_match_evaluated_at as string | null
      }));
      setClayEnrichments(enrichmentsWithMatch);
    };
    fetchClayEnrichments();
  }, [selectedLead]);

  // Fetch clay company enrichments when selectedLead changes
  useEffect(() => {
    const fetchClayCompanyEnrichments = async () => {
      if (!selectedLead) {
        setClayCompanyEnrichments([]);
        return;
      }
      const { data, error } = await supabase
        .from('clay_company_enrichment')
        .select('*')
        .eq('lead_id', selectedLead.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) {
        console.error('Error fetching clay company enrichments:', error);
        return;
      }
      setClayCompanyEnrichments(data || []);
    };
    fetchClayCompanyEnrichments();
  }, [selectedLead]);

  // Fetch clay enrichments for all leads to display in table columns
  useEffect(() => {
    const fetchAllClayEnrichments = async () => {
      if (leads.length === 0) {
        setAllClayEnrichments({});
        return;
      }
      const leadIds = leads.map(l => l.id);
      const {
        data,
        error
      } = await supabase.from('clay_enrichments').select('lead_id, full_name, email, linkedin, title_clay, company_clay, location_clay, phone_clay, summary_clay, profile_match_score, profile_match_confidence, created_at').in('lead_id', leadIds).order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('Error fetching all clay enrichments:', error);
        return;
      }

      // Create a map of lead_id -> enrichment data (use the most recent one per lead - first in desc order)
      const enrichmentMap: Record<string, {
        full_name: string | null;
        email: string | null;
        linkedin: string | null;
        title_clay: string | null;
        company_clay: string | null;
        location_clay: string | null;
        phone_clay: string | null;
        summary_clay: string | null;
        profile_match_score: number | null;
        profile_match_confidence: string | null;
      }> = {};
      data?.forEach(enrichment => {
        // Only take the first (most recent) record for each lead_id
        if (!enrichmentMap[enrichment.lead_id]) {
          enrichmentMap[enrichment.lead_id] = {
            full_name: enrichment.full_name,
            email: enrichment.email,
            linkedin: enrichment.linkedin,
            title_clay: enrichment.title_clay,
            company_clay: enrichment.company_clay,
            location_clay: enrichment.location_clay,
            phone_clay: enrichment.phone_clay,
            summary_clay: enrichment.summary_clay,
            profile_match_score: enrichment.profile_match_score,
            profile_match_confidence: enrichment.profile_match_confidence
          };
        }
      });
      setAllClayEnrichments(enrichmentMap);
    };
    fetchAllClayEnrichments();
  }, [leads]);

  // Filter leads based on domain validity (Match Score >= 50% = valid OR at least 1 social validated)
  const filteredLeads = leads.filter(lead => {
    if (domainFilter === "all") return true;
    
    // Check if at least one social is validated
    const hasValidatedSocial = (
      lead.facebook_validated === true ||
      lead.linkedin_validated === true ||
      lead.instagram_validated === true
    );
    
    // Valid: match score >= 50 OR at least 1 social validated
    if (domainFilter === "valid") {
      return (lead.match_score !== null && lead.match_score >= 50) || hasValidatedSocial;
    }
    
      // Invalid: enriched but match score is null or < 50 AND no socials validated
      // Exclude not-enriched leads (those should use the "not_enriched" filter)
      if (domainFilter === "invalid") {
        const isEnriched = lead.enriched_at !== null;
        return isEnriched && (lead.match_score === null || lead.match_score < 50) && !hasValidatedSocial;
      }
    
    return true;
  }).sort((a, b) => {
    // Apply sorting for contact and all views when showing valid leads
    if (viewMode === 'contact' || viewMode === 'all') {
      // Check if leads have validated socials
      const aHasValidSocials = a.facebook_validated === true || 
                               a.linkedin_validated === true || 
                               a.instagram_validated === true;
      const bHasValidSocials = b.facebook_validated === true || 
                               b.linkedin_validated === true || 
                               b.instagram_validated === true;
      
      // Get match scores (treat null as -1 for sorting)
      const aScore = a.match_score ?? -1;
      const bScore = b.match_score ?? -1;
      
      // Primary: Sort by match score (descending - higher first)
      // Leads with valid match score (>= 50) come first
      const aHasValidScore = a.match_score !== null && a.match_score >= 50;
      const bHasValidScore = b.match_score !== null && b.match_score >= 50;
      
      // Valid score leads first, then by score descending
      if (aHasValidScore && !bHasValidScore) return -1;
      if (!aHasValidScore && bHasValidScore) return 1;
      
      // If both have valid scores, sort by score descending
      if (aHasValidScore && bHasValidScore) {
        if (aScore !== bScore) return bScore - aScore;
      }
      
      // Secondary: Among remaining leads, those with valid socials come first
      if (aHasValidSocials && !bHasValidSocials) return -1;
      if (!aHasValidSocials && bHasValidSocials) return 1;
      
      // Fallback: sort by name for consistency
      return (a.full_name || '').localeCompare(b.full_name || '');
    }
    
    return 0;
  });
  const wasFoundViaGoogle = (logs: EnrichmentLog[] | null): boolean => {
    if (!logs) return false;
    return logs.some(log => log.domain && (log.source === "google_knowledge_graph" || log.source === "google_local_results"));
  };
  const handleExportCompanyCSV = () => {
    const headers = ["Company Name", "Domain", "Confidence Score"];
    const rows = filteredLeads.map(lead => [lead.company || "", lead.domain || "", lead.enrichment_confidence !== null ? `${lead.enrichment_confidence}%` : ""]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `company-details-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Complete",
      description: `Exported ${filteredLeads.length} company details to CSV`
    });
  };
  const handleExportContactsCSV = () => {
    const headers = ["Name", "LinkedIn", "Confidence Score", "Job Title", "AI Summary"];
    const rows = filteredLeads.map(lead => {
      const clayData = allClayEnrichments[lead.id];
      return [clayData?.full_name || lead.full_name || "", clayData?.linkedin || "", clayData?.profile_match_score !== null && clayData?.profile_match_score !== undefined ? `${clayData.profile_match_score}%` : "", clayData?.title_clay || "", clayData?.summary_clay || ""];
    });
    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contact-details-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Complete",
      description: `Exported ${filteredLeads.length} contact details to CSV`
    });
  };
  const handleFindCoordinates = async (lead: Lead) => {
    setFindingCoordinates(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("find-company-coordinates", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          sourceUrl: lead.source_url
        }
      });
      if (error) throw error;
      if (data.notFound) {
        toast({
          title: "No Coordinates Found",
          description: "Could not locate GPS coordinates for this company"
        });
      } else {
        toast({
          title: "Coordinates Found!",
          description: `Located at ${data.latitude}, ${data.longitude}`
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      const errorMessage = error.message?.includes('quota') || error.message?.includes('rate limit') ? "SerpAPI account has hit its request quota. Please try again later." : error.message;
      toast({
        title: "Coordinate Lookup Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setFindingCoordinates(null);
    }
  };
  const handleDiagnose = async (lead: Lead) => {
    setDiagnosing({
      leadId: lead.id,
      source: "all"
    });
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("diagnose-enrichment", {
        body: {
          leadId: lead.id,
          leadData: {
            company: lead.company,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode,
            email: lead.email,
            mics_sector: lead.mics_sector,
            full_name: lead.full_name
          },
          enrichmentLogs: lead.enrichment_logs || []
        }
      });
      if (error) throw error;
      toast({
        title: "Diagnosis Complete",
        description: "AI analysis has been generated."
      });
      onEnrichComplete();
    } catch (error: any) {
      console.error("Diagnosis error:", error);
      toast({
        title: "Diagnosis Failed",
        description: error.message || "Failed to generate diagnosis.",
        variant: "destructive"
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
    if (source === "google_knowledge_graph" || source === "google_knowledge_graph_error" || source === "google_local_results") {
      if (confidence === 100) return "100% - Step 1: knowledge_graph.website found";
      if (confidence === 50) return "50% - Step 1: local_results fallback";
      if (confidence === 25) return "25% - Step 2: Industry search knowledge_graph";
      if (confidence === 15) return "15% - Step 2: Industry search local_results";
      if (confidence === 10) return "10% - Step 3: Simple search knowledge_graph";
      if (confidence === 5) return "5% - Step 3: Simple search local_results";
      return "0% - No domain found after all search steps";
    }
    if (source === "email_domain_verified" || source === "email_not_provided" || source === "email_invalid_format" || source === "email_personal_domain_skipped" || source === "email_domain_not_verified" || source === "email_domain_verification_error") {
      if (confidence === 95) return "95% - Domain extracted from email and verified via Google";
      return "0% - No valid business domain in email or verification failed";
    }
    return "Confidence score indicates data quality";
  };
  const handleEnrich = async (lead: Lead, source: "apollo" | "google" | "email") => {
    setEnrichingSource({
      leadId: lead.id,
      source
    });
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          email: lead.email,
          source
        }
      });
      if (error) throw error;
      toast({
        title: "Enrichment Complete!",
        description: data.domain ? `Found domain: ${data.domain} (${data.confidence}% confidence)` : "No domain found for this company"
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive"
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
          source: "apollo"
        }
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
          source: "google"
        }
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
            source: "email"
          }
        });
        if (emailResult.data?.domain) domainFound = true;
      }

      // Step 4: Run diagnosis when no domain found from any source
      // Refetch lead to check if domain was found and get updated enrichment_logs
      const {
        data: updatedLead
      } = await supabase.from("leads").select("domain, enrichment_logs").eq("id", lead.id).single();

      // Check if domain exists in database (might have been found by one of the sources)
      domainFound = !!updatedLead?.domain;
      if (!domainFound) {
        setFindDomainStep('Diagnosing...');
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
              full_name: lead.full_name
            },
            enrichmentLogs: updatedLead?.enrichment_logs || []
          }
        });
        toast({
          title: "No Domain Found",
          description: "All 3 sources checked. AI diagnosis generated."
        });
      } else {
        toast({
          title: "Search Complete",
          description: "All sources checked. Domain(s) found - check enrichment logs to compare."
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Find Domain Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFindingDomain(null);
      setFindDomainStep(null);
    }
  };
  const handleRunPipeline = async (lead: Lead) => {
    const startTime = Date.now();
    setRunningPipeline(lead.id);
    setPipelineCompleted({ domainValidated: false, socialsSearched: false });
    try {
      setPipelineStep('Running Pipeline...');

      // PATH B: Contact enrichment - runs completely in parallel from the start
      const contactEnrichmentPromise = (async () => {
        try {
          // Skip contact enrichment if email is missing (required by function)
          if (!lead.email) {
            console.log('[Pipeline] Skipping contact enrichment - no email provided');
            return;
          }

          console.log('[Pipeline] Starting contact enrichment for lead:', lead.id);
          
          const { data, error } = await supabase.functions.invoke("enrich-contact", {
            body: {
              leadId: lead.id,
              full_name: lead.full_name,
              email: lead.email,
              domain: lead.domain,
              company: lead.company
            }
          });
          
          if (error) {
            console.error('[Pipeline] Contact enrichment error:', error);
            return;
          }
          
          console.log('[Pipeline] Contact enrichment completed:', data);
          
          // Update UI state to display results (same as manual button)
          if (data?.steps) {
            setEnrichContactSteps(data.steps);
          }
          if (data?.enrichedContact) {
            setEnrichedContactResult(data.enrichedContact);
          }

          // Check if LinkedIn was found and send to Clay
          const { data: enrichedLead } = await supabase
            .from("leads")
            .select("contact_linkedin")
            .eq("id", lead.id)
            .single();

          if (enrichedLead?.contact_linkedin) {
            console.log('[Pipeline] Sending to Clay with LinkedIn:', enrichedLead.contact_linkedin);
            await supabase.functions.invoke("send-to-clay", {
              body: {
                fullName: lead.full_name,
                email: lead.email,
                linkedin: enrichedLead.contact_linkedin
              }
            });
          }
        } catch (err) {
          console.error('[Pipeline] Contact enrichment failed:', err);
        }
      })();

      // PATH A: Domain enrichment flow (sequential)
      // Step 1: Find Domain
      setPipelineStep('Finding Domain...');
      
      // Apollo
      await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          email: lead.email,
          source: "apollo"
        }
      });

      // Google
      await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          mics_sector: lead.mics_sector,
          email: lead.email,
          source: "google"
        }
      });

      // Email (if exists)
      if (lead.email) {
        await supabase.functions.invoke("enrich-lead", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
            mics_sector: lead.mics_sector,
            email: lead.email,
            source: "email"
          }
        });
      }

      // Refetch lead to check if domain was found
      const { data: updatedLead } = await supabase
        .from("leads")
        .select("domain, enrichment_logs, source_url")
        .eq("id", lead.id)
        .single();

      const domainFound = !!updatedLead?.domain;
      let matchScore = null;

      if (domainFound) {
        // Step 1.5: Enrich with Clay (non-blocking)
        setPipelineStep('Enriching with Clay...');
        
        try {
          const { error: clayError } = await supabase.functions.invoke('enrich-company-clay', {
            body: {
              domain: updatedLead.domain
            }
          });
          
          if (clayError) {
            console.error('Clay enrichment error (continuing pipeline):', clayError);
          } else {
            console.log('Clay company enrichment triggered for domain:', updatedLead.domain);
          }
        } catch (clayError) {
          console.error('Clay enrichment error (continuing pipeline):', clayError);
        }
        // Pipeline continues regardless of Clay success/failure

        // Step 2: Validate Domain
        setPipelineStep('Validating Domain...');
        
        const currentLogs = Array.isArray(updatedLead?.enrichment_logs) ? updatedLead.enrichment_logs : [];
        const validationResult = await validateAndSaveDomain(
          lead.id,
          updatedLead.domain,
          updatedLead.source_url,
          undefined,
          currentLogs
        );

        let validationData = validationResult.data;
        if (validationResult.success) {
          setPipelineCompleted(prev => ({ ...prev, domainValidated: true }));
        }
        
        // Show toast with domain validation result (always show, success or failure)
        toast({
          title: !validationResult.success 
            ? "Domain Invalid"
            : validationData?.is_parked 
              ? "Domain Parked/For Sale" 
              : (validationData?.is_valid_domain ? "Domain Valid" : "Domain Invalid"),
          description: validationData?.reason || (!validationResult.success || !validationData?.is_valid_domain ? "Domain validation failed" : "Domain validated successfully"),
          variant: (!validationResult.success || (!validationData?.is_valid_domain && !validationData?.is_parked)) ? "destructive" : "default"
        });

        // Refresh so the VALID/INVALID/PARKED badge appears immediately while pipeline continues
        onEnrichComplete();
        // Only continue with scoring if domain is valid and not parked
        if (validationData?.is_valid_domain && !validationData?.is_parked) {
          // Step 3: Find Coordinates
          setPipelineStep('Finding Coordinates...');
          await supabase.functions.invoke("find-company-coordinates", {
            body: {
              leadId: lead.id,
              domain: updatedLead.domain,
              sourceUrl: updatedLead.source_url
            }
          });

          // Refetch to get coordinates
          const { data: leadWithCoords } = await supabase
            .from("leads")
            .select("latitude, longitude")
            .eq("id", lead.id)
            .single();

          // Step 4: Calculate Distance (only if coordinates found)
          if (leadWithCoords?.latitude && leadWithCoords?.longitude) {
            setPipelineStep('Calculating Distance...');
            await supabase.functions.invoke("calculate-distance", {
              body: {
                leadId: lead.id,
                city: lead.city,
                state: lead.state,
                zipcode: lead.zipcode,
                latitude: leadWithCoords.latitude,
                longitude: leadWithCoords.longitude
              }
            });
          }

          // Step 5: Score Domain Relevance
          setPipelineStep('Scoring Domain Relevance...');
          await supabase.functions.invoke("score-domain-relevance", {
            body: {
              leadId: lead.id,
              companyName: lead.company,
              domain: updatedLead.domain,
              city: lead.city,
              state: lead.state,
              dma: lead.dma
            }
          });

          // Step 6: Calculate Match Score
          setPipelineStep('Calculating Match Score...');
          await supabase.functions.invoke("calculate-match-score", {
            body: { leadId: lead.id }
          });

          // Refetch to get the calculated match score
          const { data: leadWithScore } = await supabase
            .from("leads")
            .select("match_score, enrichment_source, apollo_not_found")
            .eq("id", lead.id)
            .single();

          matchScore = leadWithScore?.match_score;
        } else {
          // Domain is invalid or parked - set appropriate match score
          await supabase.from("leads").update({
            match_score: validationData?.is_parked ? 25 : 0,
            match_score_source: validationData?.is_parked ? "parked_domain" : "invalid_domain"
          }).eq("id", lead.id);
          matchScore = validationData?.is_parked ? 25 : 0;
        }
      }

      // ALWAYS: Run social searches in parallel
      setPipelineStep('Searching Socials...');
      const socialSearchPromise = Promise.all([
        supabase.functions.invoke("search-facebook-serper", {
          body: { leadId: lead.id, company: lead.company, city: lead.city, state: lead.state }
        }),
        supabase.functions.invoke("search-linkedin-serper", {
          body: { leadId: lead.id, company: lead.company, city: lead.city, state: lead.state }
        }),
        supabase.functions.invoke("search-instagram-serper", {
          body: { leadId: lead.id, company: lead.company, city: lead.city, state: lead.state }
        })
      ]);
      await socialSearchPromise;
      setPipelineCompleted(prev => ({ ...prev, socialsSearched: true }));

      // ALWAYS: Validate socials in parallel after searches
      setPipelineStep('Validating Socials...');
      const { data: leadWithSocials } = await supabase
        .from("leads")
        .select("enrichment_logs, facebook, instagram, linkedin")
        .eq("id", lead.id)
        .single();

      // Extract organic results from enrichment logs
      const enrichmentLogs = (leadWithSocials?.enrichment_logs as unknown as EnrichmentLog[]) || [];
      const fbLog = enrichmentLogs.slice().reverse().find((log: any) => log.action === "facebook_search_serper") as any;
      const liLog = enrichmentLogs.slice().reverse().find((log: any) => log.action === "linkedin_search_serper") as any;
      const igLog = enrichmentLogs.slice().reverse().find((log: any) => log.action === "instagram_search_serper") as any;
      const facebookResults = fbLog?.top3Results || fbLog?.searchSteps?.[0]?.organicResults || (leadWithSocials?.facebook ? [leadWithSocials.facebook] : []);
      const linkedinResults = liLog?.top3Results || liLog?.searchSteps?.[0]?.organicResults || (leadWithSocials?.linkedin ? [leadWithSocials.linkedin] : []);
      const instagramResults = igLog?.top3Results || (leadWithSocials?.instagram ? [leadWithSocials.instagram] : []);

      await supabase.functions.invoke("score-social-relevance", {
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
          instagramResults
        }
      });

      // If score > 50: Enrich Company → Find Contacts → Get News
      if (matchScore !== null && matchScore > 50) {
        const { data: leadWithScore } = await supabase
          .from("leads")
          .select("match_score, enrichment_source, apollo_not_found")
          .eq("id", lead.id)
          .single();

            const { data: { user } } = await supabase.auth.getUser();

        setPipelineStep('Enriching Company...');
            await supabase.functions.invoke("enrich-company-details", {
              body: {
                leadId: lead.id,
                domain: updatedLead.domain,
            enrichmentSource: leadWithScore?.enrichment_source,
            apolloNotFound: leadWithScore?.apollo_not_found
              }
            });

        setPipelineStep('Finding Contacts...');
            await supabase.functions.invoke("find-company-contacts", {
              body: {
                leadId: lead.id,
                domain: updatedLead.domain,
                category: lead.category,
                userId: user?.id
              }
            });

        setPipelineStep('Getting News...');
            await supabase.functions.invoke("get-company-news", {
              body: {
                leadId: lead.id,
                company: lead.company,
                domain: updatedLead.domain
              }
            });

        // Wait for contact enrichment to complete
            await contactEnrichmentPromise;

            const duration = (Date.now() - startTime) / 1000;
            setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));

            toast({
              title: "Full Pipeline Complete",
          description: `Enriched ${updatedLead.domain} (Score: ${matchScore})`
        });
      } else if (!domainFound) {
        // If no domain: Score → Diagnose
        setPipelineStep('Calculating Score...');
        await supabase.functions.invoke("calculate-match-score", {
          body: { leadId: lead.id }
        });

        setPipelineStep('Diagnosing...');
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
              full_name: lead.full_name
            },
            enrichmentLogs: leadWithSocials?.enrichment_logs || []
          }
        });

        // Wait for contact enrichment to complete
        await contactEnrichmentPromise;

        const duration = (Date.now() - startTime) / 1000;
        setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));

        toast({
          title: "Pipeline Complete",
          description: "No domain found. Socials searched, validated, score calculated & AI diagnosis generated."
        });
      } else {
        // Domain found but score <= 50 - just wait for contact enrichment
        await contactEnrichmentPromise;

        const duration = (Date.now() - startTime) / 1000;
        setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));

        toast({
          title: "Pipeline Complete",
          description: `Domain found (Score: ${matchScore}). Socials searched and validated.`
        });
      }

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Pipeline Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));
      setRunningPipeline(null);
      setPipelineStep(null);
    }
  };

  // Unified domain validation function - used by button AND pipeline
  const validateAndSaveDomain = async (
    leadId: string,
    domain: string,
    sourceUrl?: string,
    confidence?: number,
    currentLogs?: any[]
  ): Promise<{ success: boolean; data?: any; error?: any }> => {
    try {
      const { data, error } = await supabase.functions.invoke("validate-domain", {
        body: { domain }
      });

      if (error) throw error;

      // Create validation log entry
      const validationLog = {
        step: 'validate_domain',
        domain,
        is_valid: data.is_valid_domain,
        is_parked: data.is_parked,
        reason: data.reason,
        http_status: data.http_status,
        timestamp: new Date().toISOString()
      };

      // Build update object
      const updateData: any = {
        domain,
        source_url: sourceUrl || domain,
        email_domain_validated: data.is_valid_domain,
        enrichment_status: "enriched",
        match_score: data.is_valid_domain && !data.is_parked ? null : (data.is_parked ? 25 : 0),
        match_score_source: data.is_valid_domain && !data.is_parked ? null : (data.is_parked ? "parked_domain" : "invalid_domain"),
        enrichment_logs: [...(currentLogs || []), validationLog]
      };

      if (confidence !== undefined) {
        updateData.enrichment_confidence = data.is_valid_domain ? confidence : 0;
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (updateError) throw updateError;

      return { success: true, data };
    } catch (error) {
      console.error("Domain validation error:", error);
      return { success: false, error };
    }
  };

  const handleCheckDomain = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Check Domain",
        description: "No domain found. Run domain enrichment first.",
        variant: "destructive"
      });
      return;
    }
    setCheckingDomain(lead.id);
    try {
      const currentLogs = Array.isArray(lead.enrichment_logs) ? lead.enrichment_logs : [];
      const result = await validateAndSaveDomain(
        lead.id,
        lead.domain,
        lead.source_url || lead.domain,
        lead.enrichment_confidence || undefined,
        currentLogs
      );

      if (!result.success) throw result.error;

      toast({
        title: result.data.is_parked 
          ? "Domain Parked/For Sale" 
          : (result.data.is_valid_domain ? "Domain Valid ✓" : "Domain Invalid ✗"),
        description: result.data.reason,
        variant: result.data.is_parked ? "default" : (result.data.is_valid_domain ? "default" : "destructive")
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Domain Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCheckingDomain(null);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Lead deleted successfully."
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleCalculateDistance = async (lead: Lead) => {
    if (!lead.latitude || !lead.longitude || !lead.city || !lead.zipcode) {
      toast({
        title: "Cannot Calculate Distance",
        description: "GPS coordinates or location data is missing. Run Google enrichment first.",
        variant: "destructive"
      });
      return;
    }
    setCalculatingDistance(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("calculate-distance", {
        body: {
          leadId: lead.id,
          city: lead.city,
          state: lead.state,
          zipcode: lead.zipcode,
          latitude: lead.latitude,
          longitude: lead.longitude
        }
      });
      if (error) throw error;
      toast({
        title: "Distance Calculated!",
        description: `${data.distance_miles} miles from ${lead.city}, ${lead.state}`
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setScoringDomain(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("score-domain-relevance", {
        body: {
          leadId: lead.id,
          companyName: lead.company,
          domain: lead.domain,
          city: lead.city,
          state: lead.state,
          dma: lead.dma
        }
      });
      if (error) throw error;
      toast({
        title: "Domain Scored!",
        description: `Relevance: ${data.score}/100 - ${data.explanation}`
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Scoring Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setScoringDomain(null);
    }
  };
  const handleCalculateMatchScore = async (lead: Lead) => {
    setCalculatingMatchScore(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("calculate-match-score", {
        body: {
          leadId: lead.id
        }
      });
      if (error) throw error;
      const sourceLabels: Record<string, string> = {
        email_domain: "Email Domain Verified",
        google_knowledge_graph: "Google Knowledge Graph",
        calculated: "Distance + Domain Relevance"
      };
      toast({
        title: "Match Score Calculated!",
        description: `${data.matchScore}% (${sourceLabels[data.matchScoreSource] || data.matchScoreSource})`
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCalculatingMatchScore(null);
    }
  };
  const handleSearchFacebookSerper = async (lead: Lead) => {
    setEnrichingFacebook(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("search-facebook-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          phone: lead.phone,
          micsSector: lead.mics_sector
        }
      });
      if (error) throw error;
      toast({
        title: data.facebook ? "Facebook Found!" : "No Facebook Found",
        description: data.facebook ? `Found with ${data.confidence}% confidence (${data.stepsExecuted} steps)` : `No Facebook page found after ${data.stepsExecuted} search steps`
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Facebook Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEnrichingFacebook(null);
    }
  };
  const handleSearchLinkedinSerper = async (lead: Lead) => {
    setEnrichingLinkedin(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("search-linkedin-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          micsSector: lead.mics_sector
        }
      });
      if (error) throw error;
      toast({
        title: data.linkedin ? "LinkedIn Found!" : "No LinkedIn Found",
        description: data.linkedin ? `Found with ${data.confidence}% confidence (${data.stepsExecuted} steps)` : `No LinkedIn page found after ${data.stepsExecuted} search steps`
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "LinkedIn Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEnrichingLinkedin(null);
    }
  };
  const handleSearchInstagramSerper = async (lead: Lead) => {
    setEnrichingInstagram(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("search-instagram-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          city: lead.city,
          state: lead.state
        }
      });
      if (error) throw error;
      toast({
        title: data.instagram ? "Instagram Found!" : "No Instagram Found",
        description: data.instagram ? `Found: ${data.instagram} (${data.confidence}% confidence)` : "No Instagram profile found"
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Instagram Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEnrichingInstagram(null);
    }
  };
  const handleScoreSocialRelevance = async (lead: Lead) => {
    setScoringSocials(lead.id);
    try {
      // Extract organic results from enrichment logs
      const fbLog = lead.enrichment_logs?.slice().reverse().find(log => log.action === "facebook_search_serper") as any;
      const liLog = lead.enrichment_logs?.slice().reverse().find(log => log.action === "linkedin_search_serper") as any;
      const igLog = lead.enrichment_logs?.slice().reverse().find(log => log.action === "instagram_search_serper") as any;
      const facebookResults = fbLog?.top3Results || fbLog?.searchSteps?.[0]?.organicResults || [];
      const linkedinResults = liLog?.top3Results || liLog?.searchSteps?.[0]?.organicResults || [];
      const instagramResults = igLog?.top3Results || [];
      const {
        data,
        error
      } = await supabase.functions.invoke("score-social-relevance", {
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
          instagramResults
        }
      });
      if (error) throw error;
      toast({
        title: "Social Profiles Scored!",
        description: `Facebook: ${data.facebook_validated === null ? "N/A" : data.facebook_validated ? "Valid" : "Invalid"}, LinkedIn: ${data.linkedin_validated === null ? "N/A" : data.linkedin_validated ? "Valid" : "Invalid"}, Instagram: ${data.instagram_validated === null ? "N/A" : data.instagram_validated ? "Valid" : "Invalid"}`
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Social Scoring Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setScoringSocials(null);
    }
  };
  const handleGenerateShortSummary = async (lead: Lead) => {
    setGeneratingShortSummary(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-short-summary", {
        body: {
          leadId: lead.id,
          company: lead.company,
          description: lead.description,
          products_services: lead.products_services,
          company_industry: lead.company_industry,
          zipcode: lead.zipcode,
          dma: lead.dma,
          domain: lead.domain,
          email_domain_validated: lead.email_domain_validated,
          match_score: lead.match_score,
          facebook: lead.facebook,
          facebook_validated: lead.facebook_validated,
          linkedin: lead.linkedin,
          linkedin_validated: lead.linkedin_validated,
          instagram: lead.instagram,
          instagram_validated: lead.instagram_validated
        }
      });
      if (error) throw error;
      toast({
        title: "Short Summary Generated!",
        description: "A 2-3 line summary has been created."
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          short_summary: data.short_summary
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingShortSummary(false);
    }
  };
  const handleGenerateLongSummary = async (lead: Lead) => {
    if (!lead.description && !lead.products_services && !lead.company_industry) {
      toast({
        title: "Cannot Generate",
        description: "Company details are required. Run 'Enrich with Apollo + Scrape Website' first.",
        variant: "destructive"
      });
      return;
    }
    setGeneratingLongSummary(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-long-summary", {
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
          news: lead.news
        }
      });
      if (error) throw error;
      toast({
        title: "Detailed Profile Generated!",
        description: "A rich 5-8 line company profile has been created."
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          long_summary: data.long_summary
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingLongSummary(false);
    }
  };
  const handleGenerateProductsSummary = async (lead: Lead) => {
    if (!lead.products_services && !lead.description && !lead.company_industry) {
      toast({
        title: "Cannot Generate",
        description: "Products/services, description, or industry data is required. Run 'Enrich with Apollo + Scrape Website' first.",
        variant: "destructive"
      });
      return;
    }
    setGeneratingProductsSummary(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-products-services-summary", {
        body: {
          leadId: lead.id,
          company: lead.company,
          products_services: lead.products_services,
          description: lead.description,
          company_industry: lead.company_industry,
          mics_sector: lead.mics_sector,
          news: lead.news
        }
      });
      if (error) throw error;
      toast({
        title: "Products & Services Summary Generated!",
        description: "A professional summary of company offerings has been created."
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          products_services_summary: data.products_services_summary
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setGeneratingMustKnows(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-must-knows", {
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
          news: lead.news
        }
      });
      if (error) throw error;
      toast({
        title: "Must Knows Generated!",
        description: "Key facts summary has been created for SDR briefing."
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          must_knows: data.must_knows
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingMustKnows(false);
    }
  };
  const handleGenerateVehicleInterest = async (lead: Lead) => {
    if (!lead.description) {
      toast({
        title: "Cannot Generate",
        description: "Company description is required. Run 'Enrich with Apollo + Scrape Website' first.",
        variant: "destructive"
      });
      return;
    }
    setGeneratingVehicleInterest(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-vehicle-interest", {
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
          mics_sector: lead.mics_sector
        }
      });
      if (error) throw error;
      toast({
        title: "Interest Analysis Generated!",
        description: "Vehicle tracking interest explanation has been created."
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          vehicle_tracking_interest_explanation: data.explanation
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setGeneratingBusinessCases(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-business-cases", {
        body: {
          leadId: lead.id,
          company: lead.company,
          description: lead.description,
          company_industry: lead.company_industry,
          products_services: lead.products_services,
          vehicles_count: lead.vehicles_count,
          truck_types: lead.truck_types,
          features: lead.features
        }
      });
      if (error) throw error;
      toast({
        title: "Business Cases Generated!",
        description: "Likely business cases have been created."
      });

      // Update the local lead state in the modal
      if (descriptionModalLead && descriptionModalLead.id === lead.id) {
        setDescriptionModalLead({
          ...descriptionModalLead,
          likely_business_cases: data.businessCases
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingBusinessCases(false);
    }
  };
  const handleFindContacts = async (lead: Lead) => {
    setFindingContacts(lead.id);
    try {
      // Get current user ID for category role lookup
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const {
        data,
        error
      } = await supabase.functions.invoke("find-company-contacts", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          category: lead.category,
          userId: user?.id
        }
      });
      if (error) throw error;
      toast({
        title: data.contactsFound > 0 ? "Contacts Found!" : "No Contacts Found",
        description: data.contactsFound > 0 ? `Found ${data.contactsFound} key contacts at this company` : "No key contacts found for this company"
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Contact Search Failed",
        description: error.message,
        variant: "destructive"
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
      const {
        data,
        error
      } = await supabase.functions.invoke("enrich-contact", {
        body: {
          leadId: lead.id,
          full_name: lead.full_name,
          email: lead.email,
          domain: lead.domain,
          company: lead.company
        }
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
          description: `Found additional details for ${lead.full_name}`
        });
      } else {
        toast({
          title: "Contact Not Found",
          description: data.message || "No matching contact found in Apollo"
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      console.error('[Contact Enrichment] Error:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to send a request to the Edge Function';
      toast({
        title: "Contact Enrichment Failed",
        description: errorMessage,
        variant: "destructive"
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
      const {
        data,
        error
      } = await supabase.functions.invoke('send-to-clay', {
        body: {
          fullName: lead.full_name,
          email: lead.email,
          linkedin: linkedinUrl
        }
      });
      if (error) {
        throw new Error(error.message || 'Failed to send to Clay');
      }
      console.log('Clay edge function response:', data);
      toast({
        title: "Sent to Clay",
        description: "Contact details sent to Clay for enrichment."
      });
    } catch (error) {
      console.error('Clay webhook error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send to Clay.",
        variant: "destructive"
      });
    } finally {
      setEnrichingWithClay(null);
    }
  };
  const [enrichingCompanyWithClay, setEnrichingCompanyWithClay] = useState<string | null>(null);
  const handleEnrichCompanyWithClay = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Enrich with Clay",
        description: "Domain is required.",
        variant: "destructive"
      });
      return;
    }
    setEnrichingCompanyWithClay(lead.id);
    try {
      console.log('Sending domain to Clay for company enrichment:', lead.domain);
      const { data, error } = await supabase.functions.invoke('enrich-company-clay', {
        body: {
          domain: lead.domain
        }
      });
      if (error) {
        throw new Error(error.message || 'Failed to send to Clay');
      }
      console.log('Clay company enrichment response:', data);
      toast({
        title: "Sent to Clay",
        description: "Company domain sent to Clay for enrichment."
      });
    } catch (error) {
      console.error('Clay company enrichment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send to Clay.",
        variant: "destructive"
      });
    } finally {
      setEnrichingCompanyWithClay(null);
    }
  };
  const handleEvaluateMatch = async (enrichment: typeof clayEnrichments[0]) => {
    if (!selectedLead) return;
    setEvaluatingMatchId(enrichment.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('evaluate-profile-match', {
        body: {
          enrichmentId: enrichment.id,
          leadData: {
            name: selectedLead.full_name,
            company: selectedLead.company,
            email: selectedLead.email,
            location: selectedLead.city && selectedLead.state ? `${selectedLead.city}, ${selectedLead.state}` : selectedLead.city || selectedLead.state || null
          },
          profileData: {
            platform: 'LinkedIn',
            linkedin: enrichment.linkedin,
            full_name: enrichment.full_name,
            title_clay: enrichment.title_clay,
            company_clay: enrichment.company_clay,
            location_clay: enrichment.location_clay
          }
        }
      });
      if (error) throw error;

      // Update local state with new evaluation results
      setClayEnrichments(prev => prev.map(e => e.id === enrichment.id ? {
        ...e,
        profile_match_score: data.result.match_score,
        profile_match_confidence: data.result.confidence_level,
        profile_match_reasons: data.result.reasons,
        profile_match_evaluated_at: new Date().toISOString()
      } : e));
      toast({
        title: "Evaluation Complete",
        description: `Match score: ${data.result.match_score}% (${data.result.confidence_level} confidence)`
      });
    } catch (error: any) {
      toast({
        title: "Evaluation Failed",
        description: error.message || "Could not evaluate profile match.",
        variant: "destructive"
      });
    } finally {
      setEvaluatingMatchId(null);
    }
  };
  const handleBulkEvaluateMatches = async () => {
    if (!selectedLead || clayEnrichments.length === 0) return;
    const unevaluated = clayEnrichments.filter(e => e.profile_match_score === null || e.profile_match_score === undefined);
    if (unevaluated.length === 0) {
      toast({
        title: "All Evaluated",
        description: "All Clay enrichments have already been evaluated."
      });
      return;
    }
    setBulkEvaluatingMatches(true);
    setBulkEvaluateProgress({
      current: 0,
      total: unevaluated.length
    });
    try {
      for (let i = 0; i < unevaluated.length; i++) {
        const enrichment = unevaluated[i];
        setBulkEvaluateProgress({
          current: i + 1,
          total: unevaluated.length
        });
        const {
          data,
          error
        } = await supabase.functions.invoke('evaluate-profile-match', {
          body: {
            enrichmentId: enrichment.id,
            leadData: {
              name: selectedLead.full_name,
              company: selectedLead.company,
              email: selectedLead.email,
              location: selectedLead.city && selectedLead.state ? `${selectedLead.city}, ${selectedLead.state}` : selectedLead.city || selectedLead.state || null
            },
            profileData: {
              platform: 'LinkedIn',
              linkedin: enrichment.linkedin,
              full_name: enrichment.full_name,
              title_clay: enrichment.title_clay,
              company_clay: enrichment.company_clay,
              location_clay: enrichment.location_clay
            }
          }
        });
        if (!error && data?.result) {
          setClayEnrichments(prev => prev.map(e => e.id === enrichment.id ? {
            ...e,
            profile_match_score: data.result.match_score,
            profile_match_confidence: data.result.confidence_level,
            profile_match_reasons: data.result.reasons,
            profile_match_evaluated_at: new Date().toISOString()
          } : e));
        }
      }
      toast({
        title: "Bulk Evaluation Complete",
        description: `Evaluated ${unevaluated.length} profile${unevaluated.length > 1 ? 's' : ''}.`
      });
    } catch (error: any) {
      toast({
        title: "Bulk Evaluation Error",
        description: error.message || "Failed to evaluate some profiles.",
        variant: "destructive"
      });
    } finally {
      setBulkEvaluatingMatches(false);
      setBulkEvaluateProgress({
        current: 0,
        total: 0
      });
    }
  };
  const handleEnrichCompanyDetails = async (lead: Lead) => {
    if (!lead.domain) {
      toast({
        title: "Cannot Enrich with Apollo + Scrape Website",
        description: "Domain is required. Run enrichment first.",
        variant: "destructive"
      });
      return;
    }
    const isDirectApollo = lead.enrichment_source === "apollo_api";
    const skipApollo = lead.apollo_not_found === true;
    setEnrichingCompanyDetails(lead.id);

    // Set initial step message based on path
    if (skipApollo) {
      setCompanyDetailsStep({
        step: 1,
        message: "Scraping website..."
      });
    } else if (isDirectApollo) {
      setCompanyDetailsStep({
        step: 1,
        message: "Retrieving details from Apollo..."
      });
    } else {
      setCompanyDetailsStep({
        step: 1,
        message: "Searching Apollo for domain..."
      });
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("enrich-company-details", {
        body: {
          leadId: lead.id,
          domain: lead.domain,
          enrichmentSource: lead.enrichment_source,
          apolloNotFound: lead.apollo_not_found
        }
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
          description: "Could not find company details from Apollo or website scraping."
        });
      } else {
        const fieldsCount = data.enrichedFields?.length || 0;
        const sourceLabel = data.source === "scraper" ? "website scraping" : "Apollo";
        toast({
          title: "Company Details Enriched!",
          description: `${fieldsCount} fields populated from ${sourceLabel}.`
        });
      }
      onEnrichComplete();
    } catch (error: any) {
      console.error("Company Details Enrichment Error:", error);
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEnrichingCompanyDetails(null);
      setCompanyDetailsStep(null);
    }
  };
  const handleGetCompanyNews = async (lead: Lead) => {
    setFetchingNews(lead.id);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("get-company-news", {
        body: {
          leadId: lead.id,
          company: lead.company,
          domain: lead.domain
        }
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: `Found ${data.newsCount} news articles`
      });
      onEnrichComplete();
    } catch (error: any) {
      console.error("Error fetching company news:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch company news",
        variant: "destructive"
      });
    } finally {
      setFetchingNews(null);
    }
  };
  const navigate = useNavigate();
  const showLeadDetails = (lead: Lead) => {
    navigate(`/company/${lead.id}`);
  };
  return <>
      {/* Bulk Delete Button - always visible when leads selected */}
      {selectedLeads.size > 0 && <div className="flex items-center gap-2 mb-4">
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete ({selectedLeads.size})
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
          </span>
        </div>}

      {/* Top Bar (filters + export) */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {!hideFilterBar && <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0F0F4B]">Filter by:</span>
            <Select value={domainFilter} onValueChange={(value: "all" | "valid" | "invalid") => setDomainFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Domain Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="valid" className="font-semibold">Valid (≥50% Match)</SelectItem>
                <SelectItem value="invalid">Invalid (&lt;50% Match)</SelectItem>
              </SelectContent>
            </Select>
          </div>}

        
      </div>

      <StickyScrollTable className="overflow-x-auto">
        <div className="min-w-max">
          {/* Collapse/Expand button row - only show in View All mode */}
          {viewMode === 'all' && <div className="flex" style={{
          paddingBottom: 0,
          marginBottom: -1
        }}>
              <div style={{
            width: "940px"
          }} className="shrink-0" />
              <Button variant="outline" size="sm" className="h-8 px-3 text-sm font-normal border-border/50 text-muted-foreground hover:bg-muted/50" style={{
            backgroundColor: "white",
            borderRadius: 0
          }} onClick={() => setShowEnrichedColumns(!showEnrichedColumns)} title={showEnrichedColumns ? "Collapse enriched details" : "Expand enriched details"}>
                <ArrowDown className="h-4 w-4 mr-2 text-muted-foreground/70" />
                <span className="border-r border-border/50 pr-2 mr-2">{showEnrichedColumns ? "Collapse" : "Expand"}</span>
                <ChevronsRight className={`h-4 w-4 text-muted-foreground/70 transition-transform ${showEnrichedColumns ? "rotate-180" : ""}`} />
              </Button>
            </div>}
          <div className="rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-20">
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead className="w-[40px]">
                    <Checkbox checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length} onCheckedChange={toggleAllSelection} />
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
                  {/* Company View: Description (before Company Domain) */}
                  {viewMode === 'company' && <TableHead className="min-w-[250px]">
                      Summary
                    </TableHead>}
                  {/* View All & Company: Company Domain */}
                  {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && <TableHead className={viewMode === 'all' && showEnrichedColumns ? "border-t-2 border-[#0F0F4B]" : ""}>
                      <div className="flex items-center gap-2">
                        Company Domain
                      </div>
                    </TableHead>}
                  {/* Company View: Socials (right after Company Domain) */}
                  {viewMode === 'company' && <TableHead>Socials</TableHead>}
                  {/* Clay Enrichment Columns */}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead>Job Title Clay</TableHead>}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead>Company Clay</TableHead>}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead>Location Clay</TableHead>}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead>Phone Clay</TableHead>}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead className="max-w-[200px]">
                      <div className="flex items-center gap-1">
                        <Linkedin className="h-4 w-4" />
                        Summary Clay
                      </div>
                    </TableHead>}
                  {(viewMode === 'all' || viewMode === 'contact') && <TableHead className="min-w-[280px]">AI Summary</TableHead>}
                  {/* View All: Description */}
                  {viewMode === 'all' && <TableHead className={showEnrichedColumns ? "min-w-[250px] border-t-2 border-[#0F0F4B]" : "min-w-[250px]"}>
                      Description
                    </TableHead>}
                  {/* View All: Contact Socials */}
                  {viewMode === 'all' && <TableHead className={showEnrichedColumns ? "border-t-2 border-[#0F0F4B]" : ""}>
                      Contact Socials
                    </TableHead>}
                  {/* View All: Socials */}
                  {viewMode === 'all' && showEnrichedColumns && <TableHead className="border-t-2 border-[#0F0F4B]">Socials</TableHead>}
                  {/* Company View: Additional columns */}
                  {viewMode === 'company' && <>
                      <TableHead>Industry</TableHead>
                      <TableHead>Founded</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead className="min-w-[200px]">Products/Services</TableHead>
                      <TableHead>News</TableHead>
                    </>}
                  {viewMode === 'all' && showEnrichedColumns && <>
                      <TableHead className="border-t-2 border-[#0F0F4B]">Size</TableHead>
                      <TableHead className="border-t-2 border-[#0F0F4B]">Annual Revenue</TableHead>
                      <TableHead className="border-t-2 border-[#0F0F4B]">Industry</TableHead>
                      <TableHead className="border-t-2 border-[#0F0F4B]">Founded</TableHead>
                      <TableHead className="border-t-2 border-[#0F0F4B]">Contacts</TableHead>
                      <TableHead className="border-t-2 border-[#0F0F4B]">Logo</TableHead>
                      <TableHead className="min-w-[200px] border-t-2 border-[#0F0F4B]">Products/Services</TableHead>
                      <TableHead className="border-t-2 border-[#0F0F4B]">News</TableHead>
                    </>}
                  <TableHead className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] min-w-[100px] border-t-2 border-background">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? <TableRow>
                    <TableCell colSpan={showEnrichedColumns ? 20 : 10} className="text-center text-muted-foreground py-8">
                      {leads.length === 0 ? "No leads yet. Add your first lead above." : "No leads match the current filter."}
                    </TableCell>
                  </TableRow> : filteredLeads.map(lead => <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50 group" onClick={() => showLeadDetails(lead)}>
                      {/* Checkbox cell */}
                      <TableCell className="w-[40px]" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={() => toggleLeadSelection(lead.id)} />
                      </TableCell>
                      {/* View All & Contact: Name */}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell className="font-medium">{lead.full_name}</TableCell>}
                      {/* View All & Contact: Email */}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell>{lead.email || "—"}</TableCell>}
                      {/* View All & Company & Contact: Company */}
                      {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && <TableCell className={viewMode === 'company' || viewMode === 'contact' ? "border-r border-border" : ""}>{lead.company || "—"}</TableCell>}
                      {/* Contact only: Contact Socials (after Company) */}
                      {viewMode === 'contact' && <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                    {/* LinkedIn - show if exists */}
                    {lead.contact_linkedin && <div className="flex items-center gap-1.5">
                              <Linkedin className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                      <a href={lead.contact_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                    {(() => {
                            try {
                              return new URL(lead.contact_linkedin).pathname.replace(/\/$/, "") || "/";
                            } catch {
                              return lead.contact_linkedin;
                            }
                          })()}
                                  </a>
                                  {allClayEnrichments[lead.id]?.profile_match_score !== null && allClayEnrichments[lead.id]?.profile_match_score !== undefined && <Badge variant="outline" className={`text-[10px] px-1 py-0 ${allClayEnrichments[lead.id]?.profile_match_confidence === 'high' ? 'bg-white dark:bg-black text-black dark:text-white border-gray-200 dark:border-gray-800' : allClayEnrichments[lead.id]?.profile_match_confidence === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-white dark:bg-black text-black dark:text-white border-gray-200 dark:border-gray-800'}`}>
                                      {allClayEnrichments[lead.id]?.profile_match_score}%
                                    </Badge>}
                    </div>}
                    {/* Instagram - show if exists (from company socials, as contact may not have separate instagram) */}
                    {lead.instagram && lead.instagram_validated !== false && <div className="flex items-center gap-1.5">
                      <Instagram className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                      <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                        {(() => {
                          try {
                            return new URL(lead.instagram).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.instagram;
                          }
                        })()}
                      </a>
                    </div>}
                    {/* Facebook - show if exists */}
                    {lead.contact_facebook && <div className="flex items-center gap-1.5">
                              <Facebook className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                      <a href={lead.contact_facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                  {(() => {
                          try {
                            return new URL(lead.contact_facebook).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.contact_facebook;
                          }
                        })()}
                      </a>
                    </div>}
                    {/* Show dash if no socials exist or all are invalidated */}
                    {!lead.contact_linkedin &&
                      !(lead.instagram && lead.instagram_validated !== false) &&
                      !lead.contact_facebook &&
                      (() => {
                        // Check if socials were searched
                        const socialsSearched = lead.enrichment_logs && (
                          lead.enrichment_logs.some(log => log.action === "facebook_search_serper") ||
                          lead.enrichment_logs.some(log => log.action === "linkedin_search_serper") ||
                          lead.enrichment_logs.some(log => log.action === "instagram_search_serper")
                        );
                        
                        // Check if social validations were run
                        const validationsRun = (
                          lead.facebook_validated !== null ||
                          lead.linkedin_validated !== null ||
                          lead.instagram_validated !== null
                        );
                        
                        // Show "socials not found" if socials were searched/validated but none are valid
                        if (socialsSearched || validationsRun) {
                          return <span className="text-[#0F0F4B] text-xs italic">socials not found</span>;
                        }
                        
                        // Otherwise show dash
                        return <span className="text-[#0F0F4B]">—</span>;
                      })()}
                          </div>
                        </TableCell>}
                      {/* View All only */}
                      {viewMode === 'all' && <TableCell>{lead.mics_sector || "—"}</TableCell>}
                      {viewMode === 'all' && <TableCell>{lead.zipcode || "—"}</TableCell>}
                      {viewMode === 'all' && <TableCell className="border-r border-border">{lead.dma || "—"}</TableCell>}
                      {/* Company View: Description (before Company Domain) */}
                      {viewMode === 'company' && <TableCell>
                          <button
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#F26B4F] border-b border-[#F26B4F]/40 pb-1 transition hover:border-[#F26B4F] group"
                            onClick={e => {
                              e.stopPropagation();
                              setDescriptionModalLead(lead);
                            }}
                          >
                            View
                            <span className="text-base transition-transform group-hover:translate-x-1">
                              →
                            </span>
                          </button>
                        </TableCell>}
                      {/* All views: Company Domain */}
                      {(viewMode === 'all' || viewMode === 'company' || viewMode === 'contact') && <TableCell>
                          {lead.domain ? <div className="flex items-center gap-2">
                              <a href={`https://${lead.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                {lead.domain}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {(lead.match_score !== null || lead.email_domain_validated === false) && <Badge variant="outline" className="text-xs bg-white text-black border-border" onClick={e => e.stopPropagation()}>
                                  {lead.email_domain_validated === false ? 0 : lead.match_score}%
                                </Badge>}
                            </div> : lead.enrichment_logs && lead.enrichment_logs.length > 0 ? (() => {
                    const checkedSources = new Set<string>();
                    lead.enrichment_logs.forEach(log => {
                      if (!log.source) return; // Skip logs without source (e.g., validate_domain step)
                      if (log.source.startsWith("email_")) {
                        checkedSources.add("Email");
                      } else if (log.source === "google_knowledge_graph" || log.source === "google_local_results") {
                        checkedSources.add("Google");
                      } else if (log.source === "apollo_api" || log.source === "apollo_api_error") {
                        checkedSources.add("Apollo");
                      }
                    });
                    const sourceList = Array.from(checkedSources).join(", ");
                    return <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground text-sm">Not found in {sourceList}</span>
                                  {lead.diagnosis_category && <Badge variant="outline" className="text-xs w-fit">
                                      {lead.diagnosis_category}
                                    </Badge>}
                                </div>;
                  })() : "—"}
                        </TableCell>}
                      {/* Company View: Socials (right after Company Domain) - show if exists and not explicitly invalidated */}
                      {viewMode === 'company' && <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {/* LinkedIn - show if exists and not explicitly invalidated (from Apollo/Clay/scraping or validated) */}
                            {lead.linkedin && lead.linkedin_validated !== false && <div className="flex items-center gap-1.5">
                                <Linkedin className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                                <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                  {(() => {
                          try {
                            return new URL(lead.linkedin).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.linkedin;
                          }
                        })()}
                                </a>
                              </div>}
                            {/* Instagram - show if exists and not explicitly invalidated */}
                            {lead.instagram && lead.instagram_validated !== false && <div className="flex items-center gap-1.5">
                                <Instagram className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                                <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                  {(() => {
                          try {
                            return new URL(lead.instagram).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.instagram;
                          }
                        })()}
                                </a>
                              </div>}
                            {/* Facebook - show if exists and not explicitly invalidated */}
                            {lead.facebook && lead.facebook_validated !== false && <div className="flex items-center gap-1.5">
                                <Facebook className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                                <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                  {(() => {
                          try {
                            return new URL(lead.facebook).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.facebook;
                          }
                        })()}
                                </a>
                              </div>}
                            {/* Show dash if no socials exist or all are invalidated */}
                            {!(lead.linkedin && lead.linkedin_validated !== false) && 
                             !(lead.instagram && lead.instagram_validated !== false) && 
                             !(lead.facebook && lead.facebook_validated !== false) && 
                      (() => {
                        // Check if socials were searched
                        const socialsSearched = lead.enrichment_logs && (
                          lead.enrichment_logs.some(log => log.action === "facebook_search_serper") ||
                          lead.enrichment_logs.some(log => log.action === "linkedin_search_serper") ||
                          lead.enrichment_logs.some(log => log.action === "instagram_search_serper")
                        );
                        
                        // Check if social validations were run
                        const validationsRun = (
                          lead.facebook_validated !== null ||
                          lead.linkedin_validated !== null ||
                          lead.instagram_validated !== null
                        );
                        
                        // Check if any social URLs exist (even if invalidated)
                        const hasSocialUrls = (
                          lead.linkedin !== null ||
                          lead.instagram !== null ||
                          lead.facebook !== null
                        );
                        
                        // Show specific message if socials were searched/validated
                        if (socialsSearched || validationsRun) {
                          if (hasSocialUrls) {
                            // Socials were found but all are invalid
                            return <span className="text-[#0F0F4B] text-xs italic">socials found but invalid</span>;
                          } else {
                            // No socials were found at all
                            return <span className="text-[#0F0F4B] text-xs italic">socials not found</span>;
                          }
                        }
                        
                        // Otherwise show dash
                        return <span className="text-[#0F0F4B]">—</span>;
                      })()}                
                          </div>
                        </TableCell>}
                      {/* Clay Enrichment Cells */}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell>{allClayEnrichments[lead.id]?.title_clay || "—"}</TableCell>}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell>{allClayEnrichments[lead.id]?.company_clay || "—"}</TableCell>}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell>{allClayEnrichments[lead.id]?.location_clay || "—"}</TableCell>}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell>{allClayEnrichments[lead.id]?.phone_clay || "—"}</TableCell>}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell className="max-w-[200px] truncate" title={allClayEnrichments[lead.id]?.summary_clay || ""}>
                          {allClayEnrichments[lead.id]?.summary_clay || "—"}
                        </TableCell>}
                      {/* AI Summary Cell */}
                      {(viewMode === 'all' || viewMode === 'contact') && <TableCell className="min-w-[280px]">
                          {(() => {
                    const clay = allClayEnrichments[lead.id];
                    if (!clay?.full_name && !clay?.title_clay) return "—";
                    const name = clay.full_name || lead.full_name;
                    const title = clay.title_clay;
                    const company = clay.company_clay;
                    const email = clay.email || lead.email;
                    const linkedinUrl = clay.linkedin || lead.contact_linkedin;
                    const matchScore = clay.profile_match_score;

                    // Determine email type
                    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com', 'gmx.com', 'fastmail.com'];
                    const emailDomain = email?.split('@')[1]?.toLowerCase();
                    const isPersonalEmail = emailDomain && personalDomains.includes(emailDomain);
                    const emailType = isPersonalEmail ? 'Personal email' : 'Corporate email';

                    // Determine LinkedIn status
                    let linkedinStatus = 'LinkedIn unverified';
                    if (matchScore !== null && matchScore >= 70) {
                      linkedinStatus = 'LinkedIn verified';
                    } else if (matchScore !== null && matchScore >= 50) {
                      linkedinStatus = 'LinkedIn likely';
                    }

                    // Match score color
                    const scoreColor = matchScore === null ? 'text-muted-foreground' : matchScore >= 70 ? 'text-black dark:text-white' : matchScore >= 50 ? 'text-yellow-600' : 'text-black dark:text-white';
                    return <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium truncate">
                                  {name}{title && company ? ` — ${title} at ${company}` : title ? ` — ${title}` : company ? ` at ${company}` : ''}.
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {email && `${emailType}`}
                                  {email && linkedinUrl && ' + '}
                                  {linkedinUrl && linkedinStatus}
                                  {matchScore !== null && <span className={scoreColor}> Match: {matchScore}/100.</span>}
                                </span>
                              </div>;
                  })()}
                        </TableCell>}
                      {/* View All: Description */}
                      {viewMode === 'all' && <TableCell>
                          <button
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#F26B4F] border-b border-[#F26B4F]/40 pb-1 transition hover:border-[#F26B4F] group"
                            onClick={e => {
                              e.stopPropagation();
                              setDescriptionModalLead(lead);
                            }}
                          >
                            View summary
                            <span className="text-base transition-transform group-hover:translate-x-1">
                              →
                            </span>
                          </button>
                        </TableCell>}
                      {/* View All: Contact Socials */}
                      {viewMode === 'all' && <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {/* LinkedIn - show if exists */}
                            {lead.contact_linkedin && <div className="flex items-center gap-1.5">
                              <Linkedin className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                              <a href={lead.contact_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                  {(() => {
                          try {
                            return new URL(lead.contact_linkedin).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.contact_linkedin;
                          }
                        })()}
                              </a>
                            </div>}
                            {/* Instagram - show if exists (from company socials) */}
                            {lead.instagram && lead.instagram_validated !== false && <div className="flex items-center gap-1.5">
                              <Instagram className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                              <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                {(() => {
                                  try {
                                    return new URL(lead.instagram).pathname.replace(/\/$/, "") || "/";
                                  } catch {
                                    return lead.instagram;
                                  }
                                })()}
                              </a>
                            </div>}
                            {/* Facebook - show if exists */}
                            {lead.contact_facebook && <div className="flex items-center gap-1.5">
                              <Facebook className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                              <a href={lead.contact_facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                  {(() => {
                          try {
                            return new URL(lead.contact_facebook).pathname.replace(/\/$/, "") || "/";
                          } catch {
                            return lead.contact_facebook;
                          }
                        })()}
                              </a>
                            </div>}
                            {/* Show dash if no socials exist or all are invalidated */}
                            {!lead.contact_linkedin &&
                              !(lead.instagram && lead.instagram_validated !== false) &&
                              !lead.contact_facebook &&
                              (() => {
                                // Check if socials were searched
                                const socialsSearched = lead.enrichment_logs && (
                                  lead.enrichment_logs.some(log => log.action === "facebook_search_serper") ||
                                  lead.enrichment_logs.some(log => log.action === "linkedin_search_serper") ||
                                  lead.enrichment_logs.some(log => log.action === "instagram_search_serper")
                                );
                                
                                // Check if social validations were run
                                const validationsRun = (
                                  lead.facebook_validated !== null ||
                                  lead.linkedin_validated !== null ||
                                  lead.instagram_validated !== null
                                );
                                
                                // Check if any social URLs exist (even if invalidated)
                                const hasSocialUrls = (
                                  lead.contact_linkedin !== null ||
                                  lead.instagram !== null ||
                                  lead.contact_facebook !== null
                                );
                                
                                // Show specific message if socials were searched/validated
                                if (socialsSearched || validationsRun) {
                                  if (hasSocialUrls) {
                                    // Socials were found but all are invalid
                                    return <span className="text-[#0F0F4B] text-xs italic">socials found but invalid</span>;
                                  } else {
                                    // No socials were found at all
                                    return <span className="text-[#0F0F4B] text-xs italic">socials not found</span>;
                                  }
                                }
                                
                                // Otherwise show dash
                                return <span className="text-[#0F0F4B]">—</span>;
                              })()}
                          </div>
                        </TableCell>}
                      {/* View All: Enriched columns (Socials, Size, etc.) */}
                      {viewMode === 'all' && showEnrichedColumns && <>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {/* LinkedIn - hide if validated as false */}
                              {lead.linkedin_validated !== false && <div className="flex items-center gap-1.5">
                                  <Linkedin className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                                  {lead.linkedin ? <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                      {(() => {
                            try {
                              return new URL(lead.linkedin).pathname.replace(/\/$/, "") || "/";
                            } catch {
                              return lead.linkedin;
                            }
                          })()}
                                    </a> : <span className="text-[#0F0F4B]">—</span>}
                                </div>}

                              {/* Instagram - hide if validated as false */}
                              {lead.instagram_validated !== false && <div className="flex items-center gap-1.5">
                                  <Instagram className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                                  {lead.instagram ? <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                      {(() => {
                            try {
                              return new URL(lead.instagram).pathname.replace(/\/$/, "") || "/";
                            } catch {
                              return lead.instagram;
                            }
                          })()}
                                    </a> : <span className="text-[#0F0F4B]">—</span>}
                                </div>}

                              {/* Facebook - hide if validated as false */}
                              {lead.facebook_validated !== false && <div className="flex items-center gap-1.5">
                                  <Facebook className="h-3.5 w-3.5 text-[#0F0F4B] flex-shrink-0" />
                                  {lead.facebook ? <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[120px]" onClick={e => e.stopPropagation()}>
                                      {(() => {
                            try {
                              return new URL(lead.facebook).pathname.replace(/\/$/, "") || "/";
                            } catch {
                              return lead.facebook;
                            }
                          })()}
                                    </a> : <span className="text-[#0F0F4B]">—</span>}
                                </div>}
                            </div>
                          </TableCell>
                          <TableCell>{lead.size || "—"}</TableCell>
                          <TableCell>{lead.annual_revenue || "—"}</TableCell>
                          <TableCell>{lead.company_industry || "—"}</TableCell>
                          <TableCell>{lead.founded_date || "—"}</TableCell>
                          <TableCell>
                            {(() => {
                      const apolloContacts = lead.company_contacts?.filter(c => c.source === "apollo_people_search") || [];
                      const scraperContacts = lead.company_contacts?.filter(c => c.source !== "apollo_people_search") || [];
                      const totalContacts = apolloContacts.length + scraperContacts.length + (lead.contact_email ? 1 : 0);
                      if (totalContacts === 0) return "—";
                      return <Button variant="ghost" size="sm" className="h-auto p-1 text-primary hover:underline" onClick={e => {
                        e.stopPropagation();
                        setContactsModalLead(lead);
                        setShowContactsModal(true);
                      }}>
                                  <Users className="h-3 w-3 mr-1" />
                                  {totalContacts} contact{totalContacts > 1 ? "s" : ""}
                                </Button>;
                    })()}
                          </TableCell>
                          <TableCell>
                            {lead.logo_url ? <a href={lead.logo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a> : "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] cursor-pointer hover:text-primary" onClick={e => {
                    if (lead.products_services) {
                      e.stopPropagation();
                      setModalContent({
                        title: "Products/Services",
                        text: lead.products_services
                      });
                      setShowTextModal(true);
                    }
                  }}>
                            <div className="truncate">{lead.products_services || "—"}</div>
                          </TableCell>
                          <TableCell className="max-w-[200px] cursor-pointer hover:text-primary" onClick={e => {
                    if (lead.news) {
                      e.stopPropagation();
                      try {
                        const newsData = JSON.parse(lead.news);
                        setNewsModalData(newsData);
                        setShowNewsModal(true);
                      } catch {
                        setModalContent({
                          title: "News",
                          text: lead.news
                        });
                        setShowTextModal(true);
                      }
                    }
                  }}>
                            <div className="truncate">
                              {lead.news ? (() => {
                        try {
                          const newsData = JSON.parse(lead.news);
                          return newsData.news_count > 0 ? `${newsData.news_count} article${newsData.news_count > 1 ? "s" : ""}` : "No news";
                        } catch {
                          return lead.news;
                        }
                      })() : "—"}
                            </div>
                          </TableCell>
                        </>}
                      {/* Company View: Industry, Founded, Contacts, Logo, Products/Services, News */}
                      {viewMode === 'company' && <>
                          <TableCell>{lead.company_industry || "—"}</TableCell>
                          <TableCell>{lead.founded_date || "—"}</TableCell>
                          <TableCell>
                            {(() => {
                      const apolloContacts = lead.company_contacts?.filter(c => c.source === "apollo_people_search") || [];
                      const scraperContacts = lead.company_contacts?.filter(c => c.source !== "apollo_people_search") || [];
                      const totalContacts = apolloContacts.length + scraperContacts.length + (lead.contact_email ? 1 : 0);
                      if (totalContacts === 0) return "—";
                      return <Button variant="ghost" size="sm" className="h-auto p-1 text-primary hover:underline" onClick={e => {
                        e.stopPropagation();
                        setContactsModalLead(lead);
                        setShowContactsModal(true);
                      }}>
                                  <Users className="h-3 w-3 mr-1" />
                                  {totalContacts} contact{totalContacts > 1 ? "s" : ""}
                                </Button>;
                    })()}
                          </TableCell>
                          <TableCell>
                            {lead.logo_url ? <a href={lead.logo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a> : "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] cursor-pointer hover:text-primary" onClick={e => {
                    if (lead.products_services) {
                      e.stopPropagation();
                      setModalContent({
                        title: "Products/Services",
                        text: lead.products_services
                      });
                      setShowTextModal(true);
                    }
                  }}>
                            <div className="truncate">{lead.products_services || "—"}</div>
                          </TableCell>
                          <TableCell className="max-w-[200px] cursor-pointer hover:text-primary" onClick={e => {
                    if (lead.news) {
                      e.stopPropagation();
                      try {
                        const newsData = JSON.parse(lead.news);
                        setNewsModalData(newsData);
                        setShowNewsModal(true);
                      } catch {
                        setModalContent({
                          title: "News",
                          text: lead.news
                        });
                        setShowTextModal(true);
                      }
                    }
                  }}>
                            <div className="truncate">
                              {lead.news ? (() => {
                        try {
                          const newsData = JSON.parse(lead.news);
                          return newsData.news_count > 0 ? `${newsData.news_count} article${newsData.news_count > 1 ? "s" : ""}` : "No news";
                        } catch {
                          return lead.news;
                        }
                      })() : "—"}
                            </div>
                          </TableCell>
                        </>}
                      <TableCell className="text-right sticky right-0 bg-background group-hover:bg-muted/50 z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] min-w-[100px]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Drawer direction="right" open={openDrawer === lead.id} onOpenChange={open => {
                      setOpenDrawer(open ? lead.id : null);
                      if (open) {
                        setSelectedLead(lead);
                        setEnrichContactSteps(null);
                        setEnrichedContactResult(null);
                        setPipelineCompleted({ domainValidated: false, socialsSearched: false });
                      }
                    }} dismissible={false}>
                            <DrawerTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Search className="h-4 w-4" />
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent direction="right" className="bg-background [&_*]:select-text [&_button]:select-none [&_[role=button]]:select-none">
                              <DrawerHeader className="flex flex-row items-center justify-between select-none">
                                <div>
                                  <DrawerTitle className="select-none">Enrichments</DrawerTitle>
                                  <p className="text-sm text-muted-foreground mt-1 select-text">
                                    {lead.domain || lead.company || "Unknown"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => {
                              if (confirm(`Are you sure you want to delete "${lead.full_name}"?`)) {
                                handleDelete(lead.id);
                                setOpenDrawer(null);
                              }
                            }} className="select-none text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setOpenDrawer(null)} className="select-none">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </DrawerHeader>
                              <div className="px-4 pb-8 select-text overflow-y-auto" style={{
                          userSelect: "text"
                        }}>
                                {/* Pipeline Button */}
                                <div className="mb-4 p-3 border rounded-lg bg-muted/10">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleRunPipeline(lead)} 
                                    disabled={runningPipeline === lead.id || !lead.company}
                                    className="w-full"
                                    variant="default"
                                  >
                                    {runningPipeline === lead.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {pipelineStep || "Running Pipeline..."}
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="mr-2 h-4 w-4" />
                                        Run Pipeline
                                      </>
                                    )}
                                  </Button>
              {!isClientRole && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Find Domain → Validate → Coords → Distance → Relevance → Match Score
                  <br />
                  <span className="text-muted-foreground/70">+ Enrich Contact (parallel)</span>
                  <br />
                  <span className="text-muted-foreground/70">If score &gt; 50: Enrich Company → Find Contacts → Get News</span>
                  <br />
                  <span className="text-muted-foreground/70">If no domain: Search Socials → Score → Diagnose</span>
                </p>
              )}
              {pipelineDuration[lead.id] !== undefined && runningPipeline !== lead.id && (
                <div className="text-xs text-center mt-3 py-2 px-3 bg-muted/50 rounded-md">
                  <span className="font-medium">⏱️ Last run: {pipelineDuration[lead.id].toFixed(1)}s</span>
                </div>
              )}
                                </div>

                                <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="company-domain" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        Company Domain
                                        {(lead.enrichment_status != null && lead.enrichment_status !== "pending") && (
                                          <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                                        )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="select-text" style={{
                                userSelect: "text"
                              }}>
                                      <div className="space-y-3 pt-2">
                                        {lead.enrichment_logs && lead.enrichment_logs.length > 0 ? <>
                                            {/* Group logs by source */}
                                            {(() => {
                                      // Filter out social search sources and validation step logs (they have 'step' instead of 'source')
                                      const socialSources = ["serpapi_facebook_search", "serpapi_linkedin_search", "serpapi_instagram_search"];
                                      const logsBySource = lead.enrichment_logs
                                        .filter(log => log.source && !socialSources.includes(log.source))
                                        .reduce((acc, log) => {
                                          // Normalize all email sources to a single "email" key
                                          let groupKey = log.source;
                                          if (log.source?.startsWith("email_")) {
                                            groupKey = "email";
                                          } else if (log.source === "google_knowledge_graph" || log.source === "google_local_results") {
                                            groupKey = "google";
                                          } else if (log.source === "apollo_api") {
                                            groupKey = "apollo";
                                          }
                                          if (!acc[groupKey]) {
                                            acc[groupKey] = [];
                                          }
                                          acc[groupKey].push(log);
                                          return acc;
                                        }, {} as Record<string, EnrichmentLog[]>);
                                      return Object.entries(logsBySource).map(([source, logs]) => {
                                        const mostRecentLog = logs[logs.length - 1]; // Get the most recent log (last in array)
                                        const sourceLabel = isClientRole 
                                          ? "Data Source" 
                                          : source === "apollo" ? "Apollo" : source === "google" ? "Google" : source === "email" ? "Email" : source;
                                        return <div key={source} className="border rounded-lg p-3 space-y-3" style={{
                                          userSelect: "text"
                                        }}>
                                                    {/* Source Header */}
                                                    <div className="flex items-center justify-between select-none">
                                                      <h4 className="font-semibold text-sm select-none">
                                                        {sourceLabel}
                                                      </h4>
                                                      {mostRecentLog.domain && <div className="flex items-center gap-1">
                                                          <Badge variant="outline" className="text-xs">
                                                            {lead.email_domain_validated === false && lead.domain === mostRecentLog.domain ? "0%" : `${mostRecentLog.confidence}%`} confidence
                                                          </Badge>
                                                          {(lead.email_domain_validated !== null || lead.match_score_source === "invalid_domain" || lead.match_score_source === "parked_domain") && lead.domain === mostRecentLog.domain && <TooltipProvider>
                                                              <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                  {lead.match_score_source === "parked_domain" ? (
                                                                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                                                                      ⚠ PARKED
                                                                    </Badge>
                                                                  ) : lead.match_score_source === "invalid_domain" || lead.email_domain_validated === false ? (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                      ✗ INVALID
                                                                    </Badge>
                                                                  ) : (
                                                                    <Badge variant="default" className="text-xs bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black">
                                                                      ✓ VALID
                                                                    </Badge>
                                                                  )}
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                  <p className="text-xs">
                                                                    {(() => {
                                                                      const validationLog = lead.enrichment_logs?.find(log => (log as any).step === 'validate_domain');
                                                                      if (lead.match_score_source === "parked_domain") {
                                                                        return (validationLog as any)?.reason || "Domain is parked or for sale. The domain exists but may be available for purchase.";
                                                                      }
                                                                      return (validationLog as any)?.reason || lead.domain_relevance_explanation || "Domain validation result";
                                                                    })()}
                                                                  </p>
                                                                </TooltipContent>
                                                              </Tooltip>
                                                            </TooltipProvider>}
                                                          <TooltipProvider>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                              </TooltipTrigger>
                                                              <TooltipContent className="max-w-xs">
                                                                <p className="text-xs">
                                                                  {getConfidenceExplanation(source, mostRecentLog.confidence)}
                                                                </p>
                                                              </TooltipContent>
                                                            </Tooltip>
                                                          </TooltipProvider>
                                                        </div>}
                                                    </div>

                                                    {/* Domain Display */}
                                                    <div style={{
                                            userSelect: "text"
                                          }}>
                                                      <p className="text-xs text-muted-foreground mb-1 select-text">
                                                        Domain:
                                                      </p>
                                                      {mostRecentLog.domain ? <a href={`https://${mostRecentLog.domain}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 select-text" onClick={e => e.stopPropagation()} style={{
                                              userSelect: "text"
                                            }}>
                                                          {mostRecentLog.domain}
                                                          <ExternalLink className="h-3 w-3 select-none" />
                                                        </a> : <p className="text-sm text-muted-foreground select-text">
                                                          No domain found
                                                        </p>}
                                                    </div>

                                                    {/* Source URL Display (if different from domain) */}
                                                    {mostRecentLog.sourceUrl && mostRecentLog.sourceUrl !== mostRecentLog.domain && <div style={{
                                            userSelect: "text"
                                          }} className="mt-2">
                                                          <p className="text-xs text-muted-foreground mb-1 select-text">
                                                            Source URL:
                                                          </p>
                                                          <a href={`https://${mostRecentLog.sourceUrl}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all" onClick={e => e.stopPropagation()} style={{
                                              userSelect: "text"
                                            }}>
                                                            {mostRecentLog.sourceUrl}
                                                            <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                          </a>
                                                        </div>}

                                                    {/* View Logs Button */}
                                                    <Button size="sm" variant="outline" onClick={() => setShowLogsForSource(showLogsForSource === source ? null : source)} className="w-full select-none">
                                                      {showLogsForSource === source ? "Hide Logs" : "View Logs"}
                                                    </Button>

                                                    {/* Validate Domain Button - show when domain found but not validated or not saved */}
                                                    {mostRecentLog.domain && (lead.domain !== mostRecentLog.domain || lead.email_domain_validated === null) && (
                                                      <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          setCheckingDomain(lead.id);
                                                          try {
                                                            const currentLogs = Array.isArray(lead.enrichment_logs) ? lead.enrichment_logs : [];
                                                            const result = await validateAndSaveDomain(
                                                              lead.id,
                                                              mostRecentLog.domain,
                                                              mostRecentLog.sourceUrl || mostRecentLog.domain,
                                                              mostRecentLog.confidence,
                                                              currentLogs
                                                            );
                                                            
                                                            if (!result.success) throw result.error;
                                                            
                                                            toast({
                                                              title: result.data.is_parked 
                                                                ? "Domain Parked/For Sale" 
                                                                : (result.data.is_valid_domain ? "Domain Valid" : "Domain Invalid"),
                                                              description: result.data.reason || (result.data.is_valid_domain ? "Domain validated successfully" : "Domain validation failed"),
                                                              variant: result.data.is_parked ? "default" : (result.data.is_valid_domain ? "default" : "destructive")
                                                            });
                                                            onEnrichComplete();
                                                          } catch (err) {
                                                            console.error("Domain validation error:", err);
                                                            toast({
                                                              title: "Validation Error",
                                                              description: "Failed to validate domain",
                                                              variant: "destructive"
                                                            });
                                                          } finally {
                                                            setCheckingDomain(null);
                                                          }
                                                        }}
                                                        disabled={checkingDomain === lead.id}
                                                        className="w-full select-none mt-2"
                                                      >
                                                        {checkingDomain === lead.id ? (
                                                          <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Validating...
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Shield className="mr-2 h-4 w-4" />
                                                            Validate Domain
                                                          </>
                                                        )}
                                                      </Button>
                                                    )}

                                                    {/* Collapsible Logs Section */}
                                                    {showLogsForSource === source && <div className="space-y-2 max-h-96 overflow-y-auto pt-2 border-t" style={{
                                            userSelect: "text"
                                          }}>
                                                        {/* Show only the most recent log */}
                                                        {(() => {
                                              const latestLog = logs[logs.length - 1];
                                              return <div className="bg-muted/30 rounded-md p-2 text-xs space-y-1" style={{
                                                userSelect: "text"
                                              }}>
                                                              <div className="flex items-center justify-between">
                                                                <span className="font-medium text-muted-foreground">
                                                                  {new Date(latestLog.timestamp).toLocaleString()}
                                                                </span>
                                                              </div>

                                                              {/* Search Steps */}
                                                              {latestLog.searchSteps && latestLog.searchSteps.length > 0 && <div className="border rounded p-2 mb-2 bg-background/50">
                                                                    <p className="font-medium mb-2">Search Path:</p>
                                                                    <div className="space-y-2">
                                                                      {latestLog.searchSteps.map((step, idx) => <div key={idx} className="border-l-2 border-primary/30 pl-2">
                                                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                            <Badge variant={step.query.startsWith("Skipped") ? "outline" : step.resultFound ? "default" : "secondary"} className="text-xs h-5">
                                                                              Step {step.step}
                                                                            </Badge>
                                                                            {step.spellingCorrected && <Badge variant="outline" className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-300">
                                                                                Corrected
                                                                              </Badge>}
                                                                            {step.resultFound && step.source && <span className="text-muted-foreground text-xs">
                                                                                via {step.source}
                                                                              </span>}
                                                                            {step.query.startsWith("Skipped") && <span className="text-muted-foreground text-xs italic">
                                                                                Skipped
                                                                              </span>}
                                                                          </div>
                                                                          {step.spellingCorrection && <div className="text-amber-600 text-xs mt-1 mb-2 bg-amber-50 p-2 rounded border border-amber-200">
                                                                              ✏️ Spelling correction:{" "}
                                                                              <span className="font-semibold">
                                                                                "{step.spellingCorrection.original}"
                                                                              </span>{" "}
                                                                              →{" "}
                                                                              <span className="font-semibold">
                                                                                "{step.spellingCorrection.corrected}"
                                                                              </span>
                                                                            </div>}
                                                                          <p className="text-muted-foreground break-all font-mono text-xs mt-1 bg-muted/50 p-1 rounded">
                                                                            {step.query}
                                                                          </p>
                                                                          <p className="mt-1 font-medium text-xs">
                                                                            {step.query.startsWith("Skipped") ? "⊘ Skipped" : step.resultFound ? "✓ Found results" : "✗ No results"}
                                                                          </p>
                                                                        </div>)}
                                                                    </div>
                                                                  </div>}

                                                              <div className="text-muted-foreground space-y-0.5">
                                                                <p>
                                                                  <span className="font-medium">Company:</span>{" "}
                                                                  {latestLog.searchParams.company}
                                                                </p>
                                                                {latestLog.searchParams.city && <p>
                                                                    <span className="font-medium">City:</span>{" "}
                                                                    {latestLog.searchParams.city}
                                                                  </p>}
                                                                {latestLog.searchParams.state && <p>
                                                                    <span className="font-medium">State:</span>{" "}
                                                                    {latestLog.searchParams.state}
                                                                  </p>}
                                                                {latestLog.searchParams.micsSector && <p>
                                                                    <span className="font-medium">MICS Sector:</span>{" "}
                                                                    {latestLog.searchParams.micsSector}
                                                                  </p>}
                                                                {latestLog.searchParams.email && <p>
                                                                    <span className="font-medium">Email:</span>{" "}
                                                                    {latestLog.searchParams.email}
                                                                  </p>}
                                                                {latestLog.searchParams.extractedDomain && <p>
                                                                    <span className="font-medium">
                                                                      Extracted Domain:
                                                                    </span>{" "}
                                                                    {latestLog.searchParams.extractedDomain}
                                                                  </p>}
                                                                <p>
                                                                  <span className="font-medium">
                                                                    Organizations found:
                                                                  </span>{" "}
                                                                  {latestLog.organizationsFound}
                                                                </p>
                                                              </div>
                                                              {latestLog.selectedOrganization && <div className="border-t pt-1 mt-1 space-y-0.5">
                                                                  <p className="font-medium">
                                                                    {latestLog.selectedOrganization.name}
                                                                  </p>
                                                                  <p>Domain: {latestLog.selectedOrganization.domain}</p>
                                                                  {latestLog.selectedOrganization.revenue && <p>
                                                                      Revenue: {latestLog.selectedOrganization.revenue}
                                                                    </p>}
                                                                  {latestLog.selectedOrganization.foundedYear && <p>
                                                                      Founded:{" "}
                                                                      {latestLog.selectedOrganization.foundedYear}
                                                                    </p>}
                                                                </div>}
                                                              {latestLog.gpsCoordinates && <div className="border-t pt-1 mt-1 space-y-0.5">
                                                                  <p className="font-medium">GPS Coordinates</p>
                                                                  <p>Latitude: {latestLog.gpsCoordinates.latitude}</p>
                                                                  <p>Longitude: {latestLog.gpsCoordinates.longitude}</p>
                                                                </div>}
                                                              {latestLog.searchInformation && <div className="border-t pt-1 mt-1 space-y-0.5">
                                                                  <p className="font-medium">Search Info</p>
                                                                  <p>
                                                                    Query: {latestLog.searchInformation.query_displayed}
                                                                  </p>
                                                                  <p>
                                                                    Results for:{" "}
                                                                    {latestLog.searchInformation.results_for}
                                                                  </p>
                                                                </div>}
                                                            </div>;
                                            })()}

                                                        {/* Domain Validation Result */}
                                                        {lead.enrichment_logs?.filter(log => (log as any).step === 'validate_domain').map((validationLog: any, idx) => (
                                                          <div key={`validation-${idx}`} className="border rounded-lg p-3 mt-3 bg-muted/30">
                                                            <div className="flex items-center justify-between mb-2">
                                                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                                                <Globe className="h-3 w-3" />
                                                                Domain Validation
                                                              </h4>
                                                              <Badge 
                                                                variant={validationLog.is_parked ? "secondary" : (validationLog.is_valid ? "default" : "destructive")} 
                                                                className={`text-xs ${validationLog.is_valid && !validationLog.is_parked ? "bg-black dark:bg-white text-white dark:text-black" : ""}`}
                                                              >
                                                                {validationLog.is_parked ? "⚠ PARKED" : (validationLog.is_valid ? "✓ VALID" : "✗ INVALID")}
                                                              </Badge>
                                                            </div>
                                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                              <p><span className="font-medium text-foreground">Domain:</span> {validationLog.domain}</p>
                                                              <p><span className="font-medium text-foreground">Reason:</span> {validationLog.reason}</p>
                                                              {validationLog.http_status && (
                                                                <p><span className="font-medium text-foreground">HTTP Status:</span> {validationLog.http_status}</p>
                                                              )}
                                                              <p className="text-xs opacity-60 mt-2">
                                                                {new Date(validationLog.timestamp).toLocaleString()}
                                                              </p>
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>}
                                                  </div>;
                                      });
                                    })()}
                                          </> : <p className="text-sm text-muted-foreground">No enrichment data yet</p>}


                                        {/* Generic Diagnose Button - appears when no domain currently found */}
                                        {lead.enrichment_logs && lead.enrichment_logs.length > 0 && (() => {
                                    const hasApolloOrGoogle = lead.enrichment_logs.some(log => log.source === "apollo_api" || log.source?.startsWith("google_"));
                                    return hasApolloOrGoogle && !lead.domain ? <div className="mt-4 pt-4 border-t space-y-3">
                                                <Button size="sm" variant="outline" onClick={() => handleDiagnose(lead)} disabled={diagnosing?.leadId === lead.id} className="w-full select-none">
                                                  {diagnosing?.leadId === lead.id ? <>
                                                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                      Diagnosing...
                                                    </> : <>
                                                      <Sparkles className="h-3 w-3 mr-2" />
                                                      Diagnose Why No Domain Found
                                                    </>}
                                                </Button>

                                                {/* Diagnosis Results */}
                                                {lead.diagnosis_category && <div className="border rounded-lg overflow-hidden">
                                                    {/* Category Header - Collapsible */}
                                                    <button onClick={() => setExpandedDiagnosis(expandedDiagnosis === lead.id ? null : lead.id)} className="w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left">
                                                      <div className="flex items-center gap-2 flex-1">
                                                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                                                        <span className="text-sm font-medium">
                                                          {lead.diagnosis_category}
                                                        </span>
                                                        <Badge variant={lead.diagnosis_confidence === "high" ? "default" : lead.diagnosis_confidence === "medium" ? "secondary" : "outline"} className="text-xs">
                                                          {lead.diagnosis_confidence}
                                                        </Badge>
                                                      </div>
                                                      <svg className={`h-4 w-4 transition-transform ${expandedDiagnosis === lead.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                      </svg>
                                                    </button>

                                                    {/* Expanded Details */}
                                                    {expandedDiagnosis === lead.id && <div className="p-3 bg-background space-y-2 border-t">
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
                                                      </div>}
                                                  </div>}
                                              </div> : null;
                                  })()}


                                        {/* Find Domain - Combined Action - Hide for client role */}
                                        {!isClientRole && (
                                        <div className="mb-4">
                                          <Button size="sm" onClick={() => handleFindDomain(lead)} disabled={findingDomain === lead.id || !lead.company} className="w-full bg-[#0e0f4d] hover:bg-[#0e0f4d]/90" variant="default">
                                            {findingDomain === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {findDomainStep || "Finding Domain..."}
                                              </> : <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Find Domain
                                              </>}
                                          </Button>
                                          
                                          {/* Validate Domain Button - only show when domain exists */}
                                          {lead.domain && <div className="mt-2">
                                              <Button size="sm" variant="outline" onClick={() => handleCheckDomain(lead)} disabled={checkingDomain === lead.id} className="w-full">
                                                {checkingDomain === lead.id ? <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Validating...
                                                  </> : <>
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    Validate Domain
                                                  </>}
                                              </Button>
                                              
                                              {/* Show validation status */}
                                              {lead.email_domain_validated === true && <p className="text-xs text-primary text-center mt-1">
                                                  ✓ Domain verified
                                                </p>}
                                              {lead.email_domain_validated === false && <div className="flex items-center justify-center gap-1 mt-1">
                                                  <Badge variant="destructive" className="text-xs">
                                                    Invalid
                                                  </Badge>
                                                  <span className="text-xs text-muted-foreground">0% confidence</span>
                                                </div>}
                                            </div>}
                                          
                                          {!lead.domain && <p className="text-xs text-muted-foreground text-center mt-1">
                                              Find a domain first to check validity
                                            </p>}
                                        </div>
                                        )}

                                        {/* Enrich Buttons - Hide for client role */}
                                        {!isClientRole && (
                                        <div className="space-y-2 mt-4">
                                          <Button size="sm" onClick={() => handleEnrich(lead, "apollo")} disabled={enrichingSource?.leadId === lead.id || findingDomain === lead.id || !lead.company} className="w-full" variant="outline">
                                            {enrichingSource?.leadId === lead.id && enrichingSource?.source === "apollo" ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Enriching with Apollo...
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich with Apollo
                                              </>}
                                          </Button>
                                          <Button size="sm" onClick={() => handleEnrich(lead, "google")} disabled={enrichingSource?.leadId === lead.id || findingDomain === lead.id || !lead.company} className="w-full" variant="outline">
                                            {enrichingSource?.leadId === lead.id && enrichingSource?.source === "google" ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Enriching with Google...
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich with Google
                                              </>}
                                          </Button>
                                          <Button size="sm" onClick={() => handleEnrich(lead, "email")} disabled={enrichingSource?.leadId === lead.id || findingDomain === lead.id || !lead.email} className="w-full" variant="outline">
                                            {enrichingSource?.leadId === lead.id && enrichingSource?.source === "email" ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Enriching with Email...
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich with Email
                                              </>}
                                          </Button>
                                        </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Socials Search Section */}
                                  <AccordionItem value="socials-search" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        Socials Search
                                        {(() => {
                                          // Check if all 3 social searches were performed (Facebook, LinkedIn, Instagram)
                                          const hasFacebookLog = lead.enrichment_logs?.some(log => 
                                            log.source === "serpapi_facebook_search"
                                          );
                                          const hasLinkedInLog = lead.enrichment_logs?.some(log => 
                                            log.source === "serpapi_linkedin_search"
                                          );
                                          const hasInstagramLog = lead.enrichment_logs?.some(log => 
                                            log.source === "serpapi_instagram_search"
                                          );
                                          
                                          const allThreeSearched = hasFacebookLog && hasLinkedInLog && hasInstagramLog;
                                          
                                          // Show checkmark if pipeline state indicates socials were searched
                                          if (pipelineCompleted.socialsSearched) {
                                            return <CheckCircle className="h-4 w-4 text-black dark:text-white" />;
                                          }
                                          
                                          // If all 3 searches were performed
                                          if (allThreeSearched) {
                                            // Check if anything was found
                                            const hasAnyFound = !!(lead.facebook || lead.linkedin || lead.instagram);
                                            
                                            // Show checkmark if: nothing found OR (found AND validated)
                                            if (!hasAnyFound) {
                                              // All 3 searched, nothing found - show checkmark
                                              return <CheckCircle className="h-4 w-4 text-black dark:text-white" />;
                                            } else {
                                              // Something found - check if validated
                                              const hasValidated = (
                                                (lead.facebook && lead.facebook_validated != null) ||
                                                (lead.linkedin && lead.linkedin_validated !== null) ||
                                                (lead.instagram && lead.instagram_validated !== null)
                                              );
                                              
                                              // Show checkmark if found AND validated
                                              return hasValidated ? (
                                                <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                                              ) : null;
                                            }
                                          }
                                          
                                          return null;
                                        })()}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4 pt-2">
                                        {/* Facebook Section */}
                                        <div className="space-y-3">
                                          <p className="text-xs font-medium text-[#0F0F4B]">Facebook</p>

                                          {/* Existing Facebook result display */}
                                          {lead.facebook && <div className="p-3 border rounded-lg bg-muted/30">
                                              <div className="flex items-center justify-between">
                                                <div style={{
                                          userSelect: "text"
                                        }}>
                                                  <a href={lead.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all" onClick={e => e.stopPropagation()}>
                                                    {lead.facebook}
                                                    <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                  </a>
                                                </div>
                                                {lead.facebook_validated !== null && <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge variant={lead.facebook_validated ? "default" : "destructive"} className={`text-xs ${lead.facebook_validated ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black" : ""}`}>
                                                          {lead.facebook_validated ? "✓ Valid" : "✗ Invalid"}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.social_validation_log?.results?.facebook?.reason || "AI validation result"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>}
                                              </div>
                                            </div>}

                                          {/* Facebook Search Logs */}
                                          {lead.enrichment_logs && lead.enrichment_logs.some(log => log.action === "facebook_search_serper") && <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Search Logs
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                                    {(() => {
                                            const fbLog = [...lead.enrichment_logs].reverse().find(log => log.action === "facebook_search_serper") as any;
                                            if (!fbLog) return null;

                                            // Support both old format (searchSteps[0].organicResults) and new format (top3Results)
                                            const query = fbLog.query || fbLog.searchSteps?.[0]?.query || "";
                                            const organicResults = fbLog.top3Results || fbLog.searchSteps?.[0]?.organicResults || [];
                                            return <>
                                                          <p className="text-muted-foreground">
                                                            <span className="font-medium">Searched:</span>{" "}
                                                            {new Date(fbLog.timestamp).toLocaleString()}
                                                          </p>
                                                          {query && <div className="mt-2">
                                                              <p className="text-muted-foreground font-medium mb-1">
                                                                Query:
                                                              </p>
                                                              <p className="font-mono text-xs break-all bg-muted/50 p-1 rounded">
                                                                {query}
                                                              </p>
                                                            </div>}
                                                          {organicResults.length > 0 && <div className="mt-2 space-y-2">
                                                              <p className="text-muted-foreground font-medium">
                                                                organic_results ({organicResults.length}):
                                                              </p>
                                                              {organicResults.map((result: any, rIdx: number) => <pre key={rIdx} className="p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                                                                  {JSON.stringify(result, null, 2)}
                                                                </pre>)}
                                                            </div>}
                                                        </>;
                                          })()}
                                                  </div>
                                                </CollapsibleContent>
                                              </Collapsible>}

                                          {/* Search Facebook Button */}
                                          <Button size="sm" onClick={() => handleSearchFacebookSerper(lead)} disabled={enrichingFacebook === lead.id || !lead.company} className="w-full" variant="outline">
                                            {enrichingFacebook === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching Facebook...
                                              </> : <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search Facebook
                                              </>}
                                          </Button>
                                        </div>

                                        {/* LinkedIn Section */}
                                        <div className="space-y-3 pt-3 border-t">
                                          <p className="text-xs font-medium text-[#0F0F4B]">LinkedIn</p>

                                          {/* LinkedIn result display */}
                                          {lead.linkedin && <div className="p-3 border rounded-lg bg-muted/30">
                                              <div className="flex items-center justify-between">
                                                <div style={{
                                          userSelect: "text"
                                        }}>
                                                  <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all" onClick={e => e.stopPropagation()}>
                                                    {lead.linkedin}
                                                    <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                  </a>
                                                </div>
                                                {lead.linkedin_validated !== null && <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge variant={lead.linkedin_validated ? "default" : "destructive"} className={`text-xs ${lead.linkedin_validated ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black" : ""}`}>
                                                          {lead.linkedin_validated ? "✓ Valid" : "✗ Invalid"}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.social_validation_log?.results?.linkedin?.reason || "AI validation result"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>}
                                              </div>
                                            </div>}

                                          {/* LinkedIn Search Logs */}
                                          {lead.enrichment_logs && lead.enrichment_logs.some(log => log.action === "linkedin_search_serper") && <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Search Logs
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                                    {(() => {
                                            const liLog = [...lead.enrichment_logs].reverse().find(log => log.action === "linkedin_search_serper") as any;
                                            if (!liLog) return null;

                                            // Support both old format (searchSteps) and new format (query + top3Results)
                                            const query = liLog.query || liLog.searchSteps?.[0]?.query || "";
                                            const organicResults = liLog.top3Results || liLog.searchSteps?.[0]?.organicResults || [];
                                            return <>
                                                          <p className="text-muted-foreground">
                                                            <span className="font-medium">Searched:</span>{" "}
                                                            {new Date(liLog.timestamp).toLocaleString()}
                                                          </p>
                                                          {query && <div className="mt-2">
                                                              <p className="text-muted-foreground font-medium mb-1">
                                                                Query:
                                                              </p>
                                                              <p className="font-mono text-xs break-all bg-muted/50 p-1 rounded">
                                                                {query}
                                                              </p>
                                                            </div>}
                                                          {organicResults.length > 0 && <div className="mt-2 space-y-2">
                                                              <p className="text-muted-foreground font-medium">
                                                                organic_results ({organicResults.length}):
                                                              </p>
                                                              {organicResults.map((result: any, rIdx: number) => <pre key={rIdx} className="p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                                                                  {JSON.stringify(result, null, 2)}
                                                                </pre>)}
                                                            </div>}
                                                        </>;
                                          })()}
                                                  </div>
                                                </CollapsibleContent>
                                              </Collapsible>}

                                          {/* Search LinkedIn Button */}
                                          <Button size="sm" onClick={() => handleSearchLinkedinSerper(lead)} disabled={enrichingLinkedin === lead.id || !lead.company} className="w-full" variant="outline">
                                            {enrichingLinkedin === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching LinkedIn...
                                              </> : <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search LinkedIn
                                              </>}
                                          </Button>
                                        </div>

                                        {/* Instagram Section */}
                                        <div className="space-y-3 pt-3 border-t">
                                          <p className="text-xs font-medium text-[#0F0F4B]">Instagram</p>

                                          {/* Instagram result display */}
                                          {lead.instagram && <div className="p-3 border rounded-lg bg-muted/30">
                                              <div className="flex items-center justify-between">
                                                <div style={{
                                          userSelect: "text"
                                        }}>
                                                  <a href={lead.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 select-text break-all" onClick={e => e.stopPropagation()}>
                                                    {lead.instagram}
                                                    <ExternalLink className="h-3 w-3 select-none flex-shrink-0" />
                                                  </a>
                                                </div>
                                                {lead.instagram_validated !== null && <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge variant={lead.instagram_validated ? "default" : "destructive"} className={`text-xs ${lead.instagram_validated ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black" : ""}`}>
                                                          {lead.instagram_validated ? "✓ Valid" : "✗ Invalid"}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent className="max-w-xs">
                                                        <p className="text-xs">
                                                          {lead.social_validation_log?.results?.instagram?.reason || "AI validation result"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>}
                                              </div>
                                            </div>}

                                          {/* Instagram Search Logs */}
                                          {lead.enrichment_logs && lead.enrichment_logs.some(log => log.action === "instagram_search_serper") && <Collapsible>
                                                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start">
                                                  <ChevronRight className="h-3 w-3 transition-transform ui-expanded:rotate-90" />
                                                  View Search Logs
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                                                    {(() => {
                                            const igLog = [...lead.enrichment_logs].reverse().find(log => log.action === "instagram_search_serper") as any;
                                            if (!igLog) return null;
                                            const query = igLog.query || "";
                                            const organicResults = igLog.top3Results || [];
                                            return <>
                                                          <p className="text-muted-foreground">
                                                            <span className="font-medium">Searched:</span>{" "}
                                                            {new Date(igLog.timestamp).toLocaleString()}
                                                          </p>
                                                          {query && <div className="mt-2">
                                                              <p className="text-muted-foreground font-medium mb-1">
                                                                Query:
                                                              </p>
                                                              <p className="font-mono text-xs break-all bg-muted/50 p-1 rounded">
                                                                {query}
                                                              </p>
                                                            </div>}
                                                          {organicResults.length > 0 && <div className="mt-2 space-y-2">
                                                              <p className="text-muted-foreground font-medium">
                                                                organic_results ({organicResults.length}):
                                                              </p>
                                                              {organicResults.map((result: any, rIdx: number) => <pre key={rIdx} className="p-2 bg-background rounded border text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                                                                  {JSON.stringify(result, null, 2)}
                                                                </pre>)}
                                                            </div>}
                                                        </>;
                                          })()}
                                                  </div>
                                                </CollapsibleContent>
                                              </Collapsible>}

                                          {/* Search Instagram Button */}
                                          <Button size="sm" onClick={() => handleSearchInstagramSerper(lead)} disabled={enrichingInstagram === lead.id || !lead.company} className="w-full" variant="outline">
                                            {enrichingInstagram === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching Instagram...
                                              </> : <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search Instagram
                                              </>}
                                          </Button>
                                        </div>

                                        {/* Calculate Score Button */}
                                        <div className="pt-4 border-t">
                                          <Button size="sm" onClick={() => handleScoreSocialRelevance(lead)} disabled={scoringSocials === lead.id || !lead.facebook && !lead.linkedin && !lead.instagram} className="w-full" variant="default">
                                            {scoringSocials === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Scoring Socials...
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Calculate Score
                                              </>}
                                          </Button>
                                          {!lead.facebook && !lead.linkedin && !lead.instagram && <p className="text-xs text-muted-foreground mt-2 text-center">
                                              Search for at least one social profile first
                                            </p>}
                                        </div>

                                        <p className="text-xs text-muted-foreground text-center pt-2">
                                          Social search: Facebook, LinkedIn, Instagram
                                        </p>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  <AccordionItem value="match-score" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        Match Score
                                        {lead.match_score !== null && (
                                          <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                                        )}
                                      </div>
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
                                              {lead.match_score !== null ? <div className="flex items-center gap-3">
                                                  <p className="text-4xl font-bold">{lead.match_score}%</p>
                                                  <Badge variant={lead.match_score >= 80 ? "default" : lead.match_score >= 50 ? "secondary" : "destructive"} className={lead.match_score >= 80 ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white" : lead.match_score >= 50 ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500" : "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white"}>
                                                    {lead.match_score >= 80 ? "🟢 High" : lead.match_score >= 50 ? "🟡 Medium" : "🔴 Low"}
                                                  </Badge>
                                                </div> : <p className="text-sm text-muted-foreground italic">
                                                  Not calculated yet
                                                </p>}
                                            </div>
                                          </div>

                                          {lead.match_score_source && <div className="mb-3 pb-3 border-b">
                                              <p className="text-xs text-muted-foreground mb-1">Determined by:</p>
                                              <p className="text-sm font-medium">
                                                {lead.match_score_source === "email_validated" && "✅ Email Validated via Website Scrape"}
                                                {lead.match_score_source === "email_domain" && "📧 Email Domain Verified"}
                                                {lead.match_score_source === "google_knowledge_graph" && "🌐 Google Knowledge Graph"}
                                                {lead.match_score_source === "calculated" && "📊 Distance + Domain Relevance"}
                                              </p>
                                            </div>}

                                          <Button size="sm" variant="default" className="w-full bg-[#0e0f4d] hover:bg-[#0e0f4d]/90" disabled={calculatingMatchScore === lead.id} onClick={() => handleCalculateMatchScore(lead)}>
                                            {calculatingMatchScore === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Calculating...
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Calculate Match Score
                                              </>}
                                          </Button>
                                        </div>

                                        {/* Nested Accordion for Distance */}
                                        <Accordion type="single" collapsible className="w-full">
                                          <AccordionItem value="distance" className="border-border">
                                            <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer py-3">
                                              <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-2">
                                                  <span>Distance</span>
                                                  {lead.distance_miles && <span className="font-semibold text-foreground">
                                                      {lead.distance_miles} miles
                                                    </span>}
                                                </div>
                                                {lead.distance_confidence && <Badge variant={lead.distance_confidence === "high" ? "default" : lead.distance_confidence === "medium" ? "secondary" : lead.distance_confidence === "undefined" ? "outline" : "destructive"} className={lead.distance_confidence === "high" ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white" : lead.distance_confidence === "medium" ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500" : lead.distance_confidence === "undefined" ? "bg-gray-200 hover:bg-gray-300 text-gray-600 border-gray-300" : "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white"} onClick={e => e.stopPropagation()}>
                                                    {lead.distance_confidence === "high" ? "🟢 High" : lead.distance_confidence === "medium" ? "🟡 Medium" : lead.distance_confidence === "undefined" ? "⚪ Undefined" : "🔴 Low"}
                                                  </Badge>}
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="space-y-3 pt-2">
                                                {/* Distance Details (if calculated) */}
                                                {lead.distance_miles ? <div className="p-4 bg-muted rounded-lg space-y-3">
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
                                                    {lead.distance_confidence && <div className="pt-3 border-t">
                                                        <p className="text-sm font-medium text-muted-foreground mb-2">
                                                          Confidence Level
                                                        </p>
                                                        <Badge variant={lead.distance_confidence === "high" ? "default" : lead.distance_confidence === "medium" ? "secondary" : lead.distance_confidence === "undefined" ? "outline" : "destructive"} className={lead.distance_confidence === "high" ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white" : lead.distance_confidence === "medium" ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500" : lead.distance_confidence === "undefined" ? "bg-gray-200 hover:bg-gray-300 text-gray-600 border-gray-300" : "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white"}>
                                                          {lead.distance_confidence === "high" ? "🟢 High Confidence" : lead.distance_confidence === "medium" ? "🟡 Medium Confidence" : lead.distance_confidence === "undefined" ? "⚪ Undefined" : "🔴 Low Confidence"}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                          {lead.distance_confidence === "high" ? "Lead is within 50 miles - likely a strong match" : lead.distance_confidence === "medium" ? "Lead is 50-100 miles away - moderate match" : lead.distance_confidence === "undefined" ? "No coordinates found for this company" : "Lead is over 100 miles away - lower match likelihood"}
                                                        </p>
                                                      </div>}
                                                  </div> : <p className="text-sm text-muted-foreground">
                                                    No distance calculated yet
                                                  </p>}

                                                {/* Show Find Coordinates button if domain exists but no coordinates */}
                                                {lead.domain && <Button size="sm" variant="outline" className="w-full" disabled={findingCoordinates === lead.id} onClick={() => handleFindCoordinates(lead)}>
                                                    {findingCoordinates === lead.id ? <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Finding Coordinates...
                                                      </> : <>
                                                        <Search className="mr-2 h-4 w-4" />
                                                        Find Coordinates from Company
                                                      </>}
                                                  </Button>}

                                                {/* Calculate Distance button (enabled when coordinates exist) */}
                                                {lead.latitude && lead.longitude && <Button size="sm" variant="outline" className="w-full" disabled={!lead.city || !lead.zipcode || calculatingDistance === lead.id} onClick={() => handleCalculateDistance(lead)}>
                                                    {calculatingDistance === lead.id ? <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Calculating...
                                                      </> : <>
                                                        <MapPin className="mr-2 h-4 w-4" />
                                                        Calculate Distance
                                                      </>}
                                                  </Button>}

                                                {/* Show message only if no domain and no coordinates */}
                                                {(!lead.latitude || !lead.longitude) && !lead.domain && <p className="text-xs text-muted-foreground text-center">
                                                    Run enrichment first to find a domain
                                                  </p>}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>

                                          {/* Domain Relevance Accordion Item */}
                                          <AccordionItem value="domain-relevance" className="border-border">
                                            <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer py-3">
                                              <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-2">
                                                  <span>Domain Relevance</span>
                                                  {lead.domain_relevance_score !== null && <span className="font-semibold text-foreground">
                                                      {lead.domain_relevance_score}/100
                                                    </span>}
                                                </div>
                                                {lead.domain_relevance_score !== null && <Badge variant={lead.domain_relevance_score >= 80 ? "default" : lead.domain_relevance_score >= 50 ? "secondary" : "destructive"} className={lead.domain_relevance_score >= 80 ? "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white" : lead.domain_relevance_score >= 50 ? "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500" : "bg-black dark:bg-white hover:bg-black dark:hover:bg-white text-white dark:text-black border-black dark:border-white"} onClick={e => e.stopPropagation()}>
                                                    {lead.domain_relevance_score >= 80 ? "🟢 High" : lead.domain_relevance_score >= 50 ? "🟡 Medium" : "🔴 Low"}
                                                  </Badge>}
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="space-y-3 pt-2">
                                                {/* Domain Relevance Details */}
                                                {lead.domain_relevance_score !== null ? <div className="p-4 bg-muted rounded-lg space-y-3">
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

                                                    {lead.domain_relevance_explanation && <div className="pt-3 border-t">
                                                        <p className="text-sm font-medium text-muted-foreground mb-2">
                                                          Analysis
                                                        </p>
                                                        <p className="text-sm text-foreground">
                                                          {lead.domain_relevance_explanation}
                                                        </p>
                                                      </div>}

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
                                                      <a href={`https://${lead.domain}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                                        {lead.domain}
                                                        <ExternalLink className="h-3 w-3" />
                                                      </a>
                                                    </div>
                                                  </div> : <p className="text-sm text-muted-foreground">
                                                    No relevance score calculated yet
                                                  </p>}

                                                {/* Score Button */}
                                                <Button size="sm" variant="outline" className="w-full" disabled={!lead.company || !lead.domain || scoringDomain === lead.id} onClick={() => handleScoreDomainRelevance(lead)}>
                                                  {scoringDomain === lead.id ? <>
                                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                      Scoring...
                                                    </> : <>
                                                      <Sparkles className="mr-2 h-4 w-4" />
                                                      Score Domain Relevance
                                                    </>}
                                                </Button>

                                                {/* Show message if domain not available */}
                                                {(!lead.domain || !lead.company) && <p className="text-xs text-muted-foreground text-center">
                                                    Run domain enrichment first to get company domain
                                                  </p>}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>

                                        </Accordion>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Company Details Accordion Item - Always visible when company exists */}
                                  {lead.company && <AccordionItem value="company-details" className="border-border">
                                      <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <span>Company Details</span>
                                          {lead.scraped_data_log && <CheckCircle className="h-4 w-4 text-green-500" />}
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-3 pt-2">

                                          <Button size="sm" variant="default" className="w-full" disabled={enrichingCompanyDetails === lead.id || lead.match_score === null || (lead.match_score ?? 0) < 50} onClick={() => handleEnrichCompanyDetails(lead)}>
                                            {enrichingCompanyDetails === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {companyDetailsStep?.message || "Enriching..."}
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich with Apollo + Scrape Website
                                              </>}
                                          </Button>
                                          <Button size="sm" variant="outline" className="w-full mt-2" disabled={enrichingCompanyWithClay === lead.id || lead.match_score === null || (lead.match_score ?? 0) < 50} onClick={() => handleEnrichCompanyWithClay(lead)}>
                                            {enrichingCompanyWithClay === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending to Clay...
                                              </> : <>
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Enrich with Clay
                                              </>}
                                          </Button>
                                          {(lead.match_score === null || (lead.match_score ?? 0) < 50) && <p className="text-xs text-destructive/70">
                                              {lead.match_score === null ? "Blocked: Match Score not calculated (run Calculate Match Score first)" : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                            </p>}

                                          {/* Step progress indicator */}
                                          {enrichingCompanyDetails === lead.id && companyDetailsStep && <div className="bg-muted/50 rounded-md p-3 space-y-2">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                {lead.apollo_not_found ?
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
                                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${companyDetailsStep.step === 1 ? "bg-primary text-primary-foreground animate-pulse" : "bg-black dark:bg-white text-white dark:text-black"}`}>
                                                        1
                                                      </div>
                                                      <span className="text-muted-foreground">Scrape</span>
                                                    </div>
                                                    <div className="w-3 h-px bg-border" />
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${companyDetailsStep.step === 2 ? "bg-primary text-primary-foreground animate-pulse" : companyDetailsStep.step > 2 ? "bg-black dark:bg-white text-white dark:text-black" : "bg-muted text-muted-foreground"}`}>
                                                        2
                                                      </div>
                                                      <span className="text-muted-foreground">Parse</span>
                                                    </div>
                                                    <div className="w-3 h-px bg-border" />
                                                    <div className="flex items-center gap-1 text-xs">
                                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${companyDetailsStep.step === 3 ? "bg-primary text-primary-foreground animate-pulse" : companyDetailsStep.step > 3 ? "bg-black dark:bg-white text-white dark:text-black" : "bg-muted text-muted-foreground"}`}>
                                                        3
                                                      </div>
                                                      <span className="text-muted-foreground">AI</span>
                                                    </div>
                                                  </> : lead.enrichment_source === "apollo_api" ?
                                      // Single step for direct Apollo
                                      <div className="flex items-center gap-2 text-xs">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${companyDetailsStep.step === 1 ? "bg-primary text-primary-foreground animate-pulse" : "bg-black dark:bg-white text-white dark:text-black"}`}>
                                                      1
                                                    </div>
                                                    <span className="text-muted-foreground">Direct retrieval</span>
                                                  </div> :
                                      // Two steps for non-Apollo sources (may fallback to scraper)
                                      <>
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${companyDetailsStep.step === 1 ? "bg-primary text-primary-foreground animate-pulse" : "bg-black dark:bg-white text-white dark:text-black"}`}>
                                                        1
                                                      </div>
                                                      <span className="text-muted-foreground">Search Apollo</span>
                                                    </div>
                                                    <div className="w-4 h-px bg-border" />
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${companyDetailsStep.step === 2 ? "bg-primary text-primary-foreground animate-pulse" : companyDetailsStep.step > 2 ? "bg-black dark:bg-white text-white dark:text-black" : "bg-muted text-muted-foreground"}`}>
                                                        2
                                                      </div>
                                                      <span className="text-muted-foreground">Get details</span>
                                                    </div>
                                                  </>}
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {companyDetailsStep.message}
                                              </p>
                                            </div>}

                                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <span>• Company Size</span>
                                            <span>• Annual Revenue</span>
                                            <span>• Industry</span>
                                            <span>• Description</span>
                                            <span>• Tech Stack</span>
                                            <span>• LinkedIn URL</span>
                                          </div>

                                          {/* Scraped Data Log Section */}
                                          {lead.scraped_data_log && <Accordion type="single" collapsible className="mt-4">
                                              <AccordionItem value="scraped-data" className="border rounded-lg bg-muted/30">
                                                <AccordionTrigger className="text-xs hover:no-underline px-3 py-2">
                                                  <div className="flex items-center gap-2">
                                                    {(lead.scraped_data_log.primary_source === "apollo" || lead.scraped_data_log.source?.startsWith("apollo")) ? <>
                                                        <span>📋 Enrichment Log</span>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                                          {lead.scraped_data_log.apollo_data?.fields_populated?.length || lead.scraped_data_log.fields_populated?.length || 0} fields
                                                        </Badge>
                                                      </> : <>
                                                        <span>📄 View Scraped Data</span>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                          {lead.scraped_data_log.services?.length || 0} services found
                                                        </Badge>
                                                      </>}
                                                  </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-3 pb-3">
                                                  <div className="space-y-2 text-xs">
                                                    {/* Apollo Data Display */}
                                                    {(lead.scraped_data_log.primary_source === "apollo" || lead.scraped_data_log.source?.startsWith("apollo")) && lead.scraped_data_log.apollo_data && <div className="grid gap-1.5">
                                                          <span className="text-muted-foreground font-medium block mb-2">
                                                            🚀 Apollo Enrichment Log
                                                          </span>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Organization:</span>
                                                            <span className="font-medium">
                                                              {lead.scraped_data_log.apollo_data?.organization_name || lead.scraped_data_log.organization_name}
                                                            </span>
                                                          </div>
                                                          {lead.scraped_data_log.apollo_data.industry && <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Industry:</span>
                                                              <span>{lead.scraped_data_log.apollo_data.industry}</span>
                                                            </div>}
                                                          {lead.scraped_data_log.apollo_data.estimated_employees && <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Employees:</span>
                                                              <span>
                                                                {lead.scraped_data_log.apollo_data.estimated_employees.toLocaleString()}
                                                              </span>
                                                            </div>}
                                                          {lead.scraped_data_log.apollo_data.revenue && <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Revenue:</span>
                                                              <span>{lead.scraped_data_log.apollo_data.revenue}</span>
                                                            </div>}
                                                          {lead.scraped_data_log.apollo_data.founded_year && <div className="flex justify-between">
                                                              <span className="text-muted-foreground">Founded:</span>
                                                              <span>
                                                                {lead.scraped_data_log.apollo_data.founded_year}
                                                              </span>
                                                            </div>}
                                                          {lead.scraped_data_log.apollo_data.city && <div className="flex justify-between">
                                                              <span className="text-muted-foreground">
                                                                HQ Location:
                                                              </span>
                                                              <span>
                                                                {[lead.scraped_data_log.apollo_data.city, lead.scraped_data_log.apollo_data.state, lead.scraped_data_log.apollo_data.country].filter(Boolean).join(", ")}
                                                              </span>
                                                            </div>}
                                                          {lead.scraped_data_log.apollo_data.keywords && lead.scraped_data_log.apollo_data.keywords.length > 0 && <div>
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Keywords:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {lead.scraped_data_log.apollo_data.keywords.map((kw, idx) => <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                                                        {kw}
                                                                      </span>)}
                                                                </div>
                                                              </div>}
                                                          {(lead.scraped_data_log.apollo_data?.fields_populated || lead.scraped_data_log.fields_populated) && (lead.scraped_data_log.apollo_data?.fields_populated || lead.scraped_data_log.fields_populated)!.length > 0 && <div className="mt-2 pt-2 border-t border-dashed">
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Fields Populated:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {(lead.scraped_data_log.apollo_data?.fields_populated || lead.scraped_data_log.fields_populated)!.map((field, idx) => <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                                        {field}
                                                                      </Badge>)}
                                                                </div>
                                                              </div>}
                                                          {/* Logs Section - Collapsible */}
                                                          {lead.scraped_data_log.enrichment_steps && lead.scraped_data_log.enrichment_steps.length > 0 && <div className="mt-3 pt-3 border-t border-dashed">
                                                                <Collapsible>
                                                                  <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full justify-start">
                                                                    <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                                                                    <span>📋 Logs</span>
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                      {lead.scraped_data_log.enrichment_steps.length} steps
                                                                    </Badge>
                                                                  </CollapsibleTrigger>
                                                                  <CollapsibleContent className="mt-2">
                                                                    <div className="space-y-2 text-xs bg-muted/30 rounded-lg p-3">
                                                                      {lead.scraped_data_log.enrichment_steps.map((step, idx) => <div key={idx} className="flex items-start gap-2 text-[11px]">
                                                                            <Badge variant={step.status === "success" ? "default" : step.status === "failed" ? "destructive" : "secondary"} className="text-[9px] px-1 py-0 mt-0.5 flex-shrink-0">
                                                                              Step {step.step}
                                                                            </Badge>
                                                                            <div className="flex-1">
                                                                              <span className="text-muted-foreground">
                                                                                {step.action.replace(/_/g, " ")}
                                                                              </span>
                                                                              <span className={`ml-2 ${step.status === "success" ? "text-black dark:text-white" : step.status === "failed" ? "text-black dark:text-white" : "text-muted-foreground"}`}>
                                                                                {step.status === "success" ? "✓" : step.status === "failed" ? "✗" : "..."}
                                                                              </span>
                                                                              {step.details && (
                                                                                <p className="text-[10px] text-muted-foreground/70 mt-0.5 break-words">
                                                                                  {typeof step.details === 'string' ? step.details : JSON.stringify(step.details)}
                                                                                </p>
                                                                              )}
                                                                            </div>
                                                                          </div>)}
                                                                    </div>
                                                                  </CollapsibleContent>
                                                                </Collapsible>
                                                              </div>}
                                                        </div>}

                                                    {/* Supplemental Scraped Data for Apollo sources */}
                                                    {(lead.scraped_data_log.primary_source === "apollo" || lead.scraped_data_log.source?.startsWith("apollo")) && lead.scraped_data_log.supplemental_scrape?.scraped_data && <div className="mt-3 pt-3 border-t border-dashed">
                                                        <span className="text-muted-foreground font-medium block mb-2">
                                                          📄 View Scraped Data
                                                        </span>
                                                        <div className="grid gap-1.5">
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Title:</span>
                                                            <span className="text-right max-w-[200px] truncate" title={lead.scraped_data_log.supplemental_scrape.scraped_data.title || ""}>
                                                              {lead.scraped_data_log.supplemental_scrape.scraped_data.title || <span className="text-muted-foreground/50 italic">Not found</span>}
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">H1:</span>
                                                            <span className="text-right max-w-[200px] truncate" title={lead.scraped_data_log.supplemental_scrape.scraped_data.h1 || ""}>
                                                              {lead.scraped_data_log.supplemental_scrape.scraped_data.h1 || <span className="text-muted-foreground/50 italic">Not found</span>}
                                                            </span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Meta Description:</span>
                                                            <span className="text-right max-w-[200px] truncate" title={lead.scraped_data_log.supplemental_scrape.scraped_data.meta_description || ""}>
                                                              {lead.scraped_data_log.supplemental_scrape.scraped_data.meta_description || <span className="text-muted-foreground/50 italic">Not found</span>}
                                                            </span>
                                                          </div>
                                                          {lead.scraped_data_log.supplemental_scrape.scraped_data.meta_keywords && <div>
                                                              <span className="text-muted-foreground block mb-1">Meta Keywords:</span>
                                                              <span className="text-[10px] block bg-muted/50 p-1.5 rounded break-words">
                                                                {lead.scraped_data_log.supplemental_scrape.scraped_data.meta_keywords}
                                                              </span>
                                                            </div>}
                                                          {lead.scraped_data_log.supplemental_scrape.scraped_data.services && lead.scraped_data_log.supplemental_scrape.scraped_data.services.length > 0 && <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                Services Found ({lead.scraped_data_log.supplemental_scrape.scraped_data.services.length}):
                                                              </span>
                                                              <div className="text-[10px] bg-muted/50 p-1.5 rounded max-h-24 overflow-y-auto">
                                                                {lead.scraped_data_log.supplemental_scrape.scraped_data.services.join(" • ")}
                                                              </div>
                                                            </div>}
                                                          {lead.scraped_data_log.supplemental_scrape.scraped_data.about_pages && lead.scraped_data_log.supplemental_scrape.scraped_data.about_pages.length > 0 && <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                About Pages ({lead.scraped_data_log.supplemental_scrape.scraped_data.about_pages.length}):
                                                              </span>
                                                              <div className="text-[10px] space-y-0.5">
                                                                {lead.scraped_data_log.supplemental_scrape.scraped_data.about_pages.slice(0, 5).map((page, idx) => <a key={idx} href={page.startsWith("http") ? page : `https://${lead.domain}${page}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                                                                    {page}
                                                                  </a>)}
                                                              </div>
                                                            </div>}
                                                          {lead.scraped_data_log.supplemental_scrape.scraped_data.nav_links && lead.scraped_data_log.supplemental_scrape.scraped_data.nav_links.length > 0 && <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                Nav Links ({lead.scraped_data_log.supplemental_scrape.scraped_data.nav_links.length}):
                                                              </span>
                                                              <div className="flex flex-wrap gap-1">
                                                                {lead.scraped_data_log.supplemental_scrape.scraped_data.nav_links.slice(0, 15).map((link, idx) => <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                                                    {link}
                                                                  </span>)}
                                                              </div>
                                                            </div>}
                                                        </div>

                                                        {/* Deep Scrape Results for supplemental */}
                                                        {lead.scraped_data_log.supplemental_scrape.deep_scrape && <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground font-medium block mb-2">
                                                              🔍 Deep Scrape Results
                                                            </span>
                                                            {lead.scraped_data_log.supplemental_scrape.deep_scrape.pages_scraped?.length > 0 ? <div className="mb-2">
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Pages Scraped ({lead.scraped_data_log.supplemental_scrape.deep_scrape.pages_scraped.length}):
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {lead.scraped_data_log.supplemental_scrape.deep_scrape.pages_scraped.map((url, idx) => <a key={idx} href={url.startsWith("http") ? url : `https://${lead.domain}${url.startsWith("/") ? "" : "/"}${url}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20">
                                                                      {url.split("/").pop() || url}
                                                                    </a>)}
                                                                </div>
                                                              </div> : <div className="mb-2 text-muted-foreground/50 italic text-[10px]">
                                                                No high-value pages found to scrape
                                                              </div>}
                                                            <div className="grid gap-1.5 text-[11px]">
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">Founded Year:</span>
                                                                {lead.scraped_data_log.supplemental_scrape.deep_scrape.founded_year ? <span className="flex items-center gap-1">
                                                                    {lead.scraped_data_log.supplemental_scrape.deep_scrape.founded_year}
                                                                    {lead.scraped_data_log.supplemental_scrape.deep_scrape.sources?.founded_year_source && <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                                        from {lead.scraped_data_log.supplemental_scrape.deep_scrape.sources.founded_year_source}
                                                                      </Badge>}
                                                                  </span> : <span className="text-muted-foreground/50 italic">Not found</span>}
                                                              </div>
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">Employee Count:</span>
                                                                {lead.scraped_data_log.supplemental_scrape.deep_scrape.employee_count ? <span className="flex items-center gap-1">
                                                                    {lead.scraped_data_log.supplemental_scrape.deep_scrape.employee_count}
                                                                    {lead.scraped_data_log.supplemental_scrape.deep_scrape.sources?.employee_count_source && <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                                        from {lead.scraped_data_log.supplemental_scrape.deep_scrape.sources.employee_count_source}
                                                                      </Badge>}
                                                                  </span> : <span className="text-muted-foreground/50 italic">Not found</span>}
                                                              </div>
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">Contact Email:</span>
                                                                {lead.scraped_data_log.supplemental_scrape.deep_scrape.contact_email ? <span className="flex items-center gap-1">
                                                                    <a href={`mailto:${lead.scraped_data_log.supplemental_scrape.deep_scrape.contact_email}`} className="text-primary hover:underline">
                                                                      {lead.scraped_data_log.supplemental_scrape.deep_scrape.contact_email}
                                                                    </a>
                                                                    {lead.scraped_data_log.supplemental_scrape.deep_scrape.contact_email_personal && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">
                                                                        Personal
                                                                      </Badge>}
                                                                  </span> : <span className="text-muted-foreground/50 italic">Not found</span>}
                                                              </div>
                                                            </div>
                                                          </div>}
                                                      </div>}

                                                    {/* Scraper Data Display (existing) */}
                                                    {lead.scraped_data_log.source !== "apollo" && <div className="grid gap-1.5">
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">Title:</span>
                                                          <span className="text-right max-w-[200px] truncate" title={lead.scraped_data_log.title || ""}>
                                                            {lead.scraped_data_log.title || <span className="text-muted-foreground/50 italic">
                                                                Not found
                                                              </span>}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">H1:</span>
                                                          <span className="text-right max-w-[200px] truncate" title={lead.scraped_data_log.h1 || ""}>
                                                            {lead.scraped_data_log.h1 || <span className="text-muted-foreground/50 italic">
                                                                Not found
                                                              </span>}
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                          <span className="text-muted-foreground">
                                                            Meta Description:
                                                          </span>
                                                          <span className="text-right max-w-[200px] truncate" title={lead.scraped_data_log.meta_description || ""}>
                                                            {lead.scraped_data_log.meta_description || <span className="text-muted-foreground/50 italic">
                                                                Not found
                                                              </span>}
                                                          </span>
                                                        </div>
                                                        {lead.scraped_data_log.meta_keywords && <div>
                                                            <span className="text-muted-foreground block mb-1">
                                                              Meta Keywords:
                                                            </span>
                                                            <span className="text-[10px] block bg-muted/50 p-1.5 rounded break-words">
                                                              {lead.scraped_data_log.meta_keywords}
                                                            </span>
                                                          </div>}
                                                        {lead.scraped_data_log.logo_url && <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">Logo URL:</span>
                                                            <a href={lead.scraped_data_log.logo_url.startsWith("http") ? lead.scraped_data_log.logo_url : `https://${lead.domain}${lead.scraped_data_log.logo_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                              View <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                          </div>}
                                                        {lead.scraped_data_log.linkedin && <div className="flex justify-between items-center">
                                                            <span className="text-[#0F0F4B]">LinkedIn:</span>
                                                            <a href={lead.scraped_data_log.linkedin.startsWith("http") ? lead.scraped_data_log.linkedin : `https://${lead.scraped_data_log.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                              View <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                          </div>}
                                                        {lead.scraped_data_log.facebook && <div className="flex justify-between items-center">
                                                            <span className="text-[#0F0F4B]">Facebook:</span>
                                                            <a href={lead.scraped_data_log.facebook.startsWith("http") ? lead.scraped_data_log.facebook : `https://${lead.scraped_data_log.facebook}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                              View <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                          </div>}
                                                        {lead.scraped_data_log.about_pages && lead.scraped_data_log.about_pages.length > 0 && <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                About Pages ({lead.scraped_data_log.about_pages.length}
                                                                ):
                                                              </span>
                                                              <div className="text-[10px] space-y-0.5">
                                                                {lead.scraped_data_log.about_pages.slice(0, 5).map((page, idx) => <a key={idx} href={page.startsWith("http") ? page : `https://${lead.domain}${page}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                                                                      {page}
                                                                    </a>)}
                                                              </div>
                                                            </div>}
                                                        {lead.scraped_data_log.nav_links && lead.scraped_data_log.nav_links.length > 0 && <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                Nav Links ({lead.scraped_data_log.nav_links.length}):
                                                              </span>
                                                              <div className="flex flex-wrap gap-1">
                                                                {lead.scraped_data_log.nav_links.slice(0, 15).map((link, idx) => <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                                                      {link}
                                                                    </span>)}
                                                              </div>
                                                            </div>}
                                                        {lead.scraped_data_log.services && lead.scraped_data_log.services.length > 0 && <div>
                                                              <span className="text-muted-foreground block mb-1">
                                                                Services Found ({lead.scraped_data_log.services.length}
                                                                ):
                                                              </span>
                                                              <div className="text-[10px] bg-muted/50 p-1.5 rounded max-h-24 overflow-y-auto">
                                                                {lead.scraped_data_log.services.join(" • ")}
                                                              </div>
                                                            </div>}

                                                        {/* Deep Scrape Results Section */}
                                                        {lead.scraped_data_log.deep_scrape && <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground font-medium block mb-2">
                                                              🔍 Deep Scrape Results
                                                            </span>

                                                            {/* Pages Scraped */}
                                                            {lead.scraped_data_log.deep_scrape.pages_scraped?.length > 0 ? <div className="mb-2">
                                                                <span className="text-muted-foreground block mb-1">
                                                                  Pages Scraped (
                                                                  {lead.scraped_data_log.deep_scrape.pages_scraped.length}
                                                                  ):
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                  {lead.scraped_data_log.deep_scrape.pages_scraped.map((url, idx) => <a key={idx} href={url.startsWith("http") ? url : `https://${lead.domain}${url.startsWith("/") ? "" : "/"}${url}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20">
                                                                        {url.split("/").pop() || url}
                                                                      </a>)}
                                                                </div>
                                                              </div> : <div className="mb-2 text-muted-foreground/50 italic text-[10px]">
                                                                No high-value pages found to scrape
                                                              </div>}

                                                            {/* Found Data Grid */}
                                                            <div className="grid gap-1.5 text-[11px]">
                                                              {/* Founded Year */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Founded Year:
                                                                </span>
                                                                {lead.scraped_data_log.deep_scrape.founded_year ? <span className="flex items-center gap-1">
                                                                    {lead.scraped_data_log.deep_scrape.founded_year}
                                                                    {lead.scraped_data_log.deep_scrape.sources?.founded_year_source && <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                                        from{" "}
                                                                        {lead.scraped_data_log.deep_scrape.sources.founded_year_source}
                                                                      </Badge>}
                                                                  </span> : <span className="text-muted-foreground/50 italic">
                                                                    Not found
                                                                  </span>}
                                                              </div>

                                                              {/* Employee Count */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Employee Count:
                                                                </span>
                                                                {lead.scraped_data_log.deep_scrape.employee_count ? <span className="flex items-center gap-1">
                                                                    {lead.scraped_data_log.deep_scrape.employee_count}
                                                                    {lead.scraped_data_log.deep_scrape.sources?.employee_count_source && <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                                        from{" "}
                                                                        {lead.scraped_data_log.deep_scrape.sources.employee_count_source}
                                                                      </Badge>}
                                                                  </span> : <span className="text-muted-foreground/50 italic">
                                                                    Not found
                                                                  </span>}
                                                              </div>

                                                              {/* Contact Email */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Contact Email:
                                                                </span>
                                                                {lead.scraped_data_log.deep_scrape.contact_email ? <span className="flex items-center gap-1">
                                                                    <a href={`mailto:${lead.scraped_data_log.deep_scrape.contact_email}`} className="text-primary hover:underline">
                                                                      {lead.scraped_data_log.deep_scrape.contact_email}
                                                                    </a>
                                                                    {lead.scraped_data_log.deep_scrape.contact_email_personal && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">
                                                                        Personal
                                                                      </Badge>}
                                                                    {lead.scraped_data_log.deep_scrape.sources?.contact_email_source && <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                                        from{" "}
                                                                        {lead.scraped_data_log.deep_scrape.sources.contact_email_source}
                                                                      </Badge>}
                                                                  </span> : <span className="text-muted-foreground/50 italic">
                                                                    Not found
                                                                  </span>}
                                                              </div>

                                                              {/* Email Validation Status */}
                                                              <div className="flex justify-between items-center">
                                                                <span className="text-muted-foreground">
                                                                  Email Validation:
                                                                </span>
                                                                {lead.email_domain_validated ? <span className="flex items-center gap-1 text-black dark:text-white">
                                                                    <span className="text-[10px]">
                                                                      ✓ Matches lead email
                                                                    </span>
                                                                    <Badge className="text-[9px] px-1 py-0 bg-white dark:bg-black text-black dark:text-white border-gray-300 dark:border-gray-700">
                                                                      100% Valid
                                                                    </Badge>
                                                                  </span> : lead.scraped_data_log?.deep_scrape?.contact_email && lead.email ? <span className="text-amber-600 text-[10px]">
                                                                    Different from lead
                                                                  </span> : <span className="text-muted-foreground/50 italic text-[10px]">
                                                                    —
                                                                  </span>}
                                                              </div>
                                                            </div>
                                                          </div>}

                                                        {/* Company Contacts Found */}
                                                        {lead.company_contacts && lead.company_contacts.length > 0 && <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground font-medium block mb-2">
                                                              📧 Additional Contacts ({lead.company_contacts.length})
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                              {lead.company_contacts.map((contact, idx) => <a key={idx} href={`mailto:${contact.email}`} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-100">
                                                                  {contact.email}
                                                                  {contact.is_personal && <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700">
                                                                      Personal
                                                                    </Badge>}
                                                                </a>)}
                                                            </div>
                                                          </div>}

                                                        {/* Show message if no deep scrape was performed */}
                                                        {!lead.scraped_data_log.deep_scrape && <div className="mt-3 pt-3 border-t border-dashed">
                                                            <span className="text-muted-foreground/50 italic text-[10px]">
                                                              🔍 Deep Scrape: Not performed
                                                            </span>
                                                          </div>}

                                                        {/* Logs Section - Collapsible (for non-Apollo sources) */}
                                                        {lead.scraped_data_log.enrichment_steps && lead.scraped_data_log.enrichment_steps.length > 0 && <div className="mt-3 pt-3 border-t border-dashed">
                                                            <Collapsible>
                                                              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full justify-start">
                                                                <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                                                                <span>📋 Logs</span>
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                  {lead.scraped_data_log.enrichment_steps.length} steps
                                                                </Badge>
                                                              </CollapsibleTrigger>
                                                              <CollapsibleContent className="mt-2">
                                                                <div className="space-y-2 text-xs bg-muted/30 rounded-lg p-3">
                                                                  {lead.scraped_data_log.enrichment_steps.map((step, idx) => <div key={idx} className="flex items-start gap-2 text-[11px]">
                                                                        <Badge variant={step.status === "success" ? "default" : step.status === "failed" ? "destructive" : "secondary"} className="text-[9px] px-1 py-0 mt-0.5 flex-shrink-0">
                                                                          Step {step.step}
                                                                        </Badge>
                                                                        <div className="flex-1">
                                                                          <span className="text-muted-foreground">
                                                                            {step.action.replace(/_/g, " ")}
                                                                          </span>
                                                                          <span className={`ml-2 ${step.status === "success" ? "text-black dark:text-white" : step.status === "failed" ? "text-black dark:text-white" : "text-muted-foreground"}`}>
                                                                            {step.status === "success" ? "✓" : step.status === "failed" ? "✗" : "..."}
                                                                          </span>
                                                                          {step.details && (
                                                                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 break-words">
                                                                              {typeof step.details === 'string' ? step.details : JSON.stringify(step.details)}
                                                                            </p>
                                                                          )}
                                                                        </div>
                                                                      </div>)}
                                                                </div>
                                                              </CollapsibleContent>
                                                            </Collapsible>
                                                          </div>}
                                                      </div>}
                                                  </div>
                                                </AccordionContent>
                                              </AccordionItem>
                                            </Accordion>}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>}

                                  {/* Find Contacts Accordion - Always visible when Apollo enriched */}
                                  <AccordionItem value="find-contacts" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <span>Find Contacts</span>
                                        {/* Only show tick if search was actually run (lead has domain, score >= 50, AND company_contacts is an array) */}
                                        {lead.domain && (lead.match_score ?? 0) >= 50 && lead.company_contacts && Array.isArray(lead.company_contacts) && (
                                          <>
                                            <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                                            {lead.company_contacts.filter(c => c.name).length > 0 ? (
                                              <Badge variant="secondary" className="ml-1">
                                                {lead.company_contacts.filter(c => c.name).length} found
                                              </Badge>
                                            ) : (
                                              <span className="text-xs text-muted-foreground ml-1">No contacts found</span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Find Contacts Button */}
                                        <div className="space-y-2">
                                          <Button size="sm" variant="outline" className="w-full" disabled={findingContacts === lead.id || !lead.domain || lead.match_score === null || (lead.match_score ?? 0) < 50} onClick={() => handleFindContacts(lead)}>
                                            {findingContacts === lead.id ? <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching Contacts...
                                              </> : <>
                                                <Users className="mr-2 h-4 w-4" />
                                                Find Company Contacts
                                              </>}
                                          </Button>

                                          {/* Show disabled state reason */}
                                          {!lead.domain ? <p className="text-xs text-muted-foreground text-center">
                                              ⚠️ Domain required. Run enrichment first.
                                            </p> : (lead.match_score === null || (lead.match_score ?? 0) < 50) && <p className="text-xs text-destructive/70 text-center">
                                                {lead.match_score === null ? "Blocked: Match Score not calculated" : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                              </p>}
                                        </div>

                                        {/* Display Found Contacts */}
                                        {lead.company_contacts && lead.company_contacts.filter(c => c.name).length > 0 && <div className="space-y-3 pt-2 border-t">
                                              <p className="text-xs text-muted-foreground">Discovered Contacts:</p>
                                              <div className="space-y-2">
                                                {lead.company_contacts.filter(contact => contact.name).map((contact, idx) => <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                                                      <div className="flex items-start justify-between">
                                                        <div>
                                                          <p className="font-medium text-sm">{contact.name}</p>
                                                          {contact.title && <p className="text-xs text-muted-foreground">
                                                              {contact.title}
                                                            </p>}
                                                        </div>
                                                        {contact.email_status === "verified" && <Badge className="bg-white dark:bg-black text-black dark:text-white border-gray-300 dark:border-gray-700 text-[10px]">
                                                            Verified
                                                          </Badge>}
                                                      </div>
                                                      <div className="mt-2 space-y-1">
                                                        {contact.email && <div className="flex items-center gap-2 text-xs">
                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                                              {contact.email}
                                                            </a>
                                                          </div>}
                                                        {contact.linkedin_url && <div className="flex items-center gap-2 text-xs">
                                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                              LinkedIn Profile
                                                            </a>
                                                          </div>}
                                                      </div>
                                                    </div>)}
                                              </div>
                                            </div>}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Enrich Contact Accordion - Check if lead exists in company contacts */}
                                  <AccordionItem value="enrich-contact" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <span>Enrich Contact</span>
                                        {(() => {
                                    // Check if lead exists in company_contacts by email or name
                                    const matchedContact = lead.company_contacts?.find(c => lead.email && c.email && c.email.toLowerCase() === lead.email.toLowerCase() || lead.full_name && c.name && c.name.toLowerCase() === lead.full_name.toLowerCase());
                                    return matchedContact ? <Badge className="ml-2 bg-white dark:bg-black text-black dark:text-white border-gray-300 dark:border-gray-700">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Found
                                            </Badge> : null;
                                  })()}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Check if lead contact exists in company_contacts */}
                                        {(() => {
                                    const matchedContact = lead.company_contacts?.find(c => lead.email && c.email && c.email.toLowerCase() === lead.email.toLowerCase() || lead.full_name && c.name && c.name.toLowerCase() === lead.full_name.toLowerCase());
                                    if (matchedContact) {
                                      const contactName = matchedContact.name || `${matchedContact.first_name || ""} ${matchedContact.last_name || ""}`.trim();

                                      // Collect found social profiles
                                      const foundSocials: Array<{
                                        platform: string;
                                        url: string;
                                        icon: React.ReactNode;
                                      }> = [];
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
                                          icon: <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
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
                                      return <div className="space-y-3">
                                                {/* Compact display: Name + Social profiles only */}
                                                <div className="space-y-2">
                                                  {/* Contact name */}
                                                  {contactName && <p className="text-sm font-medium">{contactName}</p>}
                                                  
                                                  {/* Social profiles only */}
                                                  <div className="space-y-1">
                                                    {foundSocials.length > 0 ? foundSocials.map(({
                                              platform,
                                              url,
                                              icon
                                            }) => <div key={platform} className="flex items-center gap-2 text-xs">
                                                          {icon}
                                                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                                            {url.replace("https://", "").replace("www.", "").replace("linkedin.com/", "").replace("facebook.com/", "").replace("youtube.com/", "").replace("twitter.com/", "").replace("github.com/", "")}
                                                          </a>
                                                        </div>) : <span className="text-xs text-muted-foreground">No socials found</span>}
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
                                                      {matchedContact.title && <div className="flex justify-between">
                                                          <span className="text-muted-foreground">Title</span>
                                                          <span>{matchedContact.title}</span>
                                                        </div>}
                                                      {matchedContact.email && <div className="flex justify-between">
                                                          <span className="text-muted-foreground">Email</span>
                                                          <a href={`mailto:${matchedContact.email}`} className="text-primary hover:underline">
                                                            {matchedContact.email}
                                                          </a>
                                                        </div>}
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Source</span>
                                                        <span>{matchedContact.source === "apollo_people_search" ? "Apollo" : "Scraped"}</span>
                                                      </div>
                                                    </div>

                                                    {/* Enrichment logs */}
                                                    {matchedContact.social_search_logs && matchedContact.social_search_logs.length > 0 && <div className="border-t border-border pt-3 space-y-2">
                                                        <p className="text-xs text-muted-foreground font-medium">Enrichment Logs</p>
                                                        {matchedContact.social_search_logs.map((log: any, idx: number) => <div key={idx} className="bg-muted/50 rounded p-2 text-xs space-y-1">
                                                            <div className="flex items-center gap-2">
                                                              <span className="font-medium capitalize">{log.platform}</span>
                                                              {log.found ? <CheckCircle className="h-3 w-3 text-black dark:text-white" /> : <XCircle className="h-3 w-3 text-black dark:text-white" />}
                                                              <span className="text-muted-foreground">
                                                                via {log.source === "apollo" ? "Apollo" : "Google"}
                                                              </span>
                                                            </div>
                                                            {log.query && <p className="text-muted-foreground font-mono text-[10px] break-all">
                                                                Query: {log.query}
                                                              </p>}
                                                          </div>)}
                                                      </div>}

                                                    {/* Re-search button - Hide for client role */}
                                                    {!isClientRole && (
                                                    <div className="pt-2 space-y-2">
                                                      <Button size="sm" variant="outline" className="w-full" disabled={enrichingContact === lead.id || !lead.email || !lead.full_name} onClick={() => handleEnrichContact(lead)}>
                                                        {enrichingContact === lead.id ? <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Searching...
                                                          </> : <>
                                                            <Search className="mr-2 h-4 w-4" />
                                                            Re-search in Apollo
                                                          </>}
                                                      </Button>
                                                      
                                                      {/* Get contact details with Clay - enabled when LinkedIn URL exists */}
                                                      {(() => {
                                                const linkedinUrl = selectedLead?.contact_linkedin || matchedContact.linkedin_url;
                                                return <Button size="sm" variant="outline" className="w-full" disabled={!linkedinUrl || enrichingWithClay === lead.id} onClick={() => linkedinUrl && handleEnrichWithClay(lead, linkedinUrl)}>
                                                            {enrichingWithClay === lead.id ? <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Enriching...
                                                              </> : <>
                                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                                Get contact details with Clay
                                                              </>}
                                                          </Button>;
                                              })()}
                                                    </div>
                                                    )}
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              </div>;
                                    }

                                    // Contact not found in company_contacts
                                    return <div className="space-y-3">
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

                                              {/* Search Button - Hide for client role */}
                                              {!isClientRole && (
                                              <>
                                              <Button size="sm" variant="outline" className="w-full" disabled={enrichingContact === lead.id || !lead.email || !lead.full_name} onClick={() => handleEnrichContact(lead)}>
                                                {enrichingContact === lead.id ? <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Searching...
                                                  </> : <>
                                                    <Search className="mr-2 h-4 w-4" />
                                                    Enrich Contact
                                                  </>}
                                              </Button>
                                              {(!lead.email || !lead.full_name) && <p className="text-xs text-muted-foreground">
                                                  Name and email required to search Apollo.
                                                </p>}
                                              </>
                                              )}

                                              {/* Visual Stepper - Show when enriching or when we have steps */}
                                              {(enrichingContact === lead.id || enrichContactSteps) && <EnrichContactStepper steps={enrichContactSteps} isLoading={enrichingContact === lead.id} enrichedContact={enrichedContactResult} />}
                                            </div>;
                                  })()}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Company News Accordion - After Find Contacts */}
                                  <AccordionItem value="company-news" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <span>Company News</span>
                                        {lead.news && (() => {
                                    try {
                                      const newsData = JSON.parse(lead.news);
                                      return <>
                                        <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                                        {newsData.news_count > 0 && (
                                          <Badge variant="secondary" className="ml-1">
                                            {newsData.news_count} articles
                                          </Badge>
                                        )}
                                      </>;
                                    } catch { }
                                    return null;
                                  })()}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Get Company News Button */}
                                        <Button size="sm" variant="outline" className="w-full" disabled={fetchingNews === lead.id || !lead.domain || lead.match_score === null || (lead.match_score ?? 0) < 50} onClick={() => handleGetCompanyNews(lead)}>
                                          {fetchingNews === lead.id ? <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Fetching News...
                                            </> : <>
                                              <Newspaper className="mr-2 h-4 w-4" />
                                              Get Company News
                                            </>}
                                        </Button>
                                        {!lead.domain ? <p className="text-xs text-muted-foreground">
                                            Domain required. Run enrichment first.
                                          </p> : (lead.match_score === null || (lead.match_score ?? 0) < 50) && <p className="text-xs text-destructive/70">
                                              {lead.match_score === null ? "Blocked: Match Score not calculated" : `Blocked: Match Score is ${lead.match_score}% (requires ≥50%)`}
                                            </p>}

                                        {/* Display News Results with Logs */}
                                        {lead.news && (() => {
                                    try {
                                      const newsData = JSON.parse(lead.news);
                                      return <div className="space-y-3 pt-2 border-t">
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
                                                  {newsData.items?.length > 0 ? <div className="space-y-2">
                                                      <p className="text-xs text-muted-foreground">Latest News:</p>
                                                      {newsData.items.map((item: any, idx: number) => <div key={idx} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                                                          {/* Title with link */}
                                                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline block">
                                                            {item.title}
                                                          </a>

                                                          {/* Source and date */}
                                                          <p className="text-xs text-muted-foreground">
                                                            {item.source} • {item.date}
                                                          </p>

                                                          {/* Snippet as description */}
                                                          {item.snippet && <p className="text-xs text-foreground/80 leading-relaxed">
                                                              {item.snippet}
                                                            </p>}

                                                          {/* Explicit link to article */}
                                                          {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                                              <ExternalLink className="h-3 w-3" />
                                                              Read full article
                                                            </a>}
                                                        </div>)}
                                                    </div> : <p className="text-sm text-muted-foreground">
                                                      No news articles found.
                                                    </p>}
                                                </div>;
                                    } catch {
                                      // Fallback for old text format
                                      return <div className="space-y-2 pt-2 border-t">
                                                  <pre className="text-xs whitespace-pre-wrap">{lead.news}</pre>
                                                </div>;
                                    }
                                  })()}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>

                                  {/* Enrichment Logs from Clay - Hide for client role */}
                                  {!isClientRole && (
                                  <AccordionItem value="clay-enrichments" className="border-border">
                                    <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <span>Enrichment Logs from Clay</span>
                                        {(clayEnrichments.length > 0 || clayCompanyEnrichments.length > 0) && <Badge variant="secondary" className="ml-2">
                                            {clayEnrichments.length + clayCompanyEnrichments.length} {(clayEnrichments.length + clayCompanyEnrichments.length) === 1 ? 'log' : 'logs'}
                                          </Badge>}
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-4">
                                        {/* Company Enrichments Section */}
                                        {clayCompanyEnrichments.length > 0 && (
                                          <div className="space-y-3">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Enrichment</p>
                                            {clayCompanyEnrichments.map(companyEnrichment => (
                                              <div key={companyEnrichment.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                                                {/* Header with timestamp */}
                                                <div className="flex items-center justify-between">
                                                  <p className="text-xs text-muted-foreground">
                                                    {companyEnrichment.created_at ? new Date(companyEnrichment.created_at).toLocaleString() : 'N/A'}
                                                  </p>
                                                  <Badge variant="outline" className="text-[10px]">Company Data</Badge>
                                                </div>

                                                {/* Company Logo */}
                                                {companyEnrichment.logo_clay && (
                                                  <div className="flex justify-center">
                                                    <img 
                                                      src={companyEnrichment.logo_clay} 
                                                      alt="Company logo" 
                                                      className="h-12 w-auto object-contain rounded"
                                                      onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                  </div>
                                                )}

                                                {/* Company Info */}
                                                <div className="grid gap-2 text-sm">
                                                  {companyEnrichment.domain && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Domain:</span>
                                                      <a href={`https://${companyEnrichment.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                        {companyEnrichment.domain}
                                                      </a>
                                                    </div>
                                                  )}
                                                  {companyEnrichment.industry_clay && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Industry:</span>
                                                      <span>{companyEnrichment.industry_clay}</span>
                                                    </div>
                                                  )}
                                                  {companyEnrichment.size_clay && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Company Size:</span>
                                                      <span>{companyEnrichment.size_clay}</span>
                                                    </div>
                                                  )}
                                                  {companyEnrichment.annual_revenue_clay && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Annual Revenue:</span>
                                                      <span>{companyEnrichment.annual_revenue_clay}</span>
                                                    </div>
                                                  )}
                                                  {companyEnrichment.founded_clay && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Founded:</span>
                                                      <span>{companyEnrichment.founded_clay}</span>
                                                    </div>
                                                  )}
                                                  {companyEnrichment.locality_clay && (
                                                    <div className="flex justify-between">
                                                      <span className="text-muted-foreground">Location:</span>
                                                      <span>{companyEnrichment.locality_clay}</span>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Description */}
                                                {companyEnrichment.description_clay && (
                                                  <div className="pt-2 border-t">
                                                    <p className="text-xs text-muted-foreground font-medium mb-1">Description:</p>
                                                    <p className="text-xs text-foreground/80 leading-relaxed">{companyEnrichment.description_clay}</p>
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
                                                      {JSON.stringify(companyEnrichment.raw_response, null, 2)}
                                                    </pre>
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Contact Enrichments Section */}
                                        {clayEnrichments.length > 0 && (
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Enrichment</p>
                                        )}
                                        {/* Bulk Evaluate Button */}
                                        {clayEnrichments.length > 0 && clayEnrichments.some(e => e.profile_match_score === null || e.profile_match_score === undefined) && <Button variant="outline" size="sm" onClick={handleBulkEvaluateMatches} disabled={bulkEvaluatingMatches} className="w-full h-8 text-xs gap-2">
                                            {bulkEvaluatingMatches ? <>
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Evaluating... ({bulkEvaluateProgress.current}/{bulkEvaluateProgress.total})
                                              </> : <>
                                                <Shield className="h-3 w-3" />
                                                Evaluate All Matches ({clayEnrichments.filter(e => e.profile_match_score === null || e.profile_match_score === undefined).length} pending)
                                              </>}
                                          </Button>}
                                        {clayEnrichments.length > 0 ? clayEnrichments.map(enrichment => <div key={enrichment.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                                              {/* Header with timestamp */}
                                              <div className="flex items-center justify-between">
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(enrichment.created_at).toLocaleString()}
                                                </p>
                                                <Badge variant="outline" className="text-[10px]">From Clay</Badge>
                                              </div>

                                              {/* Contact Info */}
                                              <div className="grid gap-2 text-sm">
                                                {enrichment.full_name && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Name:</span>
                                                    <span className="font-medium">{enrichment.full_name}</span>
                                                  </div>}
                                                {enrichment.title_clay && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Title:</span>
                                                    <span>{enrichment.title_clay}</span>
                                                  </div>}
                                                {enrichment.company_clay && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Company:</span>
                                                    <span>{enrichment.company_clay}</span>
                                                  </div>}
                                                {enrichment.email && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Email:</span>
                                                    <a href={`mailto:${enrichment.email}`} className="text-primary hover:underline">
                                                      {enrichment.email}
                                                    </a>
                                                  </div>}
                                                {enrichment.phone_clay && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Phone:</span>
                                                    <span>{enrichment.phone_clay}</span>
                                                  </div>}
                                                {enrichment.location_clay && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Location:</span>
                                                    <span>{enrichment.location_clay}</span>
                                                  </div>}
                                                {enrichment.latest_experience_clay && <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Latest Experience:</span>
                                                    <span>{enrichment.latest_experience_clay}</span>
                                                  </div>}
                                              </div>

                                              {/* Social Profiles */}
                                              {(enrichment.linkedin || enrichment.facebook_url_clay || enrichment.twitter_url_clay) && <div className="pt-2 border-t space-y-1">
                                                  <p className="text-xs text-muted-foreground font-medium">Social Profiles:</p>
                                                  {enrichment.linkedin && <div className="flex items-center gap-2 text-xs">
                                                      <Linkedin className="h-3 w-3" />
                                                      <a href={enrichment.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                                        {enrichment.linkedin.replace("https://", "").replace("www.", "")}
                                                      </a>
                                                    </div>}
                                                  {enrichment.facebook_url_clay && <div className="flex items-center gap-2 text-xs">
                                                      <Facebook className="h-3 w-3" />
                                                      <a href={enrichment.facebook_url_clay} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                                        {enrichment.facebook_url_clay.replace("https://", "").replace("www.", "")}
                                                      </a>
                                                    </div>}
                                                  {enrichment.twitter_url_clay && <div className="flex items-center gap-2 text-xs">
                                                      <Twitter className="h-3 w-3" />
                                                      <a href={enrichment.twitter_url_clay} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                                        {enrichment.twitter_url_clay.replace("https://", "").replace("www.", "")}
                                                      </a>
                                                    </div>}
                                                </div>}

                                              {/* Profile Match Evaluation */}
                                              <div className="pt-3 border-t space-y-2">
                                                {enrichment.profile_match_evaluated_at ? <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-xs text-muted-foreground font-medium">Match Evaluation:</span>
                                                      <div className="flex items-center gap-2">
                                                        <Badge variant={enrichment.profile_match_confidence === 'high' ? 'default' : enrichment.profile_match_confidence === 'medium' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                          {enrichment.profile_match_score}% - {enrichment.profile_match_confidence}
                                                        </Badge>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEvaluateMatch(enrichment)} disabled={evaluatingMatchId === enrichment.id} className="h-6 px-2 text-[10px]">
                                                          {evaluatingMatchId === enrichment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-evaluate"}
                                                        </Button>
                                                      </div>
                                                    </div>
                                                    {enrichment.profile_match_reasons && enrichment.profile_match_reasons.length > 0 && <Collapsible>
                                                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                          <ChevronRight className="h-3 w-3" />
                                                          View Reasons ({enrichment.profile_match_reasons.length})
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-4">
                                                            {enrichment.profile_match_reasons.map((reason, idx) => <li key={idx} className="list-disc">{reason}</li>)}
                                                          </ul>
                                                        </CollapsibleContent>
                                                      </Collapsible>}
                                                  </div> : <Button variant="outline" size="sm" onClick={() => handleEvaluateMatch(enrichment)} disabled={evaluatingMatchId === enrichment.id} className="w-full h-8 text-xs gap-2">
                                                    {evaluatingMatchId === enrichment.id ? <>
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Evaluating...
                                                      </> : <>
                                                        <Shield className="h-3 w-3" />
                                                        Evaluate Match
                                                      </>}
                                                  </Button>}
                                              </div>

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
                                            </div>) : (clayCompanyEnrichments.length === 0 && <p className="text-sm text-muted-foreground">
                                            No Clay enrichment logs yet. Send data from Clay to see logs here.
                                          </p>)}
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
                    </TableRow>)}
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
      <Dialog open={!!descriptionModalLead} onOpenChange={open => !open && setDescriptionModalLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Description</DialogTitle>
            <DialogDescription>{descriptionModalLead?.company || descriptionModalLead?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 1. Short Summary Section - First */}
            <div className="bg-muted/50 py-4 px-0 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Short Summary</h4>
                {descriptionModalLead?.short_summary ? (
                  <div className="text-sm mb-3 whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                    __html: descriptionModalLead.short_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }} />
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">
                    Generate a concise 2-3 line summary of what the business does and where it operates.
                  </p>
                )}
                <Button size="sm" variant="outline" onClick={() => descriptionModalLead && handleGenerateShortSummary(descriptionModalLead)} disabled={generatingShortSummary} className="w-full">
                  {generatingShortSummary ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </> : <>
                      {descriptionModalLead?.short_summary ? 'Regenerate Short Summary' : 'Generate Short Summary'}
                    </>}
                </Button>
              </div>

            {/* 2. Must Knows Section - Opened by default */}
            <Accordion type="single" collapsible defaultValue="must-knows" className="w-full">
              <AccordionItem value="must-knows" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Key Insights</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.must_knows ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed mb-3">{descriptionModalLead.must_knows}</div>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3">
                      Generate quick bullet points with key company facts: size, revenue, founded, location, specialty.
                    </p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => descriptionModalLead && handleGenerateMustKnows(descriptionModalLead)} disabled={generatingMustKnows} className="w-full">
                    {generatingMustKnows ? <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </> : <>
                        {descriptionModalLead?.must_knows ? 'Regenerate Key Insights' : 'Generate Key Insights'}
                      </>}
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 3. Products & Services Summary - Closed */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="products-summary" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Products & Services</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.products_services_summary ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed mb-3" dangerouslySetInnerHTML={{ 
                      __html: descriptionModalLead.products_services_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                    }} />
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3">
                      Turn products & services into a clean categorized list. No paragraphs.
                    </p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => descriptionModalLead && handleGenerateProductsSummary(descriptionModalLead)} disabled={generatingProductsSummary} className="w-full">
                    {generatingProductsSummary ? <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </> : <>
                        {descriptionModalLead?.products_services_summary ? 'Regenerate Products List' : 'Generate Products List'}
                      </>}
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 4. Detailed Company Profile - Closed */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="long-summary" className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="font-semibold text-sm">Company Overview</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {descriptionModalLead?.long_summary ? <p className="text-sm whitespace-pre-wrap leading-relaxed">{descriptionModalLead.long_summary}</p> : <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Generate a rich 5-8 line company profile including founding history, 
                        operations, scale, location, and notable achievements.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => descriptionModalLead && handleGenerateLongSummary(descriptionModalLead)} disabled={generatingLongSummary || !descriptionModalLead?.description && !descriptionModalLead?.products_services && !descriptionModalLead?.company_industry} className="w-full">
                        {generatingLongSummary ? <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </> : <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Detailed Profile
                          </>}
                      </Button>
                      {!descriptionModalLead?.description && !descriptionModalLead?.products_services && !descriptionModalLead?.company_industry && <p className="text-xs text-destructive">
                          Company details required. Run "Enrich with Apollo + Scrape Website" first.
                        </p>}
                    </div>}
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
                  {descriptionModalLead?.likely_business_cases ? <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {descriptionModalLead.likely_business_cases}
                    </div> : <div className="space-y-3">
                      {descriptionModalLead?.vehicles_count || descriptionModalLead?.truck_types || descriptionModalLead?.features ? <>
                          <p className="text-xs text-muted-foreground">
                            Generate likely business cases for vehicle tracking based on this company's 
                            fleet profile, industry, and operational needs.
                          </p>
                          <Button size="sm" variant="outline" onClick={() => descriptionModalLead && handleGenerateBusinessCases(descriptionModalLead)} disabled={generatingBusinessCases} className="w-full">
                            {generatingBusinessCases ? <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </> : <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Likely Business Cases
                              </>}
                          </Button>
                        </> : <p className="text-xs text-muted-foreground italic">
                          No vehicle data available. Add vehicle information during lead import to enable this feature.
                        </p>}
                    </div>}
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
            {newsModalData?.items?.length ? newsModalData.items.map((item: any, idx: number) => <div key={idx} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline block">
                    {item.title}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {item.source} • {item.date}
                  </p>
                  {item.snippet && <p className="text-xs text-foreground/80 leading-relaxed">{item.snippet}</p>}
                  {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Read full article
                    </a>}
                </div>) : <p className="text-sm text-muted-foreground">No news articles found.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>Complete information for this lead</DialogDescription>
          </DialogHeader>
          {selectedLead && <div className="space-y-4">
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
              {(selectedLead.vehicles_count || selectedLead.confirm_vehicles_50_plus || selectedLead.truck_types || selectedLead.features) && <Collapsible className="border-t pt-4">
                  <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    Vehicle Details
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLead.vehicles_count && <div>
                          <p className="text-sm font-medium text-muted-foreground">Fleet Size</p>
                          <p className="text-sm">{selectedLead.vehicles_count}</p>
                        </div>}
                      {selectedLead.confirm_vehicles_50_plus && <div>
                          <p className="text-sm font-medium text-muted-foreground">Confirmed 50+</p>
                          <p className="text-sm">{selectedLead.confirm_vehicles_50_plus}</p>
                        </div>}
                      {selectedLead.truck_types && <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Vehicle Types</p>
                          <p className="text-sm">{selectedLead.truck_types}</p>
                        </div>}
                      {selectedLead.features && <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Features</p>
                          <p className="text-sm">{selectedLead.features}</p>
                        </div>}
                    </div>
                  </CollapsibleContent>
                </Collapsible>}
              {selectedLead.domain && <div className="border-t pt-4">
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
                    {selectedLead.enriched_at && <div>
                        <p className="text-sm font-medium">Enriched At</p>
                        <p className="text-sm">{new Date(selectedLead.enriched_at).toLocaleString()}</p>
                      </div>}
                  </div>
                </div>}
            </div>}
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
              {contactsModalLead?.company_contacts?.filter(c => c.source === "apollo_people_search").map((contact, idx) => <TableRow key={`apollo-${idx}`}>
                    <TableCell className="font-medium">
                      {contact.name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "—"}
                    </TableCell>
                    <TableCell>{contact.title || "—"}</TableCell>
                    <TableCell>
                      {contact.found_without_role_filter ? <span className="text-muted-foreground text-sm">—</span> : contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline text-sm">
                          {contact.email}
                        </a> : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="bg-[#0F0F4B]/10 text-[#0F0F4B] border-[#0F0F4B]/30">
                          Apollo
                        </Badge>
                        {contact.found_without_role_filter && <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                            Name Only
                          </Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.email_status === "verified" && !contact.found_without_role_filter && <Badge className="bg-white dark:bg-black text-black dark:text-white border-gray-200 dark:border-gray-800">Verified</Badge>}
                    </TableCell>
                    <TableCell>
                      {contact.linkedin_url ? <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" />
                        </a> : "—"}
                    </TableCell>
                  </TableRow>)}

              {/* Scraped Contacts (from company_contacts with other sources) */}
              {contactsModalLead?.company_contacts?.filter(c => c.source !== "apollo_people_search").map((contact, idx) => <TableRow key={`scraper-${idx}`}>
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
                      {contact.is_personal && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Personal</Badge>}
                    </TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>)}

              {/* Primary scraped contact_email (if exists and not already in company_contacts) */}
              {contactsModalLead?.contact_email && !contactsModalLead?.company_contacts?.some(c => c.email === contactsModalLead.contact_email) && <TableRow>
                    <TableCell className="font-medium">—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <a href={`mailto:${contactsModalLead.contact_email}`} className="text-primary hover:underline text-sm">
                        {contactsModalLead.contact_email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Google
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contactsModalLead.contact_email_personal && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Personal</Badge>}
                      {contactsModalLead.email_domain_validated && <Badge className="bg-white dark:bg-black text-black dark:text-white border-gray-200 dark:border-gray-800">Validated</Badge>}
                    </TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>}
            </TableBody>
          </Table>

          {/* Empty state */}
          {!contactsModalLead?.company_contacts?.length && !contactsModalLead?.contact_email && <p className="text-muted-foreground text-center py-4">No contacts found</p>}
        </DialogContent>
      </Dialog>
    </>;
};
export default LeadsTable;