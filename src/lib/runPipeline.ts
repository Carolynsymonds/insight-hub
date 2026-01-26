import { supabase } from "@/integrations/supabase/client";
import { attemptDomainFallback } from "./domainFallback";

interface Lead {
  id: string;
  company: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  email: string | null;
  full_name: string | null;
  domain: string | null;
  mics_sector: string | null;
  mics_subsector: string | null;
  mics_segment: string | null;
  dma: string | null;
  category: string | null;
}

interface PipelineCallbacks {
  setPipelineStep?: (step: string | null) => void;
  setPipelineCompleted?: (value: { domainValidated: boolean; socialsSearched: boolean } | ((prev: { domainValidated: boolean; socialsSearched: boolean }) => { domainValidated: boolean; socialsSearched: boolean })) => void;
  setEnrichContactSteps?: (steps: any) => void;
  setEnrichedContactResult?: (result: any) => void;
  setPipelineDuration?: (value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  onEnrichComplete?: () => void;
  toast?: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  validateAndSaveDomain?: (
    leadId: string,
    domain: string,
    sourceUrl?: string,
    confidence?: number,
    currentLogs?: any[]
  ) => Promise<{ success: boolean; data?: any; error?: any }>;
}

export const runPipelineForLead = async (
  lead: Lead,
  callbacks: PipelineCallbacks = {}
) => {
  const {
    setPipelineStep,
    setPipelineCompleted,
    setEnrichContactSteps,
    setEnrichedContactResult,
    setPipelineDuration,
    onEnrichComplete,
    toast,
    validateAndSaveDomain
  } = callbacks;

  const startTime = Date.now();
  
  const updateStep = (step: string | null) => {
    if (setPipelineStep) setPipelineStep(step);
  };

  const updateCompleted = (updater: { domainValidated: boolean; socialsSearched: boolean } | ((prev: { domainValidated: boolean; socialsSearched: boolean }) => { domainValidated: boolean; socialsSearched: boolean })) => {
    if (setPipelineCompleted) {
      if (typeof updater === 'function') {
        setPipelineCompleted(updater);
      } else {
        setPipelineCompleted(updater);
      }
    }
  };

  const showToast = (options: { title: string; description: string; variant?: "default" | "destructive" }) => {
    if (toast) toast(options);
  };

  try {
    updateStep('Running Pipeline...');
    updateCompleted({ domainValidated: false, socialsSearched: false });

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
        if (data?.steps && setEnrichContactSteps) {
          setEnrichContactSteps(data.steps);
        }
        if (data?.enrichedContact && setEnrichedContactResult) {
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
    updateStep('Finding Domain...');
    
    // Apollo
    console.log('[Pipeline] Calling enrich-lead with Apollo source');
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
    
    // Check domain after Apollo
    const { data: afterApollo } = await supabase
      .from("leads")
      .select("domain, enrichment_confidence, enrichment_source, enrichment_logs")
      .eq("id", lead.id)
      .single();
    console.log('[Pipeline] After Apollo - domain:', afterApollo?.domain, 'confidence:', afterApollo?.enrichment_confidence, 'source:', afterApollo?.enrichment_source);

    // Google
    console.log('[Pipeline] Calling enrich-lead with Google source');
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
    
    // Check domain after Google
    const { data: afterGoogle } = await supabase
      .from("leads")
      .select("domain, enrichment_confidence, enrichment_source, enrichment_logs")
      .eq("id", lead.id)
      .single();
    console.log('[Pipeline] After Google - domain:', afterGoogle?.domain, 'confidence:', afterGoogle?.enrichment_confidence, 'source:', afterGoogle?.enrichment_source);

    // Email (if exists and not a personal email domain)
    if (lead.email) {
      const emailDomain = lead.email.split('@')[1]?.toLowerCase();
      const PERSONAL_EMAIL_DOMAINS = [
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", 
        "msn.com", "aol.com", "icloud.com", "me.com", "mac.com", "mail.com",
        "protonmail.com", "zoho.com", "yandex.com", "gmx.com", "fastmail.com"
      ];
      
      // Skip email enrichment if it's a personal email domain (won't find company domain anyway)
      if (emailDomain && PERSONAL_EMAIL_DOMAINS.includes(emailDomain)) {
        console.log('[Pipeline] Skipping email enrichment - personal email domain detected:', emailDomain);
      } else {
        console.log('[Pipeline] Calling enrich-lead with Email source');
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
        
        // Check domain after Email
        const { data: afterEmail } = await supabase
          .from("leads")
          .select("domain, enrichment_confidence, enrichment_source, enrichment_logs")
          .eq("id", lead.id)
          .single();
        console.log('[Pipeline] After Email - domain:', afterEmail?.domain, 'confidence:', afterEmail?.enrichment_confidence, 'source:', afterEmail?.enrichment_source);
      }
    }

    // Refetch lead to check if domain was found
    const { data: updatedLead } = await supabase
      .from("leads")
      .select("domain, enrichment_logs, source_url, enrichment_confidence, enrichment_source")
      .eq("id", lead.id)
      .single();

    const domainFound = !!updatedLead?.domain;
    let matchScore = null;

    console.log('[Pipeline] Final check - domainFound:', domainFound, 'domain:', updatedLead?.domain, 'confidence:', updatedLead?.enrichment_confidence, 'source:', updatedLead?.enrichment_source);
    
    // Log enrichment logs to see if domain is in logs but not saved
    if (!domainFound && updatedLead?.enrichment_logs) {
      const logs = updatedLead.enrichment_logs as any[];
      const domainLogs = logs.filter(log => log.domain && (log.source === 'apollo_api' || log.source === 'google_search' || log.source === 'email_domain'));
      console.log('[Pipeline] Domain found in logs but not saved:', domainLogs);
    }

    if (domainFound) {
      // Step 1.5: Enrich with Clay (non-blocking)
      updateStep('Enriching with Clay...');
      
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
      updateStep('Validating Domain...');
      
      const currentLogs = Array.isArray(updatedLead?.enrichment_logs) ? updatedLead.enrichment_logs : [];
      
      let validationData;
      if (validateAndSaveDomain) {
        const validationResult = await validateAndSaveDomain(
          lead.id,
          updatedLead.domain,
          updatedLead.source_url,
          undefined,
          currentLogs
        );
        validationData = validationResult.data;
        if (validationResult.success) {
          updateCompleted(prev => ({ ...prev, domainValidated: true }));
        }
        
        // Show toast with domain validation result (always show, success or failure)
        showToast({
          title: !validationResult.success 
            ? "Domain Invalid"
            : validationData?.is_parked 
              ? "Domain Parked/For Sale" 
              : (validationData?.is_valid_domain ? "Domain Valid" : "Domain Invalid"),
          description: validationData?.reason || (!validationResult.success || !validationData?.is_valid_domain ? "Domain validation failed" : "Domain validated successfully"),
          variant: (!validationResult.success || (!validationData?.is_valid_domain && !validationData?.is_parked)) ? "destructive" : "default"
        });
      } else {
        // Fallback if validateAndSaveDomain not provided
        const { data: validationDataResult } = await supabase.functions.invoke("validate-domain", {
          body: { domain: updatedLead.domain }
        });
        validationData = validationDataResult;
      }

      // Refresh so the VALID/INVALID/PARKED badge appears immediately while pipeline continues
      if (onEnrichComplete) onEnrichComplete();
      
      // Track the current working domain (may change after fallback)
      let workingDomain = updatedLead.domain;
      let workingValidationData = validationData;
      
      // If domain is parked or invalid, attempt to find a valid alternative
      if (validationData?.is_parked || !validationData?.is_valid_domain) {
        updateStep('Finding Alternative Domain...');
        
        // Refetch logs to get the latest (including validation log just added)
        const { data: leadWithLogs } = await supabase
          .from("leads")
          .select("enrichment_logs")
          .eq("id", lead.id)
          .single();
        
        const latestLogs = Array.isArray(leadWithLogs?.enrichment_logs) ? leadWithLogs.enrichment_logs : [];
        
        const fallbackResult = await attemptDomainFallback(
          lead.id,
          updatedLead.domain,
          latestLogs
        );
        
        if (fallbackResult.success && fallbackResult.fallbackDomain) {
          // Successfully found a valid alternative domain
          workingDomain = fallbackResult.fallbackDomain;
          workingValidationData = fallbackResult.validationData;
          
          showToast({
            title: "Alternative Domain Found",
            description: `Switched from parked domain to ${fallbackResult.fallbackDomain} (${fallbackResult.fallbackConfidence}% confidence from ${fallbackResult.fallbackSource})`
          });
          
          // Refresh UI to show the new domain
          if (onEnrichComplete) onEnrichComplete();
        } else {
          // No valid alternative found - keep the parked/invalid domain and set score
          await supabase.from("leads").update({
            match_score: validationData?.is_parked ? 25 : 0,
            match_score_source: validationData?.is_parked ? "parked_domain" : "invalid_domain"
          }).eq("id", lead.id);
          matchScore = validationData?.is_parked ? 25 : 0;
          
          showToast({
            title: "No Valid Alternative Found",
            description: `Primary domain is ${validationData?.is_parked ? 'parked' : 'invalid'} and no valid alternatives exist in enrichment logs.`,
            variant: "destructive"
          });
        }
      }
      
      // Only continue with scoring if domain is valid and not parked
      if (workingValidationData?.is_valid_domain && !workingValidationData?.is_parked) {
        // Step 3: Find Coordinates
        updateStep('Finding Coordinates...');
        await supabase.functions.invoke("find-company-coordinates", {
          body: {
            leadId: lead.id,
            domain: workingDomain,
            sourceUrl: workingDomain
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
          updateStep('Calculating Distance...');
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
        updateStep('Scoring Domain Relevance...');
        await supabase.functions.invoke("score-domain-relevance", {
          body: {
            leadId: lead.id,
            companyName: lead.company,
            domain: workingDomain,
            city: lead.city,
            state: lead.state,
            dma: lead.dma
          }
        });

        // Step 6: Calculate Match Score
        updateStep('Calculating Match Score...');
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
      }
    }

    // ALWAYS: Run social searches in parallel
    updateStep('Searching Socials...');
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
    updateCompleted(prev => ({ ...prev, socialsSearched: true }));

    // ALWAYS: Validate socials in parallel after searches
    updateStep('Validating Socials...');
    const { data: leadWithSocials } = await supabase
      .from("leads")
      .select("enrichment_logs, facebook, instagram, linkedin")
      .eq("id", lead.id)
      .single();

    // Extract organic results from enrichment logs
    const enrichmentLogs = (leadWithSocials?.enrichment_logs as unknown as any[]) || [];
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

      updateStep('Enriching Company...');
      await supabase.functions.invoke("enrich-company-details", {
        body: {
          leadId: lead.id,
          domain: updatedLead.domain,
          enrichmentSource: leadWithScore?.enrichment_source,
          apolloNotFound: leadWithScore?.apollo_not_found
        }
      });

      updateStep('Finding Contacts...');
      await supabase.functions.invoke("find-company-contacts", {
        body: {
          leadId: lead.id,
          domain: updatedLead.domain,
          category: lead.category,
          userId: user?.id
        }
      });

      updateStep('Getting News...');
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
      if (setPipelineDuration) {
        setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));
      }

      showToast({
        title: "Full Pipeline Complete",
        description: `Enriched ${updatedLead.domain} (Score: ${matchScore})`
      });
    } else if (!domainFound) {
      // If no domain: Score → Diagnose
      updateStep('Calculating Score...');
      await supabase.functions.invoke("calculate-match-score", {
        body: { leadId: lead.id }
      });

      updateStep('Diagnosing...');
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
      if (setPipelineDuration) {
        setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));
      }

      showToast({
        title: "Pipeline Complete",
        description: "No domain found. Socials searched, validated, score calculated & AI diagnosis generated."
      });
    } else {
      // Domain found but score <= 50 - just wait for contact enrichment
      await contactEnrichmentPromise;

      const duration = (Date.now() - startTime) / 1000;
      if (setPipelineDuration) {
        setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));
      }

      showToast({
        title: "Pipeline Complete",
        description: `Domain found (Score: ${matchScore}). Socials searched and validated.`
      });
    }

    if (onEnrichComplete) onEnrichComplete();
  } catch (error: any) {
    showToast({
      title: "Pipeline Failed",
      description: error.message,
      variant: "destructive"
    });
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    if (setPipelineDuration) {
      setPipelineDuration(prev => ({ ...prev, [lead.id]: duration }));
    }
    updateStep(null);
  }
};

