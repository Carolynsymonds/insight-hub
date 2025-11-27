import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentResult {
  domain: string | null;
  source: string;
  confidence: number;
}

// Helper function to extract domain from email
function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : null;
}

// Helper function to search for company domain using various methods
async function findCompanyDomain(company: string, email: string | null): Promise<EnrichmentResult> {
  console.log(`Enriching company: ${company}, email: ${email}`);

  // Strategy 1: If email exists, extract domain
  if (email) {
    const emailDomain = extractDomainFromEmail(email);
    if (emailDomain && !emailDomain.includes('gmail') && !emailDomain.includes('yahoo') && !emailDomain.includes('hotmail')) {
      console.log(`Found domain from email: ${emailDomain}`);
      return {
        domain: emailDomain,
        source: "email_extraction",
        confidence: 95,
      };
    }
  }

  // Strategy 2: Try common domain patterns
  const cleanCompany = company.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const commonTLDs = ['.com', '.io', '.net', '.co'];
  
  for (const tld of commonTLDs) {
    const potentialDomain = `${cleanCompany}${tld}`;
    
    try {
      // Try to verify the domain exists (basic check)
      const response = await fetch(`https://${potentialDomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        console.log(`Found domain via pattern matching: ${potentialDomain}`);
        return {
          domain: potentialDomain,
          source: "pattern_matching",
          confidence: 75,
        };
      }
    } catch (error) {
      // Domain doesn't exist or not reachable, continue
      console.log(`Domain ${potentialDomain} not found`);
    }
  }

  // Strategy 3: Use Hunter.io style domain guessing
  const commonPatterns = [
    company.toLowerCase().replace(/\s+/g, '') + '.com',
    company.toLowerCase().split(' ')[0] + '.com',
    company.toLowerCase().replace(/\s+/g, '-') + '.com',
  ];

  for (const pattern of commonPatterns) {
    try {
      const response = await fetch(`https://${pattern}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        console.log(`Found domain via alternative pattern: ${pattern}`);
        return {
          domain: pattern,
          source: "alternative_pattern",
          confidence: 60,
        };
      }
    } catch (error) {
      console.log(`Pattern ${pattern} not found`);
    }
  }

  // If nothing found, return null
  console.log("No domain found");
  return {
    domain: null,
    source: "not_found",
    confidence: 0,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, email } = await req.json();

    if (!leadId || !company) {
      throw new Error("Missing required fields: leadId and company");
    }

    console.log(`Processing enrichment for lead: ${leadId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find company domain
    const result = await findCompanyDomain(company, email);

    // Update the lead in the database
    const updateData = {
      domain: result.domain,
      enrichment_source: result.source,
      enrichment_confidence: result.confidence,
      enrichment_status: result.domain ? "enriched" : "failed",
      enriched_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully enriched lead ${leadId}`);

    return new Response(
      JSON.stringify({
        success: true,
        domain: result.domain,
        source: result.source,
        confidence: result.confidence,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in enrich-lead function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
