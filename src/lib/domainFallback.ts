import { supabase } from "@/integrations/supabase/client";

interface EnrichmentLog {
  domain?: string;
  confidence?: number;
  source?: string;
  timestamp?: string;
  step?: string;
  is_valid?: boolean;
  is_parked?: boolean;
  [key: string]: any;
}

interface FallbackResult {
  success: boolean;
  fallbackDomain?: string;
  fallbackSource?: string;
  fallbackConfidence?: number;
  validationData?: any;
  allTriedDomains?: string[];
}

/**
 * Attempts to find and validate an alternative domain from enrichment logs
 * when the primary domain is parked or invalid.
 * 
 * @param leadId - The lead ID to update
 * @param currentDomain - The current (parked/invalid) domain
 * @param enrichmentLogs - The enrichment logs containing alternative domains
 * @param triedDomains - Domains already tried (to prevent circular fallback)
 * @returns FallbackResult with success status and new domain info if found
 */
export const attemptDomainFallback = async (
  leadId: string,
  currentDomain: string,
  enrichmentLogs: any[], // Accept any[] to handle Json type from Supabase
  triedDomains: string[] = []
): Promise<FallbackResult> => {
  console.log('[DomainFallback] Starting fallback for lead:', leadId, 'current domain:', currentDomain);
  
  // Track all domains we've tried (including current)
  const allTriedDomains = [...triedDomains, currentDomain];
  
  // Find alternative domains from enrichment logs
  // Look for logs that have a domain field and aren't the current domain
  const alternativeDomains = enrichmentLogs
    .filter((log: EnrichmentLog) => {
      const domain = log.domain;
      // Must have a domain
      if (!domain) return false;
      // Must not be the current domain
      if (domain === currentDomain) return false;
      // Must not have been tried before
      if (allTriedDomains.includes(domain)) return false;
      // Skip validation logs (they don't represent found domains)
      if (log.step === 'validate_domain') return false;
      return true;
    })
    .map((log: EnrichmentLog) => ({
      domain: log.domain!,
      confidence: log.confidence || 0,
      source: log.source || 'unknown'
    }))
    // Remove duplicates by domain
    .filter((item, index, self) => 
      index === self.findIndex(t => t.domain === item.domain)
    )
    // Sort by confidence descending
    .sort((a, b) => b.confidence - a.confidence);
  
  console.log('[DomainFallback] Found alternatives:', alternativeDomains);
  
  if (alternativeDomains.length === 0) {
    console.log('[DomainFallback] No alternative domains found');
    return { 
      success: false, 
      allTriedDomains 
    };
  }
  
  // Try each alternative domain in order of confidence
  for (const alternative of alternativeDomains) {
    console.log('[DomainFallback] Trying alternative:', alternative.domain, 'confidence:', alternative.confidence);
    
    try {
      // Validate the alternative domain
      const { data: validationData, error: validationError } = await supabase.functions.invoke("validate-domain", {
        body: { domain: alternative.domain }
      });
      
      if (validationError) {
        console.error('[DomainFallback] Validation error for', alternative.domain, validationError);
        allTriedDomains.push(alternative.domain);
        continue;
      }
      
      console.log('[DomainFallback] Validation result for', alternative.domain, ':', validationData);
      
      // Check if this alternative is valid (not parked and valid)
      if (validationData.is_valid_domain && !validationData.is_parked) {
        console.log('[DomainFallback] Found valid alternative:', alternative.domain);
        
        // Create fallback log entry
        const fallbackLog = {
          step: 'domain_fallback',
          action: 'domain_fallback',
          original_domain: currentDomain,
          new_domain: alternative.domain,
          new_confidence: alternative.confidence,
          new_source: alternative.source,
          reason: `Primary domain "${currentDomain}" was parked/invalid. Falling back to "${alternative.domain}" from ${alternative.source} with ${alternative.confidence}% confidence.`,
          validation_result: validationData,
          timestamp: new Date().toISOString()
        };
        
        // Create validation log for the new domain
        const validationLog = {
          step: 'validate_domain',
          domain: alternative.domain,
          is_valid: validationData.is_valid_domain,
          is_parked: validationData.is_parked,
          reason: validationData.reason,
          http_status: validationData.http_status,
          timestamp: new Date().toISOString()
        };
        
        // Update the lead with the new domain
        const updatedLogs = [...enrichmentLogs, fallbackLog, validationLog];
        
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            domain: alternative.domain,
            source_url: alternative.domain,
            enrichment_source: alternative.source,
            enrichment_confidence: alternative.confidence,
            email_domain_validated: true,
            match_score: null, // Reset to be recalculated
            match_score_source: null,
            enrichment_logs: updatedLogs
          })
          .eq("id", leadId);
        
        if (updateError) {
          console.error('[DomainFallback] Update error:', updateError);
          return { 
            success: false, 
            allTriedDomains 
          };
        }
        
        return {
          success: true,
          fallbackDomain: alternative.domain,
          fallbackSource: alternative.source,
          fallbackConfidence: alternative.confidence,
          validationData,
          allTriedDomains
        };
      } else {
        // This alternative is also parked/invalid, try next one
        console.log('[DomainFallback] Alternative', alternative.domain, 'is also parked/invalid');
        allTriedDomains.push(alternative.domain);
        
        // Log that we tried this domain
        const attemptLog = {
          step: 'domain_fallback_attempt',
          action: 'domain_fallback_attempt',
          domain: alternative.domain,
          confidence: alternative.confidence,
          source: alternative.source,
          validation_result: validationData,
          reason: `Tried "${alternative.domain}" as fallback but it was ${validationData.is_parked ? 'parked' : 'invalid'}`,
          timestamp: new Date().toISOString()
        };
        enrichmentLogs.push(attemptLog);
      }
    } catch (err) {
      console.error('[DomainFallback] Error validating', alternative.domain, err);
      allTriedDomains.push(alternative.domain);
    }
  }
  
  // No valid alternative found
  console.log('[DomainFallback] No valid alternative found after trying all options');
  
  // Update the enrichment logs to include fallback attempt info
  const noFallbackLog = {
    step: 'domain_fallback_exhausted',
    action: 'domain_fallback_exhausted',
    original_domain: currentDomain,
    tried_domains: allTriedDomains,
    reason: `No valid alternative domain found. Tried ${allTriedDomains.length} domains, all were parked or invalid.`,
    timestamp: new Date().toISOString()
  };
  
  await supabase
    .from("leads")
    .update({
      enrichment_logs: [...enrichmentLogs, noFallbackLog]
    })
    .eq("id", leadId);
  
  return { 
    success: false, 
    allTriedDomains 
  };
};
