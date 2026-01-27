import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadUpload from "@/components/LeadUpload";
import LeadsTable from "@/components/LeadsTable";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ShoppingCart, Globe, TrendingUp, CreditCard, Settings as SettingsIcon, DollarSign, Zap, Building2, Car, Shield, Download, Settings2, Search, Loader2, Target, Users, CheckCircle, Sparkles, Share2, Pause, ChevronRight, ChevronDown, Info, CalendarIcon } from "lucide-react";
import { CategoryRolesDialog } from "@/components/CategoryRolesDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AccountSettings } from "@/components/AccountSettings";
import { runPipelineForLead } from "@/lib/runPipeline";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const CATEGORIES = [{
  name: "Marketing",
  icon: TrendingUp
}, {
  name: "Ecommerce",
  icon: ShoppingCart
}, {
  name: "Website",
  icon: Globe
}, {
  name: "Sales",
  icon: Briefcase
}, {
  name: "Taking Payments",
  icon: CreditCard
}, {
  name: "Operations",
  icon: SettingsIcon
}, {
  name: "Finance",
  icon: DollarSign
}, {
  name: "Utilities",
  icon: Zap
}, {
  name: "Offices",
  icon: Building2
}, {
  name: "Vehicles",
  icon: Car
}, {
  name: "Security",
  icon: Shield
}] as const;
export type ViewMode = 'all' | 'company' | 'contact';

