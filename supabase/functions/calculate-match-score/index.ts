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
      .select('enrichment_source, distance_miles, domain_relevance_score, industry_relevance_score, vehicle_tracking_interest_score')
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
    // Step 2: Check if domain from Google Knowledge Graph
    else if (lead.enrichment_source === 'google_knowledge_graph') {
      matchScore = 95;
      matchScoreSource = 'google_knowledge_graph';
      console.log('Step 2 applied: Google Knowledge Graph - 95%');
    }
    // Step 3: Distance-based tiers + weighted relevance
    else {
      console.log('Step 3: Calculating with distance-based tiers + weighted relevance');
      
      // Get distance in miles (default to high distance if not available)
      const distanceMiles = lead.distance_miles ?? 999;
      
      // Determine confidence tier and score range based on distance
      let minScore: number;
      let maxScore: number;
      let confidenceTier: string;
      
      if (distanceMiles < 20) {
        minScore = 60;
        maxScore = 70;
        confidenceTier = 'high';
      } else if (distanceMiles <= 60) {
        minScore = 20;
        maxScore = 60;
        confidenceTier = 'medium';
      } else {
        minScore = 0;
        maxScore = 20;
        confidenceTier = 'low';
      }
      
      // Get relevance scores (0-100)
      const domainScore = lead.domain_relevance_score || 0;
      const industryScore = lead.industry_relevance_score || 0;
      const vehicleTrackingScore = lead.vehicle_tracking_interest_score || 0;
      
      // Calculate weighted relevance: R = 0.5*D + 0.3*I + 0.2*V
      const R = (0.5 * domainScore) + (0.3 * industryScore) + (0.2 * vehicleTrackingScore);
      
      // Normalize to 0-1
      const r = R / 100;
      
      // Map relevance into the score range: Score = MIN + (RANGE * r)
      const range = maxScore - minScore;
      matchScore = Math.round(minScore + (range * r));
      
      matchScoreSource = 'calculated';
      console.log(`Step 3 result: Distance=${distanceMiles}mi (${confidenceTier}), Range=[${minScore}-${maxScore}]`);
      console.log(`Step 3 relevance: Domain=${domainScore}*0.5, Industry=${industryScore}*0.3, VTI=${vehicleTrackingScore}*0.2 = R:${R.toFixed(1)}, r:${r.toFixed(2)}`);
      console.log(`Step 3 final: ${minScore} + (${range} * ${r.toFixed(2)}) = ${matchScore}`);
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