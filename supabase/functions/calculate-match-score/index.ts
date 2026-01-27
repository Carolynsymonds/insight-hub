import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentLogEntry {
  source?: string;
  step?: string;
  query?: string;
  domain?: string;
  confidence?: number;
  timestamp?: string;
  [key: string]: unknown;
}

// Helper function to calculate score from distance and domain signals
function calculateFromSignals(distanceMiles: number, domainScore: number): number {
  // Convert distance to a score based on ranges:
  // < 50 miles = High confidence → Score 60-70
  // 50-100 miles = Medium confidence → Score 20-60
  // > 100 miles = Low confidence → Score 0-20
  let distanceScore: number;
  if (distanceMiles <= 0) {
    distanceScore = 70; // Perfect distance = top of high range
  } else if (distanceMiles < 50) {
    // High confidence range: 60-70
    distanceScore = 70 - (distanceMiles * 0.2);
  } else if (distanceMiles <= 100) {
    // Medium confidence range: 20-60
    distanceScore = 60 - ((distanceMiles - 50) * 0.8);
  } else {
    // Low confidence range: 0-20
    distanceScore = Math.max(0, 20 - ((distanceMiles - 100) * 0.2));
  }
  
  // Equal weights: 50% each
  return Math.round((distanceScore + domainScore) / 2);
}