const Index = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const { role: userRole } = useAdmin();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [domainFilter, setDomainFilter] = useState<'all' | 'valid' | 'invalid' | 'not_enriched' | 'today_enriched'>('valid');
  const [batchFilter, setBatchFilter] = useState<'all' | number>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7days' | 'last30days' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'apollo' | 'google' | 'email'>('all');
  const [enrichmentTypeFilter, setEnrichmentTypeFilter] = useState<'all' | 'company_domain' | 'socials'>('all');
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [rolesDialogCategory, setRolesDialogCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>('company');
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentCompany: '' });
  const [bulkScoring, setBulkScoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState({ current: 0, total: 0, currentCompany: '' });
  const [bulkFindingContacts, setBulkFindingContacts] = useState(false);
  const [contactProgress, setContactProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [bulkEvaluatingMatches, setBulkEvaluatingMatches] = useState(false);
  const [evaluateProgress, setEvaluateProgress] = useState({ current: 0, total: 0 });
  const [bulkFindingSocials, setBulkFindingSocials] = useState(false);
  const [socialProgress, setSocialProgress] = useState({ current: 0, total: 0, currentCompany: '' });
  const [bulkEnrichmentModalOpen, setBulkEnrichmentModalOpen] = useState(false);
  const [bulkRunningPipeline, setBulkRunningPipeline] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState({ 
    current: 0, 
    total: 0, 
    currentCompany: '', 
    currentStep: '' 
  });
  const pipelineStopRef = useRef(false);
  const [statsCategoryFilter, setStatsCategoryFilter] = useState<string | null>(null);
  const [diagnosisDialogOpen, setDiagnosisDialogOpen] = useState(false);
  const [selectedDiagnosisCategory, setSelectedDiagnosisCategory] = useState<string | null>(null);
  const [expandedValidSocials, setExpandedValidSocials] = useState(false);
  const [expandedValidLeads, setExpandedValidLeads] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    notEnriched: 0,
    validSocials: 0,
    validSocialsBreakdown: {
      facebook: 0,
      instagram: 0,
      linkedin: 0
    },
    validLeads: 0,
    validByScore: 0,
    hasValidatedSocials: 0,
    overlapBoth: 0,
    invalidNoDomainNoSocials: 0,
    diagnosisCounts: {} as Record<string, number>,
    contactsTotal: 0,
    contactsValid: 0,
    contactsInvalid: 0,
    contactsLowConfidence: 0,
    contactsNotFound: 0
  });
  useEffect(() => {
    checkAuth();
  }, []);

  // Recalculate stats when category filter changes
  useEffect(() => {
    if (leads.length > 0) {
      // Recalculate stats with current filter
      const calculateStatsWithFilter = async () => {
        // Filter by category if selected
        const filteredData = statsCategoryFilter 
          ? leads.filter(lead => lead.category === statsCategoryFilter)
          : leads;

        // Calculate category counts
        const counts: Record<string, number> = {};
        CATEGORIES.forEach(cat => counts[cat.name] = 0);
        leads.forEach((lead: any) => {
          if (lead.category && counts[lead.category] !== undefined) {
            counts[lead.category]++;
          }
        });
        setCategoryCounts(counts);

        // Calculate statistics
        // Valid: match_score >= 50 OR at least 1 social validated
        const valid = filteredData.filter(lead => 
          (lead.match_score !== null && lead.match_score >= 50) ||
          (lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true)
        ).length;
        
        // Count leads with valid socials (at least one social validated as true)
        const validSocials = filteredData.filter(lead => 
          lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true
        ).length;
        
        // Count valid socials by platform
        const validSocialsBreakdown = {
          facebook: filteredData.filter(lead => lead.facebook_validated === true).length,
          instagram: filteredData.filter(lead => lead.instagram_validated === true).length,
          linkedin: filteredData.filter(lead => lead.linkedin_validated === true).length
        };
        
        // Valid by score (≥50)
        const validByScore = filteredData.filter(lead => 
          lead.match_score !== null && lead.match_score >= 50
        ).length;

        // Has validated socials (at least one _validated = true)
        const hasValidatedSocials = filteredData.filter(lead => 
          lead.facebook_validated === true || 
          lead.linkedin_validated === true || 
          lead.instagram_validated === true
        ).length;

        // Overlap - leads that have BOTH conditions
        const overlapBoth = filteredData.filter(lead => 
          (lead.match_score !== null && lead.match_score >= 50) &&
          (lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true)
        ).length;

        // Total valid: match_score >= 50 OR has validated socials (matches filter logic)
        const validLeads = filteredData.filter(lead => {
          const hasValidatedSocials = lead.facebook_validated === true || 
                                      lead.linkedin_validated === true || 
                                      lead.instagram_validated === true;
          return (lead.match_score !== null && lead.match_score >= 50) || hasValidatedSocials;
        }).length;
        
        // Invalid: match_score < 50 AND no validated socials
        const invalid = filteredData.filter(lead => 
          (lead.match_score === null || lead.match_score < 50) &&
          !(lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true)
        ).length;
        
        // Invalid: match_score < 50 AND no validated socials AND enriched (matches filter logic)
        const invalidNoDomainNoSocials = filteredData.filter(lead => 
          (lead.match_score === null || lead.match_score < 50) &&
          !(lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true) &&
          lead.enriched_at !== null
        ).length;
        
        // Not Enriched: leads that haven't been enriched yet
        const notEnriched = filteredData.filter(lead => 
          lead.enriched_at === null
        ).length;

        // Count diagnosis categories only for leads without domains (failed enrichment)
        const diagnosisCounts: Record<string, number> = {};
        filteredData.filter(lead => !lead.domain).forEach(lead => {
          const category = lead.diagnosis_category || 'Not Diagnosed';
          diagnosisCounts[category] = (diagnosisCounts[category] || 0) + 1;
        });

        // Calculate contact enrichment stats
        const contactsTotal = filteredData.length;
        const leadsWithLinkedIn = filteredData.filter(
          lead => lead.contact_linkedin && lead.contact_linkedin.trim() !== ''
        );
        
        // Get lead IDs with LinkedIn to check confidence from clay_enrichments
        const leadIdsWithLinkedIn = leadsWithLinkedIn.map(l => l.id);
        const { data: clayData } = await supabase
          .from("clay_enrichments")
          .select("lead_id, profile_match_score")
          .in("lead_id", leadIdsWithLinkedIn.length > 0 ? leadIdsWithLinkedIn : ['none']);
        
        // Valid = LinkedIn + high confidence (>50)
        const contactsValid = (clayData || []).filter(
          c => c.profile_match_score !== null && c.profile_match_score > 50
        ).length;
        
        // Low confidence = has LinkedIn but score <=50
        const contactsLowConfidence = leadsWithLinkedIn.length - contactsValid;
        
        // Not found = no LinkedIn at all
        const contactsNotFound = contactsTotal - leadsWithLinkedIn.length;
        
        // Invalid = everyone else (low confidence + no LinkedIn)
        const contactsInvalid = contactsTotal - contactsValid;

        setStats({ 
          total: filteredData.length, 
          valid, 
          invalid, 
          notEnriched,
          validSocials,
          validSocialsBreakdown,
          validLeads,
          validByScore,
          hasValidatedSocials,
          overlapBoth,
          invalidNoDomainNoSocials,
          diagnosisCounts,
          contactsTotal,
          contactsValid,
          contactsInvalid,
          contactsLowConfidence,
          contactsNotFound
        });
      };

      calculateStatsWithFilter();
    }
  }, [statsCategoryFilter, leads]);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchLeads();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  };
  const fetchLeads = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("leads").select("*")
        .order("upload_batch", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setLeads(data || []);

      // Calculate category counts
      const counts: Record<string, number> = {};
      CATEGORIES.forEach(cat => counts[cat.name] = 0);
      (data || []).forEach((lead: any) => {
        if (lead.category && counts[lead.category] !== undefined) {
          counts[lead.category]++;
        }
      });
      setCategoryCounts(counts);

      // Filter by category if selected
      const filteredData = statsCategoryFilter 
        ? (data || []).filter(lead => lead.category === statsCategoryFilter)
        : (data || []);

      // Calculate statistics
      // Valid: match_score >= 50 OR at least 1 social validated
      const valid = filteredData.filter(lead => 
        (lead.match_score !== null && lead.match_score >= 50) ||
        (lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true)
      ).length;
      
      // Count leads with valid socials (at least one social validated as true)
      const validSocials = filteredData.filter(lead => 
        lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true
      ).length;
      
      // Count valid socials by platform
      const validSocialsBreakdown = {
        facebook: filteredData.filter(lead => lead.facebook_validated === true).length,
        instagram: filteredData.filter(lead => lead.instagram_validated === true).length,
        linkedin: filteredData.filter(lead => lead.linkedin_validated === true).length
      };
      
      // Valid by score (≥50)
      const validByScore = filteredData.filter(lead => 
        lead.match_score !== null && lead.match_score >= 50
      ).length;

      // Has validated socials (at least one _validated = true)
      const hasValidatedSocials = filteredData.filter(lead => 
        lead.facebook_validated === true || 
        lead.linkedin_validated === true || 
        lead.instagram_validated === true
      ).length;

      // Overlap - leads that have BOTH conditions
      const overlapBoth = filteredData.filter(lead => 
        (lead.match_score !== null && lead.match_score >= 50) &&
        (lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true)
      ).length;

      // Total valid: match_score >= 50 OR has validated socials (matches filter logic)
      const validLeads = filteredData.filter(lead => {
        const hasValidatedSocials = lead.facebook_validated === true || 
                                    lead.linkedin_validated === true || 
                                    lead.instagram_validated === true;
        return (lead.match_score !== null && lead.match_score >= 50) || hasValidatedSocials;
      }).length;
      
      // Invalid: match_score < 50 AND no validated socials
      const invalid = filteredData.filter(lead => 
        (lead.match_score === null || lead.match_score < 50) &&
        !(lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true)
      ).length;
      
      // Invalid: match_score < 50 AND no validated socials AND enriched (matches filter logic)
      const invalidNoDomainNoSocials = filteredData.filter(lead => 
        (lead.match_score === null || lead.match_score < 50) &&
        !(lead.facebook_validated === true || lead.linkedin_validated === true || lead.instagram_validated === true) &&
        lead.enriched_at !== null
      ).length;
      
      // Not Enriched: leads that haven't been enriched yet
      const notEnriched = filteredData.filter(lead => 
        lead.enriched_at === null
      ).length;

      // Count diagnosis categories only for leads without domains (failed enrichment)
      const diagnosisCounts: Record<string, number> = {};
      filteredData.filter(lead => !lead.domain).forEach(lead => {
        const category = lead.diagnosis_category || 'Not Diagnosed';
        diagnosisCounts[category] = (diagnosisCounts[category] || 0) + 1;
      });

      // Calculate contact enrichment stats
      const contactsTotal = filteredData.length;
      const leadsWithLinkedIn = filteredData.filter(
        lead => lead.contact_linkedin && lead.contact_linkedin.trim() !== ''
      );
      
      // Get lead IDs with LinkedIn to check confidence from clay_enrichments
      const leadIdsWithLinkedIn = leadsWithLinkedIn.map(l => l.id);
      const { data: clayData } = await supabase
        .from("clay_enrichments")
        .select("lead_id, profile_match_score")
        .in("lead_id", leadIdsWithLinkedIn.length > 0 ? leadIdsWithLinkedIn : ['none']);
      
      // Valid = LinkedIn + high confidence (>50)
      const contactsValid = (clayData || []).filter(
        c => c.profile_match_score !== null && c.profile_match_score > 50
      ).length;
      
      // Low confidence = has LinkedIn but score <=50
      const contactsLowConfidence = leadsWithLinkedIn.length - contactsValid;
      
      // Not found = no LinkedIn at all
      const contactsNotFound = contactsTotal - leadsWithLinkedIn.length;
      
      // Invalid = everyone else (low confidence + no LinkedIn)
      const contactsInvalid = contactsTotal - contactsValid;

      setStats({ 
        total: filteredData.length, 
        valid, 
        invalid, 
        notEnriched,
        validSocials,
        validSocialsBreakdown,
        validLeads,
        validByScore,
        hasValidatedSocials,
        overlapBoth,
        invalidNoDomainNoSocials,
        diagnosisCounts,
        contactsTotal,
        contactsValid,
        contactsInvalid,
        contactsLowConfidence,
        contactsNotFound
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleUploadComplete = (category: string) => {
    fetchLeads();
    setActiveView("home");
    setSelectedCategory(category);
  };
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };
  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleOpenRolesDialog = (e: React.MouseEvent, categoryName: string) => {
    e.stopPropagation();
    setRolesDialogCategory(categoryName);
    setRolesDialogOpen(true);
  };

  const handleBulkFindDomains = async () => {
    const leadsToEnrich = filteredLeads.filter(lead => !lead.domain && lead.company);
    
    if (leadsToEnrich.length === 0) {
      toast({
        title: "No leads to enrich",
        description: "All displayed leads already have domains or no company name.",
      });
      return;
    }

    setBulkEnriching(true);
    setBulkProgress({ current: 0, total: leadsToEnrich.length, currentCompany: '' });

    try {
      for (let i = 0; i < leadsToEnrich.length; i++) {
        const lead = leadsToEnrich[i];
        setBulkProgress({ current: i + 1, total: leadsToEnrich.length, currentCompany: lead.company || '' });

        // Run all 3 sources sequentially
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

        // Check if domain found - if not, run social searches then diagnosis
        const { data: updated } = await supabase.from("leads").select("domain, enrichment_logs").eq("id", lead.id).maybeSingle();
        if (!updated?.domain) {
          // No domain found - trigger social searches as fallback
          await supabase.functions.invoke("search-facebook-serper", {
            body: { leadId: lead.id, company: lead.company, city: lead.city, state: lead.state }
          });
          
          await supabase.functions.invoke("search-linkedin-serper", {
            body: { leadId: lead.id, company: lead.company, city: lead.city, state: lead.state }
          });
          
          await supabase.functions.invoke("search-instagram-serper", {
            body: { leadId: lead.id, company: lead.company, city: lead.city, state: lead.state }
          });
          
          // Then run diagnosis
          await supabase.functions.invoke("diagnose-enrichment", {
            body: {
              leadId: lead.id,
              leadData: lead,
              enrichmentLogs: updated?.enrichment_logs || []
            }
          });
        }
        // Domain validation will only happen when user clicks "Validate Domain"
      }

      toast({
        title: "Bulk enrichment complete",
        description: `Processed ${leadsToEnrich.length} leads.`,
      });
    } catch (error: any) {
      toast({
        title: "Error during bulk enrichment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkEnriching(false);
      setBulkProgress({ current: 0, total: 0, currentCompany: '' });
      fetchLeads();
    }
  };

  const handleBulkCalculateMatchScore = async () => {
    const leadsToScore = filteredLeads.filter(lead => lead.domain && lead.match_score === null);
    
    if (leadsToScore.length === 0) {
      toast({
        title: "No leads to score",
        description: "All displayed leads with domains already have match scores.",
      });
      return;
    }

    setBulkScoring(true);
    setScoreProgress({ current: 0, total: leadsToScore.length, currentCompany: '' });

    try {
      for (let i = 0; i < leadsToScore.length; i++) {
        const lead = leadsToScore[i];
        setScoreProgress({ current: i + 1, total: leadsToScore.length, currentCompany: lead.company || '' });

        // Step 1: Find coordinates
        await supabase.functions.invoke("find-company-coordinates", {
          body: {
            leadId: lead.id,
            domain: lead.domain,
            sourceUrl: lead.source_url
          }
        });

        // Step 2: Calculate distance (need to refetch lead to get coordinates)
        const { data: leadWithCoords } = await supabase.from("leads").select("latitude, longitude").eq("id", lead.id).maybeSingle();
        
        if (leadWithCoords && leadWithCoords.latitude && leadWithCoords.longitude) {
          await supabase.functions.invoke("calculate-distance", {
            body: {
              leadId: lead.id,
              city: lead.city,
              state: lead.state,
              zipcode: lead.zipcode,
              latitude: Number(leadWithCoords.latitude),
              longitude: Number(leadWithCoords.longitude)
            }
          });
        } else {
          console.log(`Skipping distance calculation for ${lead.company} - no coordinates found`);
        }

        // Step 3: Score domain relevance
        await supabase.functions.invoke("score-domain-relevance", {
          body: {
            leadId: lead.id,
            companyName: lead.company,
            domain: lead.domain,
            city: lead.city,
            state: lead.state,
            dma: lead.dma
          }
        });

        // Step 4: Calculate final match score
        await supabase.functions.invoke("calculate-match-score", {
          body: { leadId: lead.id }
        });
      }

      toast({
        title: "Match scoring complete",
        description: `Processed ${leadsToScore.length} leads.`,
      });
    } catch (error: any) {
      toast({
        title: "Error during scoring",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkScoring(false);
      setScoreProgress({ current: 0, total: 0, currentCompany: '' });
      fetchLeads();
    }
  };

  const handleBulkFindContacts = async () => {
    const leadsToEnrich = filteredLeads.filter(lead => lead.full_name && lead.email);
    
    if (leadsToEnrich.length === 0) {
      toast({
        title: "No leads to enrich",
        description: "All displayed leads need both name and email for contact enrichment.",
      });
      return;
    }

    setBulkFindingContacts(true);
    setContactProgress({ current: 0, total: leadsToEnrich.length, currentName: '' });

    try {
      for (let i = 0; i < leadsToEnrich.length; i++) {
        const lead = leadsToEnrich[i];
        setContactProgress({ current: i + 1, total: leadsToEnrich.length, currentName: lead.full_name || '' });

        // Step 1: Enrich Contact
        const { data, error } = await supabase.functions.invoke("enrich-contact", {
          body: {
            leadId: lead.id,
            full_name: lead.full_name,
            email: lead.email,
            domain: lead.domain,
            company: lead.company,
          },
        });

        if (error) {
          console.error(`Error enriching ${lead.full_name}:`, error);
          continue;
        }

        // Step 2: If LinkedIn URL found, send to Clay
        if (data?.enrichedContact?.linkedin_url) {
          console.log(`LinkedIn found for ${lead.full_name}, sending to Clay...`);
          
          await supabase.functions.invoke('send-to-clay', {
            body: {
              fullName: lead.full_name,
              email: lead.email,
              linkedin: data.enrichedContact.linkedin_url,
            },
          });
        }
      }

      toast({
        title: "Contact enrichment complete",
        description: `Processed ${leadsToEnrich.length} contacts.`,
      });
    } catch (error: any) {
      toast({
        title: "Error during contact enrichment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkFindingContacts(false);
      setContactProgress({ current: 0, total: 0, currentName: '' });
      fetchLeads();
    }
  };

  const handleBulkEvaluateMatches = async () => {
    const leadIds = filteredLeads.map(lead => lead.id);
    
    if (leadIds.length === 0) {
      toast({
        title: "No leads",
        description: "No leads to evaluate.",
      });
      return;
    }

    setBulkEvaluatingMatches(true);

    try {
      // Fetch all clay_enrichments without a match score for these leads
      const { data: enrichments, error } = await supabase
        .from('clay_enrichments')
        .select('id, lead_id, full_name, linkedin, title_clay, company_clay, location_clay')
        .in('lead_id', leadIds)
        .is('profile_match_score', null);

      if (error) throw error;

      if (!enrichments || enrichments.length === 0) {
        toast({
          title: "All Evaluated",
          description: "All Clay enrichments have already been evaluated.",
        });
        setBulkEvaluatingMatches(false);
        return;
      }

      setEvaluateProgress({ current: 0, total: enrichments.length });

      for (let i = 0; i < enrichments.length; i++) {
        const enrichment = enrichments[i];
        setEvaluateProgress({ current: i + 1, total: enrichments.length });

        const lead = filteredLeads.find(l => l.id === enrichment.lead_id);
        if (!lead) continue;

        await supabase.functions.invoke('evaluate-profile-match', {
          body: {
            enrichmentId: enrichment.id,
            leadData: {
              name: lead.full_name,
              company: lead.company,
              email: lead.email,
              location: lead.city && lead.state 
                ? `${lead.city}, ${lead.state}` 
                : lead.city || lead.state || null,
            },
            profileData: {
              platform: 'LinkedIn',
              linkedin: enrichment.linkedin,
              full_name: enrichment.full_name,
              title_clay: enrichment.title_clay,
              company_clay: enrichment.company_clay,
              location_clay: enrichment.location_clay,
            },
          },
        });
      }

      toast({
        title: "Evaluation Complete",
        description: `Evaluated ${enrichments.length} profile(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Evaluation Error",
        description: error.message || "Failed to evaluate profiles.",
        variant: "destructive",
      });
    } finally {
      setBulkEvaluatingMatches(false);
      setEvaluateProgress({ current: 0, total: 0 });
      fetchLeads();
    }
  };

  const handleBulkFindSocials = async () => {
    // Only process leads without domains
    const leadsToSearch = filteredLeads.filter(lead => !lead.domain && lead.company);
    
    if (leadsToSearch.length === 0) {
      toast({
        title: "No leads to search",
        description: "Find Socials only applies to leads without domains. All displayed leads either have domains or no company name.",
      });
      return;
    }

    setBulkFindingSocials(true);
    setSocialProgress({ current: 0, total: leadsToSearch.length, currentCompany: '' });

    try {
      for (let i = 0; i < leadsToSearch.length; i++) {
        const lead = leadsToSearch[i];
        setSocialProgress({ current: i + 1, total: leadsToSearch.length, currentCompany: lead.company || '' });

        // Search Facebook
        await supabase.functions.invoke("search-facebook-serper", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
          }
        });

        // Search LinkedIn
        await supabase.functions.invoke("search-linkedin-serper", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
          }
        });

        // Search Instagram
        await supabase.functions.invoke("search-instagram-serper", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
          }
        });

        // Get updated lead data to validate socials
        const { data: updatedLead } = await supabase.from("leads")
          .select("facebook, linkedin, instagram, enrichment_logs")
          .eq("id", lead.id)
          .maybeSingle();

        // Parse social search results from enrichment logs
        const logs = Array.isArray(updatedLead?.enrichment_logs) ? updatedLead.enrichment_logs as any[] : [];
        const facebookResults = logs.find((l: any) => l.action === 'facebook_search_serper')?.top3Results || [];
        const linkedinResults = logs.find((l: any) => l.action === 'linkedin_search_serper')?.top3Results || [];
        const instagramResults = logs.find((l: any) => l.action === 'instagram_search_serper')?.top3Results || [];

        // Validate social profiles with AI
        await supabase.functions.invoke("score-social-relevance", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
            facebookResults,
            linkedinResults,
            instagramResults,
          }
        });
      }

      toast({
        title: "Social search complete",
        description: `Processed ${leadsToSearch.length} leads.`,
      });
    } catch (error: any) {
      toast({
        title: "Error during social search",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkFindingSocials(false);
      setSocialProgress({ current: 0, total: 0, currentCompany: '' });
      fetchLeads();
    }
  };

  const handleBulkRunPipeline = async () => {
    const nonEnrichedLeads = filteredLeads.filter(lead => !lead.enriched_at);
    if (nonEnrichedLeads.length === 0) {
      toast({
        title: "No leads to process",
        description: "All filtered leads have already been enriched.",
      });
      return;
    }

    pipelineStopRef.current = false;
    setBulkRunningPipeline(true);
    setPipelineProgress({ current: 0, total: nonEnrichedLeads.length, currentCompany: '', currentStep: '' });

    try {
      for (let i = 0; i < nonEnrichedLeads.length; i++) {
        // Check if user requested to stop
        if (pipelineStopRef.current) {
          toast({
            title: "Pipeline Paused",
            description: `Stopped after processing ${i} of ${nonEnrichedLeads.length} leads.`,
          });
          break;
        }

        const lead = nonEnrichedLeads[i];
        setPipelineProgress(prev => ({ 
          ...prev, 
          current: i + 1, 
          currentCompany: lead.company || lead.full_name,
          currentStep: 'Starting...'
        }));

        try {
          await runPipelineForLead(lead, {
            setPipelineStep: (step) => {
              // Map step names to numbered format for bulk pipeline
              const stepMap: Record<string, string> = {
                'Finding Domain...': 'Finding Domain (1/9)...',
                'Validating Domain...': 'Validating Domain (2/9)...',
                'Finding Coordinates...': 'Finding Coordinates (3/9)...',
                'Calculating Distance...': 'Calculating Distance (4/9)...',
                'Scoring Domain Relevance...': 'Scoring Domain (5/9)...',
                'Calculating Match Score...': 'Calculating Match Score (6/9)...',
                'Enriching Company...': 'Enriching Company (7/9)...',
                'Finding Contacts...': 'Finding Contacts (8/9)...',
                'Getting News...': 'Getting News (9/9)...'
              };
              setPipelineProgress(prev => ({ 
                ...prev, 
                currentStep: step ? (stepMap[step] || step) : '' 
              }));
            },
            toast: ({ title, description, variant }) => {
              toast({ title, description, variant });
            },
            onEnrichComplete: () => {
              // Optional: refresh leads if needed
            }
          });

        } catch (leadError: any) {
          console.error(`Error processing lead ${lead.id}:`, leadError);
        }
      }

      toast({
        title: "Bulk Pipeline Complete",
        description: `Processed ${nonEnrichedLeads.length} leads.`,
      });
    } catch (error: any) {
      toast({
        title: "Bulk Pipeline Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkRunningPipeline(false);
      setPipelineProgress({ current: 0, total: 0, currentCompany: '', currentStep: '' });
      fetchLeads();
    }
  };

  const categoryFilteredLeads = selectedCategory ? leads.filter(lead => lead.category === selectedCategory) : leads;
  const uniqueBatches = [...new Set(
    categoryFilteredLeads
      .filter(lead => lead.upload_batch !== null)
      .map(lead => lead.upload_batch as number)
  )].sort((a, b) => a - b);

  const filteredLeads = categoryFilteredLeads.filter((lead) => {
    // Batch filter
    if (batchFilter !== 'all' && lead.upload_batch !== batchFilter) return false;
    
    // Date filter - filter by created_at
    if (dateFilter !== 'all') {
      const leadDate = lead.created_at ? new Date(lead.created_at) : null;
      if (!leadDate) return false;
      
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (leadDate < today) return false;
      } else if (dateFilter === 'last7days') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        if (leadDate < weekAgo) return false;
      } else if (dateFilter === 'last30days') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        monthAgo.setHours(0, 0, 0, 0);
        if (leadDate < monthAgo) return false;
      } else if (dateFilter === 'custom' && customDateRange) {
        if (customDateRange.from) {
          const fromDate = new Date(customDateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (leadDate < fromDate) return false;
        }
        if (customDateRange.to) {
          const toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (leadDate > toDate) return false;
        }
      }
    }
    
    // Check if lead has validated socials (only check validated flag, not URL presence)
    const hasValidatedSocials = lead.facebook_validated === true || 
                                 lead.linkedin_validated === true || 
                                 lead.instagram_validated === true;
    
    // Domain filter
    if (domainFilter === 'valid') {
      // Valid if match_score >= 50 OR has validated socials found
      if (!((lead.match_score !== null && lead.match_score >= 50) || hasValidatedSocials)) return false;
    }
    if (domainFilter === 'invalid') {
      // Invalid if lead has been enriched AND no valid match score AND no validated socials
      // (Exclude not-enriched leads from invalid)
      if (!((lead.match_score === null || lead.match_score < 50) && !hasValidatedSocials && lead.enriched_at !== null)) return false;
    }
    if (domainFilter === 'not_enriched') {
      if (lead.enriched_at !== null) return false;
    }
    if (domainFilter === 'today_enriched') {
      if (!lead.enriched_at) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const enrichedDate = new Date(lead.enriched_at);
      if (enrichedDate < today) return false;
    }

    // Helper to check if domain matches email domain
    const domainMatchesEmail = (email: string | null, domain: string | null): boolean => {
      if (!email || !domain) return false;
      const emailDomain = email.split('@')[1]?.toLowerCase();
      const leadDomain = domain.toLowerCase().replace(/^www\./, '');
      return emailDomain === leadDomain;
    };

    // SOURCE filter - check enrichment_logs for sources that found a domain
    if (sourceFilter !== 'all') {
      const logs = Array.isArray(lead.enrichment_logs) ? lead.enrichment_logs as any[] : [];
      let hasQualifyingSource = false;
      
      for (const log of logs) {
        // Skip if no domain found
        if (!log.domain) continue;
        
        if (sourceFilter === 'apollo' && log.source === 'apollo_api') {
          hasQualifyingSource = true;
          break;
        } else if (sourceFilter === 'google' && (log.source === 'google_knowledge_graph' || log.source === 'google_local_results')) {
          hasQualifyingSource = true;
          break;
        } else if (sourceFilter === 'email' && log.source === 'email_domain_verified') {
          hasQualifyingSource = true;
          break;
        }
      }
      
      if (!hasQualifyingSource) return false;
    }

    // Enrichment Type filter
    if (enrichmentTypeFilter !== 'all') {
      if (enrichmentTypeFilter === 'company_domain') {
        // Show leads that have a domain (from any source)
        if (!lead.domain) return false;
      } else if (enrichmentTypeFilter === 'socials') {
        // Show leads that have at least one VALID social found
        // Socials that are found but marked invalid should not count
        const hasValidSocials = 
          lead.facebook_validated === true || 
          lead.linkedin_validated === true || 
          lead.instagram_validated === true;
        if (!hasValidSocials) return false;
      }
    }

    return true;
  });

  // Helper to extract sources that found a domain from enrichment_logs
  const getSource = (enrichmentLogs: any): string => {
    if (!enrichmentLogs || !Array.isArray(enrichmentLogs)) return '';
    
    const qualifyingSources: string[] = [];
    
    for (const log of enrichmentLogs) {
      // Skip if no domain found
      if (!log.domain) continue;
      
      // Map source to friendly name
      if (log.source === 'apollo_api' && !qualifyingSources.includes('Apollo')) {
        qualifyingSources.push('Apollo');
      } else if ((log.source === 'google_knowledge_graph' || log.source === 'google_local_results') && !qualifyingSources.includes('Google')) {
        qualifyingSources.push('Google');
      } else if (log.source === 'email_domain_verified' && !qualifyingSources.includes('Email')) {
        qualifyingSources.push('Email');
      }
    }
    
    return qualifyingSources.join(', ');
  };

  const handleExportCSV = async () => {
    const headers = [
      "Name", "Email", "Company", "Zipcode", "DMA",
      "Company Website", "Domain Source", "Company Match Score", "Industry", "Company Revenue", "Company Size",
      "Founded", "Valid Company LinkedIn", "Valid Company Facebook", "Enrichment Type", "Company Summary", "Company Contacts",
      "Company News", "Key Insights", "Products & Services", "Contact Job Title", "Contact Phone",
      "Contact Summary", "Contact LinkedIn", "Contact Facebook", "Contact YouTube"
    ];
    
    // Sort leads to match table display order (high match score first)
    const sortedLeads = [...filteredLeads].sort((a, b) => {
      const aScore = a.match_score ?? -1;
      const bScore = b.match_score ?? -1;
      
      // Leads with valid match score (>= 50) come first
      const aHasValidScore = a.match_score !== null && a.match_score >= 50;
      const bHasValidScore = b.match_score !== null && b.match_score >= 50;
      
      if (aHasValidScore && !bHasValidScore) return -1;
      if (!aHasValidScore && bHasValidScore) return 1;
      
      // If both have valid scores, sort by score descending
      if (aHasValidScore && bHasValidScore) {
        if (aScore !== bScore) return bScore - aScore;
      }
      
      // Check for validated socials
      const aHasValidSocials = a.facebook_validated === true || 
                               a.linkedin_validated === true || 
                               a.instagram_validated === true;
      const bHasValidSocials = b.facebook_validated === true || 
                               b.linkedin_validated === true || 
                               b.instagram_validated === true;
      
      if (aHasValidSocials && !bHasValidSocials) return -1;
      if (!aHasValidSocials && bHasValidSocials) return 1;
      
      // Fallback: sort by name
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
    
    // Fetch clay enrichments for contact phone and summary
    const leadIds = sortedLeads.map(l => l.id);
    const { data: clayEnrichments } = await supabase
      .from("clay_enrichments")
      .select("lead_id, phone_clay, summary_clay")
      .in("lead_id", leadIds.length > 0 ? leadIds : ['none']);
    
    // Create a map for quick lookup
    const clayMap = new Map<string, { phone_clay: string | null; summary_clay: string | null }>();
    clayEnrichments?.forEach(ce => {
      clayMap.set(ce.lead_id, { phone_clay: ce.phone_clay, summary_clay: ce.summary_clay });
    });

    const rows = sortedLeads.map((lead) => {
      // Parse contact_details to extract job title if available
      let contactJobTitle = "";
      if (lead.contact_details) {
        try {
          const details = typeof lead.contact_details === 'string' 
            ? JSON.parse(lead.contact_details) 
            : lead.contact_details;
          contactJobTitle = details?.title || details?.job_title || "";
        } catch (e) {
          contactJobTitle = "";
        }
      }
      
      // Get clay enrichment data for this lead
      const clayData = clayMap.get(lead.id);
      
      // Format company contacts
      let companyContactsStr = "";
      if (lead.company_contacts) {
        try {
          const contacts = typeof lead.company_contacts === 'string' 
            ? JSON.parse(lead.company_contacts) 
            : lead.company_contacts;
          if (Array.isArray(contacts) && contacts.length > 0) {
            companyContactsStr = contacts.map((c: any) => {
              const parts = [];
              if (c.name) parts.push(c.name);
              if (c.title) parts.push(`(${c.title})`);
              if (c.email) parts.push(c.email);
              if (c.linkedin) parts.push(c.linkedin);
              return parts.join(" ");
            }).join(" | ");
          }
        } catch (e) {
          companyContactsStr = "";
        }
      }

      // Format news for CSV
      let newsStr = "";
      if (lead.news) {
        try {
          const newsData = typeof lead.news === 'string' 
            ? JSON.parse(lead.news) 
            : lead.news;
          if (newsData?.items && Array.isArray(newsData.items)) {
            newsStr = newsData.items.map((item: any) => {
              return `${item.title || ""} - ${item.source || ""} • ${item.date || ""}: ${item.snippet || ""}`;
            }).join(" || ");
          }
        } catch (e) {
          newsStr = "";
        }
      }

      // Determine enrichment type
      const hasValidSocials = 
        lead.facebook_validated === true ||
        lead.linkedin_validated === true ||
        lead.instagram_validated === true;
      const hasDomain = lead.domain !== null && lead.domain !== "";

      let enrichmentType = "";
      if (hasDomain && hasValidSocials) {
        enrichmentType = "Company Domain, Socials";
      } else if (hasDomain) {
        enrichmentType = "Company Domain";
      } else if (hasValidSocials) {
        enrichmentType = "Socials";
      }

      return [
        lead.full_name || "",
        lead.email || "",
        lead.company || "",
        lead.zipcode || "",
        lead.dma || "",
        lead.domain || "",
        getSource(lead.enrichment_logs),
        // Only show match score if lead has a domain (match score is about domain confidence)
        (hasDomain && lead.match_score !== null) ? `${lead.match_score}%` : "",
        lead.company_industry || "",
        lead.annual_revenue || "",
        lead.size || "",
        lead.founded_date || "",
        lead.linkedin || "",
        lead.facebook || "",
        enrichmentType,
        lead.long_summary || lead.short_summary || "",
        companyContactsStr,
        newsStr,
        lead.must_knows || "",
        lead.products_services_summary || lead.products_services || "",
        contactJobTitle,
        clayData?.phone_clay || "",
        clayData?.summary_clay || "",
        lead.contact_linkedin || "",
        lead.contact_facebook || "",
        lead.contact_youtube || "",
      ];
    });

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

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (view === "home") {
      setSelectedCategory(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  return <DashboardLayout activeView={activeView} onViewChange={handleViewChange} selectedCategory={selectedCategory} categoryLeadCount={selectedCategory ? categoryCounts[selectedCategory] : undefined}>
      {activeView === "settings" ? (
        <AccountSettings />
      ) : activeView === "admin" ? (
        <AdminDashboard />
      ) : activeView === "statistics" ? (
        <div className="space-y-8">
          <div>            
            {/* Category Filter */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-[#0F0F4B]">Filter by Category:</span>
              <Select 
                value={statsCategoryFilter || "all"} 
                onValueChange={(value) => setStatsCategoryFilter(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="View All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">View All Categories</SelectItem>
                  {CATEGORIES.filter(cat => categoryCounts[cat.name] > 0).map(category => {
                    const Icon = category.icon;
                    return (
                      <SelectItem key={category.name} value={category.name}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{category.name}</span>
                          <span className="text-muted-foreground">({categoryCounts[category.name]})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Lead Overview */}
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-[#0F0F4B] mb-1">Total Leads</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </div>

          {/* Company Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Company Statistics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Valid Leads Component */}
                 <div className="p-4 border rounded-lg bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#0F0F4B] dark:text-white">Valid Leads</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setExpandedValidLeads(!expandedValidLeads)}
                  >
                    {expandedValidLeads ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-3xl font-bold text-[#0F0F4B] dark:text-white">
                  {stats.validLeads}
                  {stats.total > 0 && (
                    <span className="text-lg font-normal text-[#0F0F4B]/60 dark:text-white/60 ml-2">
                      ({((stats.validLeads / stats.total) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#0F0F4B]/70 dark:text-white/70 mt-1">
                  Leads with ≥50% match score or validated socials
                </p>
                
                {expandedValidLeads && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#0F0F4B]/80 dark:text-white/80">Valid by score (≥50)</span>
                      <span className="font-semibold text-[#0F0F4B] dark:text-white">{stats.validByScore}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#0F0F4B]/80 dark:text-white/80">Has validated socials</span>
                      <span className="font-semibold text-[#0F0F4B] dark:text-white">{stats.hasValidatedSocials}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#0F0F4B]/80 dark:text-white/80">Overlap (both)</span>
                      <span className="font-semibold text-[#0F0F4B] dark:text-white">-{stats.overlapBoth}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
                      <span className="text-sm font-medium text-[#0F0F4B] dark:text-white">Total Valid</span>
                      <span className="font-bold text-[#0F0F4B] dark:text-white">{stats.validLeads}</span>
                    </div>
                    <div className="text-xs text-[#0F0F4B]/60 dark:text-white/60 text-center">
                      {stats.validByScore} + {stats.hasValidatedSocials} - {stats.overlapBoth} = {stats.validLeads}
                    </div>
                  </div>
                )}
              </div>
              {/* Invalid Leads */}
              <div className="p-4 border rounded-lg bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                <p className="text-sm text-[#0F0F4B] dark:text-white">Invalid Leads</p>
                <p className="text-3xl font-bold text-[#0F0F4B] dark:text-white">
                  {stats.invalidNoDomainNoSocials}
                  {stats.total > 0 && (
                    <span className="text-lg font-normal text-[#0F0F4B]/60 dark:text-white/60 ml-2">
                      ({((stats.invalidNoDomainNoSocials / stats.total) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#0F0F4B]/70 dark:text-white/70 mt-1">
                  No domain and no socials found
                </p>
              </div>

           

              {/* Not Enriched */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Not Enriched</p>
                <p className="text-3xl font-bold">
                  {stats.notEnriched}
                  {stats.total > 0 && (
                    <span className="text-lg font-normal text-muted-foreground/60 ml-2">
                      ({((stats.notEnriched / stats.total) * 100).toFixed(1)}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Leads not yet processed</p>
              </div>
            </div>

            {/* Leads Without Domain — Diagnosis Breakdown */}
            {Object.keys(stats.diagnosisCounts).length > 0 && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-3 text-sm text-[#0F0F4B]">Not Found Domains & Diagnosis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(stats.diagnosisCounts)
                    .filter(([category]) => 
                      category === 'Fake/test data' || 
                      category === 'Company doesn\'t exist / New company' || 
                      category === 'Data quality issues'
                    )
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{category}</span>
                          <Info 
                            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" 
                            onClick={() => {
                              setSelectedDiagnosisCategory(category);
                              setDiagnosisDialogOpen(true);
                            }}
                          />
                        </div>
                        <span className="font-semibold text-lg">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

        </div>
      ) : activeView === "home" ? selectedCategory ? <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold">{selectedCategory}</h2>
                <span className="text-muted-foreground">({filteredLeads.length} leads)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={handleExportCSV}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkEnrichmentModalOpen(true)}
                    disabled={bulkEnriching || bulkScoring || bulkFindingContacts || bulkEvaluatingMatches || bulkFindingSocials || bulkRunningPipeline || filteredLeads.length === 0}
                    className="gap-2"
                  >
                    Bulk Enrichment
                  </Button>
                </div>
              </div>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#0F0F4B]">View:</span>
                <div className="flex border rounded-none overflow-hidden">
                  <Button
                    variant={viewMode === 'company' ? 'default' : 'ghost'}
                    size="sm"
                    className={`rounded-none border-0 ${viewMode === 'company' ? 'bg-[#0F0F4B] text-white hover:bg-[#0F0F4B]/90' : ''}`}
                    onClick={() => setViewMode('company')}
                  >
                    Company
                  </Button>
                  <Button
                    variant={viewMode === 'contact' ? 'default' : 'ghost'}
                    size="sm"
                    className={`rounded-none border-0 border-x ${viewMode === 'contact' ? 'bg-[#0F0F4B] text-white hover:bg-[#0F0F4B]/90' : ''}`}
                    onClick={() => setViewMode('contact')}
                  >
                    Contact
                  </Button>
                  <Button
                    variant={viewMode === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    className={`rounded-none border-0 ${viewMode === 'all' ? 'bg-[#0F0F4B] text-white hover:bg-[#0F0F4B]/90' : ''}`}
                    onClick={() => setViewMode('all')}
                  >
                    View All
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#0F0F4B]">Filter by:</span>
                <Select value={domainFilter} onValueChange={(value: 'all' | 'valid' | 'invalid' | 'not_enriched' | 'today_enriched') => setDomainFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Domain Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    <SelectItem value="valid" className="font-semibold">Valid (≥50% Match)</SelectItem>
                    <SelectItem value="invalid">Invalid (&lt;50% Match)</SelectItem>
                    <SelectItem value="not_enriched">Not Enriched</SelectItem>
                    <SelectItem value="today_enriched">Enriched Today</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={dateFilter} 
                  onValueChange={(value: 'all' | 'today' | 'last7days' | 'last30days' | 'custom') => {
                    setDateFilter(value);
                    if (value !== 'custom') {
                      setCustomDateRange(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={sourceFilter} 
                  onValueChange={(value: 'all' | 'apollo' | 'google' | 'email') => setSourceFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="SOURCE" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="apollo">Apollo</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={enrichmentTypeFilter} 
                  onValueChange={(value: 'all' | 'company_domain' | 'socials') => setEnrichmentTypeFilter(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Enrichment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Enrichment Types</SelectItem>
                    <SelectItem value="company_domain">Enrichment Company Domain</SelectItem>
                    <SelectItem value="socials">Enrichment Socials</SelectItem>
                  </SelectContent>
                </Select>
                {dateFilter === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !customDateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange?.from ? (
                          customDateRange.to ? (
                            <>
                              {format(customDateRange.from, "LLL dd, y")} -{" "}
                              {format(customDateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(customDateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={customDateRange?.from}
                        selected={customDateRange}
                        onSelect={setCustomDateRange}
                        numberOfMonths={2}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <span className="text-sm text-[#0F0F4B]">
                  Showing {filteredLeads.length} of {categoryFilteredLeads.length} leads
                </span>
              </div>

              {/* Bulk Enrichment Modal */}
              <Dialog open={bulkEnrichmentModalOpen} onOpenChange={setBulkEnrichmentModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Bulk Enrichment Actions</DialogTitle>
                    <DialogDescription>
                      Operations will run on <span className="font-medium">{filteredLeads.length} leads</span> currently shown based on your selected category, batch, and domain filters.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 py-4">
                      {/* Run Full Pipeline Card */}
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Run Full Pipeline</h4>
                            <p className="text-sm text-muted-foreground">
                              Run complete enrichment on {filteredLeads.filter(l => !l.enriched_at).length} non-enriched leads
                            </p>
                          </div>
                          <Button 
                            onClick={handleBulkRunPipeline}
                            disabled={bulkRunningPipeline || filteredLeads.filter(l => !l.enriched_at).length === 0}
                          >
                            {bulkRunningPipeline ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {pipelineProgress.current}/{pipelineProgress.total}
                              </>
                            ) : (
                              "Start Pipeline"
                            )}
                          </Button>
                          {bulkRunningPipeline && (
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => { pipelineStopRef.current = true; }}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </Button>
                          )}
                        </div>
                        
                        {/* Progress indicator when running */}
                        {bulkRunningPipeline && (
                          <div className="bg-muted/50 rounded-md p-3 space-y-2">
                            <p className="text-sm font-medium">{pipelineProgress.currentCompany}</p>
                            <p className="text-xs text-muted-foreground">{pipelineProgress.currentStep}</p>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(pipelineProgress.current / pipelineProgress.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Pipeline: Find Domain → Validate → Find Coordinates → Calculate Distance → 
                        Score Domain → Calculate Match → Enrich Company → Find Contacts → Get News
                      </p>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
            <LeadsTable leads={filteredLeads} onEnrichComplete={fetchLeads} hideFilterBar domainFilter={domainFilter} onDomainFilterChange={setDomainFilter} viewMode={viewMode} userRole={userRole} />
          </div> : <div className="space-y-6">
           
            <div className="grid grid-cols-4 gap-8 max-w-[1100px]">
              {CATEGORIES.map(category => {
          const Icon = category.icon;
          const count = categoryCounts[category.name] || 0;
          return { category, count };
        })
        .sort((a, b) => {
          // Categories with leads first, then by count descending
          if (a.count > 0 && b.count === 0) return -1;
          if (a.count === 0 && b.count > 0) return 1;
          return b.count - a.count;
        })
        .map(({ category, count }) => (
          <div
            key={category.name}
            className="flex flex-col items-center justify-center gap-3 h-[180px] border-2 border-[#14124E] text-[#14124E] bg-white transition hover:bg-[#14124E] hover:text-white cursor-pointer"
            onClick={() => handleCategorySelect(category.name)}
          >
                    <span className="font-medium text-sm">{category.name}</span>
            <span className="text-sm">{count} leads</span>
          </div>
        ))}
            </div>
          </div> : <LeadUpload onUploadComplete={handleUploadComplete} />}

      <CategoryRolesDialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        category={rolesDialogCategory}
      />

      {/* Diagnosis Category Leads Dialog */}
      <Dialog open={diagnosisDialogOpen} onOpenChange={setDiagnosisDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedDiagnosisCategory}</DialogTitle>
            <DialogDescription>
              Leads without domains that match this diagnosis category
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-2">
              {leads
                .filter(lead => 
                  !lead.domain && 
                  (lead.diagnosis_category || 'Not Diagnosed') === selectedDiagnosisCategory &&
                  (!statsCategoryFilter || lead.category === statsCategoryFilter)
                )
                .map((lead) => (
                  <div key={lead.id} className="p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{lead.full_name}</p>
                        {lead.company && (
                          <p className="text-sm text-muted-foreground">Company: {lead.company}</p>
                        )}
                        {(lead.city || lead.state) && (
                          <p className="text-sm text-muted-foreground">
                            {[lead.city, lead.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {lead.email && (
                          <p className="text-sm text-muted-foreground">Email: {lead.email}</p>
                        )}
                        {lead.diagnosis_explanation && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {lead.diagnosis_explanation}
                          </p>
                        )}
                      </div>
                      {lead.category && (
                        <Badge variant="outline" className="text-xs">
                          {lead.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              {leads.filter(lead => 
                !lead.domain && 
                (lead.diagnosis_category || 'Not Diagnosed') === selectedDiagnosisCategory &&
                (!statsCategoryFilter || lead.category === statsCategoryFilter)
              ).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No leads found for this category</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>;
};
export default Index;