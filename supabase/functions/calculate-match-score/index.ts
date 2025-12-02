import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch the lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('enrichment_source, enrichment_confidence, distance_miles, domain_relevance_score, industry_relevance_score')
      .eq('id', leadId)
      .single();

    if (fetchError) {
      console.error('Error fetching lead:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let matchScore: number;
    let matchScoreSource: string;

    // Step 1: Check if email domain is verified
    if (lead.enrichment_source === 'email_domain_verified') {
      matchScore = 99;
      matchScoreSource = 'email_domain';
      console.log('Step 1 applied: Email domain verified - 99%');
    }
    // Step 2: Check if domain from Google Knowledge Graph (only for high-confidence filtered searches)
    // Requires confidence >= 25 (Step 1a/1b at 100%, Step 2a/2b at 25%)
    // Unfiltered searches (Step 2c at 20%, Step 3c at 8%, etc.) fall through to distance-based calculation
    else if (lead.enrichment_source === 'google_knowledge_graph' && (lead.enrichment_confidence ?? 0) >= 25) {
      matchScore = 95;
      matchScoreSource = 'google_knowledge_graph';
      console.log(`Step 2 applied: Google Knowledge Graph (confidence ${lead.enrichment_confidence}%) - 95%`);
    }
    // Step 3: Equal-weighted calculation (33.33% each: distance, domain, industry)
    else {
      console.log('Step 3: Calculating with equal weights (distance, domain, industry)');
      
      // Get distance in miles (default to high distance if not available)
      const distanceMiles = lead.distance_miles ?? 999;
      
      // Convert distance to a 0-100 score (closer = higher score)
      let distanceScore: number;
      if (distanceMiles <= 0) {
        distanceScore = 100;
      } else if (distanceMiles < 20) {
        // 100 at 0mi → 70 at 20mi (linear)
        distanceScore = 100 - (distanceMiles * 1.5);
      } else if (distanceMiles <= 60) {
        // 70 at 20mi → 30 at 60mi (linear)
        distanceScore = 70 - ((distanceMiles - 20) * 1);
      } else if (distanceMiles <= 100) {
        // 30 at 60mi → 0 at 100mi (linear)
        distanceScore = 30 - ((distanceMiles - 60) * 0.75);
      } else {
        distanceScore = 0;
      }
      
      // Get relevance scores (0-100)
      const domainScore = lead.domain_relevance_score || 0;
      const industryScore = lead.industry_relevance_score || 0;
      
      // Equal weights: 33.33% each
      const combinedScore = (distanceScore + domainScore + industryScore) / 3;
      
      // Scale to 0-70 range (keeping headroom for email/KG verified leads at 95-99)
      matchScore = Math.round(combinedScore * 0.7);
      
      matchScoreSource = 'calculated';
      console.log(`Step 3 inputs: Distance=${distanceMiles}mi → ${distanceScore.toFixed(1)}, Domain=${domainScore}, Industry=${industryScore}`);
      console.log(`Step 3 calculation: (${distanceScore.toFixed(1)} + ${domainScore} + ${industryScore}) / 3 = ${combinedScore.toFixed(1)}`);
      console.log(`Step 3 final: ${combinedScore.toFixed(1)} * 0.7 = ${matchScore}`);
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