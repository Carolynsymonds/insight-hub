import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadUpload from "@/components/LeadUpload";
import LeadsTable from "@/components/LeadsTable";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShoppingCart, Globe, TrendingUp, CreditCard, Settings as SettingsIcon, DollarSign, Zap, Building2, Car, Shield, Download, Settings2, Search, Loader2, Target, Users, CheckCircle, Sparkles, Share2 } from "lucide-react";
import { CategoryRolesDialog } from "@/components/CategoryRolesDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminDashboard } from "@/components/AdminDashboard";

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
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [domainFilter, setDomainFilter] = useState<'all' | 'valid' | 'invalid' | 'not_enriched' | 'today_enriched'>('valid');
  const [batchFilter, setBatchFilter] = useState<'all' | number>('all');
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
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    notEnriched: 0,
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

      // Calculate statistics
      const valid = (data || []).filter(lead => 
        lead.enrichment_confidence !== null && lead.enrichment_confidence >= 50
      ).length;
      const invalid = (data || []).filter(lead => 
        lead.enrichment_confidence !== null && lead.enrichment_confidence < 50
      ).length;
      const notEnriched = (data || []).filter(lead => 
        lead.enrichment_confidence === null && !lead.domain
      ).length;

      // Count diagnosis categories only for leads without domains (failed enrichment)
      const diagnosisCounts: Record<string, number> = {};
      (data || []).filter(lead => !lead.domain).forEach(lead => {
        const category = lead.diagnosis_category || 'Not diagnosed';
        diagnosisCounts[category] = (diagnosisCounts[category] || 0) + 1;
      });

      // Calculate contact enrichment stats
      const contactsTotal = (data || []).length;
      const leadsWithLinkedIn = (data || []).filter(
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
        total: (data || []).length, 
        valid, 
        invalid, 
        notEnriched, 
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

    setBulkRunningPipeline(true);
    setPipelineProgress({ current: 0, total: nonEnrichedLeads.length, currentCompany: '', currentStep: '' });

    try {
      for (let i = 0; i < nonEnrichedLeads.length; i++) {
        const lead = nonEnrichedLeads[i];
        setPipelineProgress(prev => ({ 
          ...prev, 
          current: i + 1, 
          currentCompany: lead.company || lead.full_name,
          currentStep: 'Starting...'
        }));

        try {
          // PATH B: Contact enrichment - runs in parallel
          const contactEnrichmentPromise = supabase.functions.invoke("enrich-contact", {
            body: {
              leadId: lead.id,
              full_name: lead.full_name,
              email: lead.email,
              domain: lead.domain,
              company: lead.company
            }
          });

          // PATH A: Domain enrichment flow
          setPipelineProgress(prev => ({ ...prev, currentStep: 'Finding Domain (1/9)...' }));

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

          // Email
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

          // Check if domain was found
          const { data: updatedLead } = await supabase
            .from("leads")
            .select("domain, enrichment_logs, source_url")
            .eq("id", lead.id)
            .single();

          const domainFound = !!updatedLead?.domain;

          if (domainFound) {
            // Step 2: Validate Domain
            setPipelineProgress(prev => ({ ...prev, currentStep: 'Validating Domain (2/9)...' }));
            const { data: validationData } = await supabase.functions.invoke("validate-domain", {
              body: { domain: updatedLead.domain }
            });

            if (validationData?.is_valid_domain) {
              await supabase.from("leads").update({
                email_domain_validated: validationData.is_valid_domain
              }).eq("id", lead.id);
            }

            if (validationData?.is_valid_domain && !validationData?.is_parked) {
              // Step 3: Find Coordinates
              setPipelineProgress(prev => ({ ...prev, currentStep: 'Finding Coordinates (3/9)...' }));
              await supabase.functions.invoke("find-company-coordinates", {
                body: {
                  leadId: lead.id,
                  domain: updatedLead.domain,
                  sourceUrl: updatedLead.source_url
                }
              });

              const { data: leadWithCoords } = await supabase
                .from("leads")
                .select("latitude, longitude")
                .eq("id", lead.id)
                .single();

              // Step 4: Calculate Distance
              if (leadWithCoords?.latitude && leadWithCoords?.longitude) {
                setPipelineProgress(prev => ({ ...prev, currentStep: 'Calculating Distance (4/9)...' }));
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
              setPipelineProgress(prev => ({ ...prev, currentStep: 'Scoring Domain (5/9)...' }));
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
              setPipelineProgress(prev => ({ ...prev, currentStep: 'Calculating Match Score (6/9)...' }));
              await supabase.functions.invoke("calculate-match-score", {
                body: { leadId: lead.id }
              });

              const { data: leadWithScore } = await supabase
                .from("leads")
                .select("match_score, enrichment_source, apollo_not_found")
                .eq("id", lead.id)
                .single();

              // Company enrichment only if match score > 50
              if (leadWithScore?.match_score && leadWithScore.match_score > 50) {
                const { data: { user } } = await supabase.auth.getUser();

                setPipelineProgress(prev => ({ ...prev, currentStep: 'Enriching Company (7/9)...' }));
                await supabase.functions.invoke("enrich-company-details", {
                  body: {
                    leadId: lead.id,
                    domain: updatedLead.domain,
                    enrichmentSource: leadWithScore.enrichment_source,
                    apolloNotFound: leadWithScore.apollo_not_found
                  }
                });

                setPipelineProgress(prev => ({ ...prev, currentStep: 'Finding Contacts (8/9)...' }));
                await supabase.functions.invoke("find-company-contacts", {
                  body: {
                    leadId: lead.id,
                    domain: updatedLead.domain,
                    category: lead.category,
                    userId: user?.id
                  }
                });

                setPipelineProgress(prev => ({ ...prev, currentStep: 'Getting News (9/9)...' }));
                await supabase.functions.invoke("get-company-news", {
                  body: {
                    leadId: lead.id,
                    company: lead.company,
                    domain: updatedLead.domain
                  }
                });
              }
            } else {
              // Domain invalid or parked
              await supabase.from("leads").update({
                match_score: validationData?.is_parked ? 25 : 0,
                match_score_source: validationData?.is_parked ? "parked_domain" : "invalid_domain"
              }).eq("id", lead.id);
            }
          } else {
            // No domain found - search socials
            setPipelineProgress(prev => ({ ...prev, currentStep: 'Searching Socials...' }));
            await Promise.all([
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

            setPipelineProgress(prev => ({ ...prev, currentStep: 'Calculating Score...' }));
            await supabase.functions.invoke("calculate-match-score", {
              body: { leadId: lead.id }
            });

            setPipelineProgress(prev => ({ ...prev, currentStep: 'Diagnosing...' }));
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
          }

          // Wait for contact enrichment to complete
          await contactEnrichmentPromise;

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
    
    // Check if lead has validated socials
    const hasValidatedSocials = (lead.facebook && lead.facebook_validated) || 
                                 (lead.linkedin && lead.linkedin_validated) || 
                                 (lead.instagram && lead.instagram_validated);
    
    // Domain filter
    if (domainFilter === 'all') return true;
    if (domainFilter === 'valid') {
      // Valid if match_score >= 50 OR has validated socials found
      return (lead.match_score !== null && lead.match_score >= 50) || hasValidatedSocials;
    }
    if (domainFilter === 'invalid') {
      // Invalid if no valid match score AND no validated socials
      return (lead.match_score === null || lead.match_score < 50) && !hasValidatedSocials;
    }
    if (domainFilter === 'not_enriched') return lead.enriched_at === null;
    if (domainFilter === 'today_enriched') {
      if (!lead.enriched_at) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const enrichedDate = new Date(lead.enriched_at);
      return enrichedDate >= today;
    }
    return true;
  });

  const handleExportCompanyCSV = () => {
    const headers = ["Company Name", "Domain", "Match Score", "City", "State", "Industry"];
    const rows = filteredLeads.map((lead) => [
      lead.company || "",
      lead.domain || "",
      lead.match_score !== null ? `${lead.match_score}%` : "",
      lead.city || "",
      lead.state || "",
      lead.company_industry || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `company-details-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredLeads.length} company details to CSV`,
    });
  };

  const handleExportContactsCSV = () => {
    const headers = ["Name", "Email", "Company", "LinkedIn", "City", "State"];
    const rows = filteredLeads.map((lead) => [
      lead.full_name || "",
      lead.email || "",
      lead.company || "",
      lead.contact_linkedin || "",
      lead.city || "",
      lead.state || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contact-details-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredLeads.length} contact details to CSV`,
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
  return <DashboardLayout activeView={activeView} onViewChange={handleViewChange}>
      {activeView === "admin" ? (
        <AdminDashboard />
      ) : activeView === "statistics" ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Lead Statistics</h2>
            <p className="text-muted-foreground">Overview of your lead enrichment status</p>
          </div>
          
          {/* Company Enrichment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Company Enrichment</h3>
            
            {/* Company Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400">Valid Domains</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.valid}</p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">
                  {stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">Invalid Domains</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.invalid}</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  {stats.total > 0 ? ((stats.invalid / stats.total) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Not Enriched</p>
                <p className="text-3xl font-bold">{stats.notEnriched}</p>
                <p className="text-xs text-muted-foreground">Awaiting enrichment</p>
              </div>
            </div>

            {/* Diagnosis Breakdown */}
            {Object.keys(stats.diagnosisCounts).length > 0 && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Leads Without Domain by Diagnosis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(stats.diagnosisCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-background rounded-lg border">
                        <span className="text-sm">{category}</span>
                        <span className="font-semibold text-lg">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact Enrichment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Contact Enrichment</h3>
            
            {/* Contact Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{stats.contactsTotal}</p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400">Valid Contacts</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.contactsValid}</p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">
                  {stats.contactsTotal > 0 ? ((stats.contactsValid / stats.contactsTotal) * 100).toFixed(1) : 0}% • High confidence (&gt;50)
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">Invalid/Not Found</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.contactsInvalid}</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  {stats.contactsTotal > 0 ? ((stats.contactsInvalid / stats.contactsTotal) * 100).toFixed(1) : 0}% of all leads
                </p>
                <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800 space-y-1">
                  <p className="text-xs text-red-600/80 dark:text-red-400/80">
                    • Low confidence: {stats.contactsLowConfidence} ({stats.contactsTotal > 0 ? ((stats.contactsLowConfidence / stats.contactsTotal) * 100).toFixed(1) : 0}%)
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80">
                    • Not found: {stats.contactsNotFound} ({stats.contactsTotal > 0 ? ((stats.contactsNotFound / stats.contactsTotal) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="p-6 border rounded-lg">
            <h3 className="font-medium mb-4">Leads by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {CATEGORIES.map(category => {
                const Icon = category.icon;
                return (
                  <div key={category.name} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="font-semibold">{categoryCounts[category.name] || 0}</span>
                  </div>
                );
              })}
            </div>
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
                  <span className="text-sm text-muted-foreground">Filter by:</span>
                  <Select value={domainFilter} onValueChange={(value: 'all' | 'valid' | 'invalid' | 'not_enriched' | 'today_enriched') => setDomainFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Domain Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Domains</SelectItem>
                      <SelectItem value="valid">Valid (≥50% Match)</SelectItem>
                      <SelectItem value="invalid">Invalid (&lt;50% Match)</SelectItem>
                      <SelectItem value="not_enriched">Not Enriched</SelectItem>
                      <SelectItem value="today_enriched">Enriched Today</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={batchFilter === 'all' ? 'all' : String(batchFilter)} 
                    onValueChange={(value) => setBatchFilter(value === 'all' ? 'all' : Number(value))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {uniqueBatches.map((batch) => (
                        <SelectItem key={batch} value={String(batch)}>
                          Batch {batch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredLeads.length} of {categoryFilteredLeads.length} leads
                </span>
              </div>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'company' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0"
                    onClick={() => setViewMode('company')}
                  >
                    Company
                  </Button>
                  <Button
                    variant={viewMode === 'contact' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0 border-x"
                    onClick={() => setViewMode('contact')}
                  >
                    Contact
                  </Button>
                  <Button
                    variant={viewMode === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0"
                    onClick={() => setViewMode('all')}
                  >
                    View All
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCompanyCSV}>Export Company Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportContactsCSV}>Export Contact Details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkEnrichmentModalOpen(true)}
                  disabled={bulkEnriching || bulkScoring || bulkFindingContacts || bulkEvaluatingMatches || bulkFindingSocials || bulkRunningPipeline || filteredLeads.length === 0}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Bulk Enrichment
                </Button>
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
            <LeadsTable leads={filteredLeads} onEnrichComplete={fetchLeads} hideFilterBar domainFilter={domainFilter} onDomainFilterChange={setDomainFilter} viewMode={viewMode} />
          </div> : <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Select a Category</h2>
              <p className="text-muted-foreground">Choose a category to view and manage leads</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {CATEGORIES.map(category => {
          const Icon = category.icon;
          const count = categoryCounts[category.name] || 0;
          return <div key={category.name} className="relative group">
                    <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 hover:bg-accent hover:border-primary transition-all" onClick={() => handleCategorySelect(category.name)}>
                      <Icon className="h-8 w-8 text-primary" />
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm text-muted-foreground">{count} leads</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleOpenRolesDialog(e, category.name)}
                    >
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>;
        })}
            </div>
          </div> : <LeadUpload onUploadComplete={handleUploadComplete} />}

      <CategoryRolesDialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        category={rolesDialogCategory}
      />
    </DashboardLayout>;
};
export default Index;