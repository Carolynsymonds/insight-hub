import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string | null;
  primary_domain: string | null;
  primary_phone: {
    number: string;
    source: string;
    sanitized_number: string;
  } | null;
  linkedin_url: string | null;
  founded_year: number | null;
  organization_revenue: number | null;
  organization_revenue_printed: string | null;
}

interface ApolloResponse {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface EnrichmentLog {
  timestamp: string;
  action: string;
  searchParams: {
    company: string;
    city?: string;
    state?: string;
  };
  organizationsFound: number;
  selectedOrganization?: {
    name: string;
    domain: string;
    revenue?: string;
    foundedYear?: number;
  };
  domain: string | null;
  confidence: number;
  source: string;
}

async function enrichWithApollo(
  company: string,
  city: string | null,
  state: string | null
): Promise<{ domain: string | null; confidence: number; source: string; log: EnrichmentLog }> {
  const apolloApiKey = Deno.env.get("APOLLO_API_KEY");
  
  if (!apolloApiKey) {
    throw new Error("Apollo API key not configured");
  }

  const timestamp = new Date().toISOString();
  
  // Build search parameters
  const searchParams: any = {
    q_organization_name: company,
  };

  // Add location filters if available
  const locations: string[] = [];
  if (city) locations.push(city);
  if (state) locations.push(state);

  console.log(`Enriching company: ${company}, locations: ${locations.join(", ")}`);

  try {
    // Call Apollo API
    const response = await fetch(
      `https://api.apollo.io/api/v1/mixed_companies/search?${
        locations.length > 0 
          ? locations.map(loc => `organization_locations[]=${encodeURIComponent(loc)}`).join("&") + "&"
          : ""
      }q_organization_name=${encodeURIComponent(company)}`,
      {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          "accept": "application/json",
          "x-api-key": apolloApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo API error: ${response.status} - ${errorText}`);
      throw new Error(`Apollo API request failed: ${response.status}`);
    }

    const data: ApolloResponse = await response.json();
    console.log(`Apollo API returned ${data.organizations?.length || 0} organizations`);

    // Extract domain from the first organization
    let domain: string | null = null;
    let confidence = 0;
    let selectedOrg: EnrichmentLog["selectedOrganization"] = undefined;

    if (data.organizations && data.organizations.length > 0) {
      const org = data.organizations[0];
      
      // Try primary_domain first, then parse from website_url
      if (org.primary_domain) {
        domain = org.primary_domain;
        confidence = 95;
      } else if (org.website_url) {
        // Parse domain from URL
        try {
          const url = new URL(org.website_url.startsWith("http") ? org.website_url : `https://${org.website_url}`);
          domain = url.hostname.replace(/^www\./, "");
          confidence = 90;
        } catch (e) {
          // If URL parsing fails, use as-is
          domain = org.website_url.replace(/^(https?:\/\/)?(www\.)?/, "");
          confidence = 85;
        }
      }

      // Build selected org info for log
      selectedOrg = {
        name: org.name,
        domain: domain || "N/A",
        revenue: org.organization_revenue_printed || undefined,
        foundedYear: org.founded_year || undefined,
      };

      console.log(`Extracted domain: ${domain} with confidence ${confidence}%`);
    } else {
      console.log("No organizations found in Apollo response");
    }

    // Create enrichment log
    const log: EnrichmentLog = {
      timestamp,
      action: "apollo_api_search",
      searchParams: {
        company,
        ...(city && { city }),
        ...(state && { state }),
      },
      organizationsFound: data.organizations?.length || 0,
      selectedOrganization: selectedOrg,
      domain,
      confidence,
      source: "apollo_api",
    };

    return {
      domain,
      confidence,
      source: "apollo_api",
      log,
    };
  } catch (error) {
    console.error("Error calling Apollo API:", error);
    
    // Create error log
    const log: EnrichmentLog = {
      timestamp,
      action: "apollo_api_search_failed",
      searchParams: {
        company,
        ...(city && { city }),
        ...(state && { state }),
      },
      organizationsFound: 0,
      domain: null,
      confidence: 0,
      source: "apollo_api_error",
    };

    return {
      domain: null,
      confidence: 0,
      source: "apollo_api_error",
      log,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, company, city, state } = await req.json();

    if (!leadId || !company) {
      throw new Error("Missing required fields: leadId and company");
    }

    console.log(`Processing enrichment for lead: ${leadId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enrich with Apollo
    const result = await enrichWithApollo(company, city, state);

    // Get existing logs
    const { data: existingLead } = await supabase
      .from("leads")
      .select("enrichment_logs")
      .eq("id", leadId)
      .single();

    const existingLogs = existingLead?.enrichment_logs || [];
    const updatedLogs = [...existingLogs, result.log];

    // Update the lead in the database
    const updateData = {
      domain: result.domain,
      enrichment_source: result.source,
      enrichment_confidence: result.confidence,
      enrichment_status: result.domain ? "enriched" : "failed",
      enriched_at: new Date().toISOString(),
      enrichment_logs: updatedLogs,
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
        log: result.log,
        logs: updatedLogs,
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
