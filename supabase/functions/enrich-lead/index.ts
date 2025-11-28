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
    micsSector?: string;
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
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  searchInformation?: {
    query_displayed: string;
    total_results: number;
    time_taken_displayed: number;
    organic_results_state: string;
    results_for: string;
  };
  searchSteps?: {
    step: number;
    query: string;
    resultFound: boolean;
    source?: string;
  }[];
}

function normalizeDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, '')  // Remove http:// or https://
    .replace(/^www\./, '')         // Remove www.
    .replace(/\/+$/, '');          // Remove trailing slashes
}

async function performGoogleSearch(
  query: string,
  serpApiKey: string
): Promise<{
  domain: string | null;
  confidence: number;
  sourceType: string;
  gpsCoordinates?: { latitude: number; longitude: number };
  latitude?: number;
  longitude?: number;
  searchInformation?: any;
  selectedOrg?: { name: string; domain: string };
}> {
  console.log(`Performing Google search with query: ${query}`);
  
  const response = await fetch(
    `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=${serpApiKey}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SerpAPI error: ${response.status} - ${errorText}`);
    throw new Error(`SerpAPI request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`SerpAPI returned knowledge_graph:`, data.knowledge_graph ? 'found' : 'not found');
  console.log(`SerpAPI returned local_results:`, data.local_results ? 'found' : 'not found');

  let domain: string | null = null;
  let confidence = 0;
  let selectedOrg: { name: string; domain: string } | undefined = undefined;
  let sourceType = "";

  // Try knowledge graph first
  if (data.knowledge_graph && data.knowledge_graph.website) {
    domain = normalizeDomain(data.knowledge_graph.website);
    confidence = 100;
    sourceType = "knowledge_graph";
    selectedOrg = {
      name: data.knowledge_graph.title || "",
      domain: domain,
    };
    console.log(`Extracted domain from knowledge_graph: ${domain}`);
  } else if (data.local_results?.places?.[0]?.links?.website) {
    // Fallback to local results
    domain = normalizeDomain(data.local_results.places[0].links.website);
    confidence = 50;
    sourceType = "local_results";
    selectedOrg = {
      name: data.local_results.places[0].title || "",
      domain: domain,
    };
    console.log(`Extracted domain from local_results: ${domain}`);
  }

  // Extract GPS coordinates
  let gpsCoordinates: { latitude: number; longitude: number } | undefined = undefined;
  let latitude: number | undefined = undefined;
  let longitude: number | undefined = undefined;
  
  if (data.local_map && data.local_map.gps_coordinates) {
    gpsCoordinates = {
      latitude: data.local_map.gps_coordinates.latitude,
      longitude: data.local_map.gps_coordinates.longitude,
    };
    latitude = data.local_map.gps_coordinates.latitude;
    longitude = data.local_map.gps_coordinates.longitude;
  }

  // Extract search information
  let searchInformation: any = undefined;
  if (data.search_information) {
    searchInformation = {
      query_displayed: data.search_information.query_displayed,
      total_results: data.search_information.total_results,
      time_taken_displayed: data.search_information.time_taken_displayed,
      organic_results_state: data.search_information.organic_results_state,
      results_for: data.search_information.results_for,
    };
  }

  return {
    domain,
    confidence,
    sourceType,
    gpsCoordinates,
    latitude,
    longitude,
    searchInformation,
    selectedOrg,
  };
}

async function enrichWithGoogle(
  company: string,
  city: string | null,
  state: string | null,
  micsSector: string | null
): Promise<{ domain: string | null; confidence: number; source: string; log: EnrichmentLog; latitude?: number; longitude?: number }> {
  const serpApiKey = Deno.env.get("SERPAPI_KEY");
  
  if (!serpApiKey) {
    throw new Error("SerpAPI key not configured");
  }

  const timestamp = new Date().toISOString();
  const locationPart = [city, state].filter(Boolean).join(' ');
  
  // STEP 1: Detailed search with company name and location
  const step1Query = `"${company}" ${locationPart} ("official site" OR "website" OR "home page") -jobs -careers -indeed -glassdoor -facebook -yelp`;
  console.log(`Step 1: Detailed search for company: ${company}, location: ${locationPart}`);

  const searchSteps: EnrichmentLog["searchSteps"] = [];
  let finalResult: any;
  let finalDomain: string | null = null;
  let finalConfidence = 0;
  let finalSource = "";
  let finalSelectedOrg: EnrichmentLog["selectedOrganization"] = undefined;
  let finalGpsCoordinates: { latitude: number; longitude: number } | undefined = undefined;
  let finalLatitude: number | undefined = undefined;
  let finalLongitude: number | undefined = undefined;
  let finalSearchInformation: any = undefined;

  try {
    const step1Result = await performGoogleSearch(step1Query, serpApiKey);
    
    searchSteps.push({
      step: 1,
      query: step1Query,
      resultFound: step1Result.domain !== null,
      source: step1Result.sourceType || undefined,
    });

    if (step1Result.domain) {
      // Step 1 found a result
      finalDomain = step1Result.domain;
      finalConfidence = step1Result.confidence; // 100 for knowledge_graph, 50 for local_results
      finalSource = step1Result.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
      finalSelectedOrg = step1Result.selectedOrg;
      finalGpsCoordinates = step1Result.gpsCoordinates;
      finalLatitude = step1Result.latitude;
      finalLongitude = step1Result.longitude;
      finalSearchInformation = step1Result.searchInformation;
      
      console.log(`Step 1 successful: ${finalDomain} with confidence ${finalConfidence}%`);
    } else if (micsSector) {
      // STEP 2: Fallback to industry search if Step 1 failed and we have MICS sector
      const step2Query = `${company} ${city || ''} ${micsSector}`;
      console.log(`Step 2: Industry fallback search with query: ${step2Query}`);
      
      const step2Result = await performGoogleSearch(step2Query, serpApiKey);
      
      searchSteps.push({
        step: 2,
        query: step2Query,
        resultFound: step2Result.domain !== null,
        source: step2Result.sourceType || undefined,
      });

      if (step2Result.domain) {
        // Step 2 found a result - reduce confidence
        finalDomain = step2Result.domain;
        // Reduce confidence for step 2: 25% for knowledge_graph, 15% for local_results
        finalConfidence = step2Result.sourceType === "knowledge_graph" ? 25 : 15;
        finalSource = step2Result.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
        finalSelectedOrg = step2Result.selectedOrg;
        finalGpsCoordinates = step2Result.gpsCoordinates;
        finalLatitude = step2Result.latitude;
        finalLongitude = step2Result.longitude;
        finalSearchInformation = step2Result.searchInformation;
        
        console.log(`Step 2 successful: ${finalDomain} with confidence ${finalConfidence}%`);
      } else {
        console.log("Step 2 failed: No results found");
      }
    } else {
      console.log("Step 1 failed and no MICS sector available for Step 2");
      // Log that Step 2 was skipped
      searchSteps.push({
        step: 2,
        query: "Skipped - No MICS Sector data available",
        resultFound: false,
        source: undefined,
      });
    }

    // STEP 3: Simple search fallback (if Steps 1 & 2 both failed or Step 2 was skipped)
    if (!finalDomain) {
      const step3Query = `${company} ${locationPart}`;
      console.log(`Step 3: Simple fallback search with query: ${step3Query}`);
      
      const step3Result = await performGoogleSearch(step3Query, serpApiKey);
      
      searchSteps.push({
        step: 3,
        query: step3Query,
        resultFound: step3Result.domain !== null,
        source: step3Result.sourceType || undefined,
      });

      if (step3Result.domain) {
        finalDomain = step3Result.domain;
        // Lower confidence for step 3: 10% for knowledge_graph, 5% for local_results
        finalConfidence = step3Result.sourceType === "knowledge_graph" ? 10 : 5;
        finalSource = step3Result.sourceType === "knowledge_graph" 
          ? "google_knowledge_graph" 
          : "google_local_results";
        finalSelectedOrg = step3Result.selectedOrg;
        finalGpsCoordinates = step3Result.gpsCoordinates;
        finalLatitude = step3Result.latitude;
        finalLongitude = step3Result.longitude;
        finalSearchInformation = step3Result.searchInformation;
        
        console.log(`Step 3 successful: ${finalDomain} with confidence ${finalConfidence}%`);
      } else {
        console.log("Step 3 failed: No results found");
      }
    }

    // Create enrichment log
    const log: EnrichmentLog = {
      timestamp,
      action: finalDomain 
        ? (finalSource === "google_knowledge_graph" ? "google_knowledge_graph_search" : "google_local_results_search")
        : "google_search_no_results",
      searchParams: {
        company,
        ...(city && { city }),
        ...(state && { state }),
        ...(micsSector && { micsSector }),
      },
      organizationsFound: finalDomain ? 1 : 0,
      selectedOrganization: finalSelectedOrg,
      domain: finalDomain,
      confidence: finalConfidence,
      source: finalSource || "google_knowledge_graph",
      ...(finalGpsCoordinates && { gpsCoordinates: finalGpsCoordinates }),
      ...(finalSearchInformation && { searchInformation: finalSearchInformation }),
      searchSteps,
    };

    return {
      domain: finalDomain,
      confidence: finalConfidence,
      source: finalSource || "google_knowledge_graph",
      log,
      latitude: finalLatitude,
      longitude: finalLongitude,
    };
  } catch (error) {
    console.error("Error calling SerpAPI:", error);
    
    // Create error log
    const log: EnrichmentLog = {
      timestamp,
      action: "google_knowledge_graph_search_failed",
      searchParams: {
        company,
        ...(city && { city }),
        ...(state && { state }),
        ...(micsSector && { micsSector }),
      },
      organizationsFound: 0,
      domain: null,
      confidence: 0,
      source: "google_knowledge_graph_error",
      searchSteps,
    };

    return {
      domain: null,
      confidence: 0,
      source: "google_knowledge_graph_error",
      log,
    };
  }
}

async function enrichWithApollo(
  company: string,
  city: string | null,
  state: string | null
): Promise<{ domain: string | null; confidence: number; source: string; log: EnrichmentLog; latitude?: number; longitude?: number }> {
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
    const { leadId, company, city, state, mics_sector, source = "apollo" } = await req.json();

    if (!leadId || !company) {
      throw new Error("Missing required fields: leadId and company");
    }

    console.log(`Processing enrichment for lead: ${leadId}, source: ${source}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enrich with the specified source
    const result = source === "google" 
      ? await enrichWithGoogle(company, city, state, mics_sector)
      : await enrichWithApollo(company, city, state);

    // Get existing logs
    const { data: existingLead } = await supabase
      .from("leads")
      .select("enrichment_logs")
      .eq("id", leadId)
      .single();

    const existingLogs = existingLead?.enrichment_logs || [];
    const updatedLogs = [...existingLogs, result.log];

    // Update the lead in the database
    // Only update domain if we found one (don't overwrite existing with null)
    const updateData: any = {
      enrichment_source: result.source,
      enrichment_confidence: result.confidence,
      enrichment_status: result.domain ? "enriched" : "failed",
      enriched_at: new Date().toISOString(),
      enrichment_logs: updatedLogs,
    };

    if (result.domain) {
      updateData.domain = result.domain;
    }

    // Add GPS coordinates if found (only from Google enrichment)
    if (result.latitude !== undefined && result.longitude !== undefined) {
      updateData.latitude = result.latitude;
      updateData.longitude = result.longitude;
    }

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