// Find the best enrichment from logs (highest confidence that found a domain)
function findBestEnrichment(logs: EnrichmentLogEntry[] | null): { source: string | null; confidence: number } {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return { source: null, confidence: 0 };
  }

  let bestSource: string | null = null;
  let bestConfidence = 0;

  for (const log of logs) {
    // Check if this log entry found a domain and has confidence
    if (log.domain && log.confidence && log.confidence > bestConfidence) {
      bestConfidence = log.confidence;
      bestSource = log.source || null;
    }
  }

  console.log(`Best enrichment from logs: source=${bestSource}, confidence=${bestConfidence}%`);
  return { source: bestSource, confidence: bestConfidence };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculate match score request for leadId: ${leadId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the lead including enrichment_logs
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('enrichment_source, enrichment_confidence, enrichment_logs, distance_miles, domain_relevance_score, email_domain_validated')
      .eq('id', leadId)
      .single();

    if (fetchError) {
      console.error('Error fetching lead:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the best enrichment from logs
    const bestEnrichment = findBestEnrichment(lead.enrichment_logs as EnrichmentLogEntry[] | null);
    
    // Use best enrichment if it's better than current
    const effectiveSource = bestEnrichment.confidence > (lead.enrichment_confidence ?? 0) 
      ? bestEnrichment.source 
      : lead.enrichment_source;
    const effectiveConfidence = Math.max(bestEnrichment.confidence, lead.enrichment_confidence ?? 0);

    console.log(`Effective enrichment: source=${effectiveSource}, confidence=${effectiveConfidence}% (current: ${lead.enrichment_source}/${lead.enrichment_confidence}%, best from logs: ${bestEnrichment.source}/${bestEnrichment.confidence}%)`);

    // Get quality signals for quality gate checks
    const distanceMiles = lead.distance_miles ?? 999;
    const domainScore = lead.domain_relevance_score ?? 0;
    
    // Quality gate thresholds
    const distanceIsReasonable = distanceMiles < 100; // Under 100 miles
    const domainRelevanceIsReasonable = domainScore >= 30; // At least 30/100

    let matchScore: number;
    let matchScoreSource: string;

    // Step 1: Check if email domain is verified (using effective source)
    // BUT only give 99% if quality signals are good
    if (effectiveSource === 'email_domain_verified') {
      if (distanceIsReasonable && domainRelevanceIsReasonable) {
        // Both signals support the match - give full 99%
        matchScore = 99;
        matchScoreSource = 'email_domain';
        console.log(`Step 1a applied: Email domain verified with good quality signals (distance=${distanceMiles}mi, relevance=${domainScore}) - 99%`);
      } else if (distanceIsReasonable || domainRelevanceIsReasonable) {
        // One signal is bad - give moderate boost (70-85%)
        const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
        matchScore = Math.max(baseCalculated, 70);
        matchScore = Math.min(matchScore, 85);
        matchScoreSource = 'email_domain_partial';
        console.log(`Step 1b applied: Email domain with partial quality (distance=${distanceMiles}mi, relevance=${domainScore}, base=${baseCalculated}) - ${matchScore}%`);
      } else {
        // Both signals are bad - use calculated score, but with small email bonus
        const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
        matchScore = Math.min(baseCalculated + 10, 60);
        matchScoreSource = 'email_domain_low_quality';
        console.log(`Step 1c applied: Email domain with poor quality (distance=${distanceMiles}mi, relevance=${domainScore}, base=${baseCalculated}) - ${matchScore}%`);
      }
    }
    // Step 2: Check if domain from Google Knowledge Graph with high confidence
    // Also apply quality gate here
    else if (effectiveSource === 'google_knowledge_graph' && effectiveConfidence >= 25) {
      if (distanceIsReasonable && domainRelevanceIsReasonable) {
        // Both signals support the match - give full 95%
        matchScore = 95;
        matchScoreSource = 'google_knowledge_graph';
        console.log(`Step 2a applied: Google Knowledge Graph with good quality signals (confidence=${effectiveConfidence}%, distance=${distanceMiles}mi, relevance=${domainScore}) - 95%`);
      } else if (distanceIsReasonable || domainRelevanceIsReasonable) {
        // One signal is bad - give moderate boost (65-80%)
        const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
        matchScore = Math.max(baseCalculated, 65);
        matchScore = Math.min(matchScore, 80);
        matchScoreSource = 'google_kg_partial';
        console.log(`Step 2b applied: Google KG with partial quality (distance=${distanceMiles}mi, relevance=${domainScore}, base=${baseCalculated}) - ${matchScore}%`);
      } else {
        // Both signals are bad - use calculated score with small bonus
        const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
        matchScore = Math.min(baseCalculated + 5, 55);
        matchScoreSource = 'google_kg_low_quality';
        console.log(`Step 2c applied: Google KG with poor quality (distance=${distanceMiles}mi, relevance=${domainScore}, base=${baseCalculated}) - ${matchScore}%`);
      }
    }
    // Step 2b: Check if email domain verified had high confidence in logs
    else if (bestEnrichment.source === 'email_domain_verified' && bestEnrichment.confidence >= 90) {
      if (distanceIsReasonable && domainRelevanceIsReasonable) {
        matchScore = 99;
        matchScoreSource = 'email_domain';
        console.log(`Step 2b-alt applied: Email domain verified from logs with good quality (confidence=${bestEnrichment.confidence}%) - 99%`);
      } else if (distanceIsReasonable || domainRelevanceIsReasonable) {
        const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
        matchScore = Math.max(baseCalculated, 70);
        matchScore = Math.min(matchScore, 85);
        matchScoreSource = 'email_domain_partial';
        console.log(`Step 2b-alt applied: Email domain from logs with partial quality - ${matchScore}%`);
      } else {
        const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
        matchScore = Math.min(baseCalculated + 10, 60);
        matchScoreSource = 'email_domain_low_quality';
        console.log(`Step 2b-alt applied: Email domain from logs with poor quality - ${matchScore}%`);
      }
    }
    // Step 3: Equal-weighted calculation (50% each: distance, domain)
    else {
      console.log('Step 3: Calculating with equal weights (distance, domain)');
      
      matchScore = calculateFromSignals(distanceMiles, domainScore);
      matchScoreSource = 'calculated';
      
      console.log(`Step 3 inputs: Distance=${distanceMiles}mi, Domain=${domainScore}`);
      console.log(`Step 3 result: ${matchScore}%`);
    }

    // Update the lead with match score
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        match_score: matchScore,
        match_score_source: matchScoreSource
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Match score calculated: ${matchScore}% (source: ${matchScoreSource})`);

    return new Response(
      JSON.stringify({
        success: true,
        matchScore,
        matchScoreSource
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-match-score:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
