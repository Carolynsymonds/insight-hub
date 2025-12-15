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

    let matchScore: number;
    let matchScoreSource: string;

    // Step 1: Check if email domain is verified (using effective source)
    if (effectiveSource === 'email_domain_verified') {
      matchScore = 99;
      matchScoreSource = 'email_domain';
      console.log('Step 1 applied: Email domain verified - 99%');
    }
    // Step 2: Check if domain from Google Knowledge Graph with high confidence
    // Requires confidence >= 25 (Step 1a/1b at 100%, Step 2a/2b at 25%)
    else if (effectiveSource === 'google_knowledge_graph' && effectiveConfidence >= 25) {
      matchScore = 95;
      matchScoreSource = 'google_knowledge_graph';
      console.log(`Step 2 applied: Google Knowledge Graph (confidence ${effectiveConfidence}%) - 95%`);
    }
    // Step 2b: Check if email domain verified had high confidence in logs
    else if (bestEnrichment.source === 'email_domain_verified' && bestEnrichment.confidence >= 90) {
      matchScore = 99;
      matchScoreSource = 'email_domain';
      console.log(`Step 2b applied: Email domain verified from logs (confidence ${bestEnrichment.confidence}%) - 99%`);
    }
    // Step 3: Equal-weighted calculation (50% each: distance, domain)
    else {
      console.log('Step 3: Calculating with equal weights (distance, domain)');
      
      // Get distance in miles (default to high distance if not available)
      const distanceMiles = lead.distance_miles ?? 999;
      
      // Convert distance to a score based on ranges:
      // < 50 miles = High confidence → Score 60-70
      // 50-100 miles = Medium confidence → Score 20-60
      // > 100 miles = Low confidence → Score 0-20
      let distanceScore: number;
      if (distanceMiles <= 0) {
        distanceScore = 70; // Perfect distance = top of high range
      } else if (distanceMiles < 50) {
        // High confidence range: 60-70
        // 0mi → 70, 50mi → 60 (linear interpolation)
        distanceScore = 70 - (distanceMiles * 0.2);
      } else if (distanceMiles <= 100) {
        // Medium confidence range: 20-60
        // 50mi → 60, 100mi → 20 (linear interpolation)
        distanceScore = 60 - ((distanceMiles - 50) * 0.8);
      } else {
        // Low confidence range: 0-20
        // 100mi → 20, 200mi+ → 0 (linear decay)
        distanceScore = Math.max(0, 20 - ((distanceMiles - 100) * 0.2));
      }
      
      // Get domain relevance score (0-100)
      const domainScore = lead.domain_relevance_score || 0;
      
      // Equal weights: 50% each
      matchScore = Math.round((distanceScore + domainScore) / 2);
      
      matchScoreSource = 'calculated';
      console.log(`Step 3 inputs: Distance=${distanceMiles}mi → ${distanceScore.toFixed(1)}, Domain=${domainScore}`);
      console.log(`Step 3 calculation: (${distanceScore.toFixed(1)} + ${domainScore}) / 2 = ${matchScore}`);
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
