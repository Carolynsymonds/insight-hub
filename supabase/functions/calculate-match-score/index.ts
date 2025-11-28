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
      .select('enrichment_source, distance_confidence, domain_relevance_score')
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
    // Step 3: Calculate from Distance + Domain Relevance
    else {
      console.log('Step 3: Calculating from Distance + Domain Relevance');
      
      // Convert distance confidence to numeric
      let distanceScore = 0;
      if (lead.distance_confidence === 'high') {
        distanceScore = 95;
      } else if (lead.distance_confidence === 'medium') {
        distanceScore = 70;
      } else if (lead.distance_confidence === 'low') {
        distanceScore = 40;
      }

      // Get domain relevance score (0-100)
      const domainScore = lead.domain_relevance_score || 0;

      // Calculate average
      if (distanceScore > 0 && domainScore > 0) {
        matchScore = Math.round((distanceScore + domainScore) / 2);
      } else if (distanceScore > 0) {
        matchScore = distanceScore;
      } else if (domainScore > 0) {
        matchScore = domainScore;
      } else {
        matchScore = 0;
      }

      matchScoreSource = 'calculated';
      console.log(`Step 3 result: Distance=${distanceScore}, Domain=${domainScore}, Average=${matchScore}`);
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