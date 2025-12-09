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
    email?: string;
    extractedDomain?: string;
  };
  organizationsFound: number;
  selectedOrganization?: {
    name: string;
    domain: string;
    revenue?: string;
    foundedYear?: number;
  };
  domain: string | null;
  sourceUrl?: string | null;
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
    spelling_fix?: string;
  };
  searchSteps?: {
    step: number | string;
    query: string;
    resultFound: boolean;
    source?: string;
    spellingCorrection?: {
      original: string;
      corrected: string;
    };
    spellingCorrected?: boolean;
  }[];
}

function normalizeDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, "") // Remove http:// or https://
    .replace(/^www\./, "") // Remove www.
    .replace(/\/+$/, ""); // Remove trailing slashes
}

function extractRootDomain(url: string): string {
  // First normalize (remove protocol, www, trailing slashes)
  let normalized = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  
  // Extract just the domain (everything before the first /)
  const domainOnly = normalized.split('/')[0];
  return domainOnly;
}

function extractCorrectedCompanyName(spellingFix: string): string | null {
  // spelling_fix looks like: "\"Eberspacher\" (\"official site\" OR ...)"
  // We need to extract "Eberspacher" from the first quoted term
  const match = spellingFix.match(/^"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

async function performGoogleSearch(
  query: string,
  serpApiKey: string,
): Promise<{
  domain: string | null;
  sourceUrl: string | null;
  confidence: number;
  sourceType: string;
  gpsCoordinates?: { latitude: number; longitude: number };
  latitude?: number;
  longitude?: number;
  searchInformation?: any;
  selectedOrg?: { name: string; domain: string };
}> {
  console.log(`Performing Google search with query: ${query}`);

  const requestUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=${serpApiKey}`;
  const response = await fetch(requestUrl);

  console.log(`Request URL 2: `, requestUrl);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`SerpAPI error: ${response.status} - ${errorText}`);
    throw new Error(`SerpAPI request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`SerpAPI returned knowledge_graph:`, data.knowledge_graph ? "found" : "not found");
  console.log(`SerpAPI returned local_results:`, data.local_results ? "found" : "not found");

  let domain: string | null = null;
  let sourceUrl: string | null = null;
  let confidence = 0;
  let selectedOrg: { name: string; domain: string } | undefined = undefined;
  let sourceType = "";

  // Try knowledge graph first
  if (data.knowledge_graph) {
    let websiteUrl: string | null = null;
    
    // First check direct website field
    if (data.knowledge_graph.website) {
      websiteUrl = data.knowledge_graph.website;
      console.log('Found website in knowledge_graph.website');
    } 
    // If no direct website, check CEO links
    else if (data.knowledge_graph.ceo_links && data.knowledge_graph.ceo_links.length > 0) {
      const ceoLink = data.knowledge_graph.ceo_links[0].link;
      if (ceoLink && !ceoLink.includes('google.com')) {
        websiteUrl = ceoLink;
        console.log('Found website in knowledge_graph.ceo_links');
      }
    }
    // Check headquarters links
    else if (data.knowledge_graph.headquarters_links && data.knowledge_graph.headquarters_links.length > 0) {
      const hqLink = data.knowledge_graph.headquarters_links[0].link;
      if (hqLink && !hqLink.includes('google.com')) {
        websiteUrl = hqLink;
        console.log('Found website in knowledge_graph.headquarters_links');
      }
    }
    // Check subsidiaries links
    else if (data.knowledge_graph.subsidiaries_links && data.knowledge_graph.subsidiaries_links.length > 0) {
      const subLink = data.knowledge_graph.subsidiaries_links[0].link;
      if (subLink && !subLink.includes('google.com')) {
        websiteUrl = subLink;
        console.log('Found website in knowledge_graph.subsidiaries_links');
      }
    }
    
    if (websiteUrl) {
      const fullUrl = normalizeDomain(websiteUrl);
      domain = extractRootDomain(websiteUrl);
      sourceUrl = fullUrl;
      confidence = 100;
      sourceType = "knowledge_graph";
      selectedOrg = {
        name: data.knowledge_graph.title || "",
        domain: domain,
      };
      console.log(`Extracted domain from knowledge_graph: ${domain} (source: ${sourceUrl})`);
    }
  }
  
  if (!domain && data.local_results?.places?.[0]?.links?.website) {
    // Fallback to local results
    const fullUrl = normalizeDomain(data.local_results.places[0].links.website);
    domain = extractRootDomain(data.local_results.places[0].links.website);
    sourceUrl = fullUrl;
    confidence = 50;
    sourceType = "local_results";
    selectedOrg = {
      name: data.local_results.places[0].title || "",
      domain: domain,
    };
    console.log(`Extracted domain from local_results: ${domain} (source: ${sourceUrl})`);
  }

  // Extract GPS coordinates - prioritize local_results.places (actual business location)
  // over local_map (generic map viewport center)
  let gpsCoordinates: { latitude: number; longitude: number } | undefined = undefined;
  let latitude: number | undefined = undefined;
  let longitude: number | undefined = undefined;

  // First, try to get coordinates from local_results.places (most accurate)
  if (data.local_results?.places?.[0]?.gps_coordinates) {
    gpsCoordinates = {
      latitude: data.local_results.places[0].gps_coordinates.latitude,
      longitude: data.local_results.places[0].gps_coordinates.longitude,
    };
    latitude = data.local_results.places[0].gps_coordinates.latitude;
    longitude = data.local_results.places[0].gps_coordinates.longitude;
    console.log('GPS coordinates extracted from local_results.places[0]:', gpsCoordinates);
  } 
  // Fallback to local_map if no local_results available
  else if (data.local_map?.gps_coordinates) {
    gpsCoordinates = {
      latitude: data.local_map.gps_coordinates.latitude,
      longitude: data.local_map.gps_coordinates.longitude,
    };
    latitude = data.local_map.gps_coordinates.latitude;
    longitude = data.local_map.gps_coordinates.longitude;
    console.log('GPS coordinates extracted from local_map (fallback):', gpsCoordinates);
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
      spelling_fix: data.search_information.spelling_fix || undefined,
    };
  }

  return {
    domain,
    sourceUrl,
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
  micsSector: string | null,
): Promise<{
  domain: string | null;
  sourceUrl: string | null;
  confidence: number;
  source: string;
  log: EnrichmentLog;
  latitude?: number;
  longitude?: number;
}> {
  const serpApiKey = Deno.env.get("SERPAPI_KEY");

  if (!serpApiKey) {
    throw new Error("SerpAPI key not configured");
  }

  const timestamp = new Date().toISOString();
  const locationPart = [city, state].filter(Boolean).join(" ");

  // STEP 1: Detailed search with company name, location, and MICS sector (if available)
  const micsPartStep1 = micsSector ? ` ${micsSector}` : "";
  const step1Query = `"${company}" ${locationPart}${micsPartStep1} ("official site" OR "website" OR "home page") -jobs -indeed -glassdoor -yelp`;
  console.log(`Step 1: Detailed search for company: ${company}, location: ${locationPart}${micsSector ? `, MICS: ${micsSector}` : ""}`);

  const searchSteps: EnrichmentLog["searchSteps"] = [];
  let finalResult: any;
  let finalDomain: string | null = null;
  let finalSourceUrl: string | null = null;
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
      finalSourceUrl = step1Result.sourceUrl;
      finalConfidence = step1Result.confidence; // 100 for knowledge_graph, 50 for local_results
      finalSource = step1Result.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
      finalSelectedOrg = step1Result.selectedOrg;
      finalGpsCoordinates = step1Result.gpsCoordinates;
      finalLatitude = step1Result.latitude;
      finalLongitude = step1Result.longitude;
      finalSearchInformation = step1Result.searchInformation;

      console.log(`Step 1 successful: ${finalDomain} with confidence ${finalConfidence}%`);
    } else if (step1Result.searchInformation?.spelling_fix) {
      // Step 1 failed but spelling correction detected
      const correctedName = extractCorrectedCompanyName(step1Result.searchInformation.spelling_fix);

      if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
        console.log(`Step 1 spelling correction: "${company}" → "${correctedName}"`);

        searchSteps.push({
          step: "1-correction",
          query: `Spelling correction detected: "${company}" → "${correctedName}"`,
          resultFound: false,
          spellingCorrection: {
            original: company,
            corrected: correctedName,
          },
        });

        const correctedQuery = `"${correctedName}" ${locationPart}${micsPartStep1} ("official site" OR "website" OR "home page") -jobs -indeed -glassdoor -yelp`;
        const step1bResult = await performGoogleSearch(correctedQuery, serpApiKey);

        searchSteps.push({
          step: "1b",
          query: correctedQuery,
          resultFound: step1bResult.domain !== null,
          source: step1bResult.sourceType || undefined,
          spellingCorrected: true,
        });

        if (step1bResult.domain) {
          finalDomain = step1bResult.domain;
          finalSourceUrl = step1bResult.sourceUrl;
          finalConfidence = step1bResult.confidence;
          finalSource =
            step1bResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
          finalSelectedOrg = step1bResult.selectedOrg;
          finalGpsCoordinates = step1bResult.gpsCoordinates;
          finalLatitude = step1bResult.latitude;
          finalLongitude = step1bResult.longitude;
          finalSearchInformation = step1bResult.searchInformation;

          console.log(`Step 1b successful with corrected spelling: ${finalDomain}`);
        }
      }
    }

    if (!finalDomain && micsSector) {
      // STEP 2: Fallback to industry search if Step 1 failed and we have MICS sector
      // Step 2a: WITH filters
      const step2Query = `${company} ${city || ""} ${micsSector} ("official site" OR "website" OR "home page") -jobs -indeed -glassdoor -yelp`;
      console.log(`Step 2a: Industry fallback search with query: ${step2Query}`);

      const step2Result = await performGoogleSearch(step2Query, serpApiKey);

      searchSteps.push({
        step: "2a",
        query: step2Query,
        resultFound: step2Result.domain !== null,
        source: step2Result.sourceType || undefined,
      });

      if (step2Result.domain) {
        // Step 2a found a result - reduce confidence
        finalDomain = step2Result.domain;
        finalSourceUrl = step2Result.sourceUrl;
        // Reduce confidence for step 2a: 25% for knowledge_graph, 15% for local_results
        finalConfidence = step2Result.sourceType === "knowledge_graph" ? 25 : 15;
        finalSource = step2Result.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
        finalSelectedOrg = step2Result.selectedOrg;
        finalGpsCoordinates = step2Result.gpsCoordinates;
        finalLatitude = step2Result.latitude;
        finalLongitude = step2Result.longitude;
        finalSearchInformation = step2Result.searchInformation;

        console.log(`Step 2a successful: ${finalDomain} with confidence ${finalConfidence}%`);
      } else if (step2Result.searchInformation?.spelling_fix) {
        // Step 2a failed but spelling correction detected
        const correctedName = extractCorrectedCompanyName(step2Result.searchInformation.spelling_fix);

        if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
          console.log(`Step 2a spelling correction: "${company}" → "${correctedName}"`);

          searchSteps.push({
            step: "2a-correction",
            query: `Spelling correction detected: "${company}" → "${correctedName}"`,
            resultFound: false,
            spellingCorrection: {
              original: company,
              corrected: correctedName,
            },
          });

          const correctedQuery = step2Query.replace(company, correctedName);
          const step2bResult = await performGoogleSearch(correctedQuery, serpApiKey);

          searchSteps.push({
            step: "2b",
            query: correctedQuery,
            resultFound: step2bResult.domain !== null,
            source: step2bResult.sourceType || undefined,
            spellingCorrected: true,
          });

          if (step2bResult.domain) {
            finalDomain = step2bResult.domain;
            finalSourceUrl = step2bResult.sourceUrl;
            finalConfidence = step2bResult.sourceType === "knowledge_graph" ? 25 : 15;
            finalSource =
              step2bResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
            finalSelectedOrg = step2bResult.selectedOrg;
            finalGpsCoordinates = step2bResult.gpsCoordinates;
            finalLatitude = step2bResult.latitude;
            finalLongitude = step2bResult.longitude;
            finalSearchInformation = step2bResult.searchInformation;

            console.log(`Step 2b successful with corrected spelling: ${finalDomain}`);
          }
        }
      }

      // Step 2c: WITHOUT filters (if 2a and 2b failed)
      if (!finalDomain) {
        const step2cQuery = `${company} ${city || ""} ${micsSector}`;
        console.log(`Step 2c: Industry search without filters: ${step2cQuery}`);

        const step2cResult = await performGoogleSearch(step2cQuery, serpApiKey);

        searchSteps.push({
          step: "2c",
          query: step2cQuery,
          resultFound: step2cResult.domain !== null,
          source: step2cResult.sourceType || undefined,
        });

        if (step2cResult.domain) {
          finalDomain = step2cResult.domain;
          finalSourceUrl = step2cResult.sourceUrl;
          // Lower confidence for unfiltered: 20% for knowledge_graph, 12% for local_results
          finalConfidence = step2cResult.sourceType === "knowledge_graph" ? 20 : 12;
          finalSource = step2cResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
          finalSelectedOrg = step2cResult.selectedOrg;
          finalGpsCoordinates = step2cResult.gpsCoordinates;
          finalLatitude = step2cResult.latitude;
          finalLongitude = step2cResult.longitude;
          finalSearchInformation = step2cResult.searchInformation;

          console.log(`Step 2c successful: ${finalDomain} with confidence ${finalConfidence}%`);
        } else if (step2cResult.searchInformation?.spelling_fix) {
          const correctedName = extractCorrectedCompanyName(step2cResult.searchInformation.spelling_fix);

          if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
            console.log(`Step 2c spelling correction: "${company}" → "${correctedName}"`);

            searchSteps.push({
              step: "2c-correction",
              query: `Spelling correction detected: "${company}" → "${correctedName}"`,
              resultFound: false,
              spellingCorrection: {
                original: company,
                corrected: correctedName,
              },
            });

            const correctedQuery = step2cQuery.replace(company, correctedName);
            const step2dResult = await performGoogleSearch(correctedQuery, serpApiKey);

            searchSteps.push({
              step: "2d",
              query: correctedQuery,
              resultFound: step2dResult.domain !== null,
              source: step2dResult.sourceType || undefined,
              spellingCorrected: true,
            });

            if (step2dResult.domain) {
              finalDomain = step2dResult.domain;
              finalSourceUrl = step2dResult.sourceUrl;
              finalConfidence = step2dResult.sourceType === "knowledge_graph" ? 20 : 12;
              finalSource =
                step2dResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
              finalSelectedOrg = step2dResult.selectedOrg;
              finalGpsCoordinates = step2dResult.gpsCoordinates;
              finalLatitude = step2dResult.latitude;
              finalLongitude = step2dResult.longitude;
              finalSearchInformation = step2dResult.searchInformation;

              console.log(`Step 2d successful with corrected spelling: ${finalDomain}`);
            }
          }
        }
      }
    } else if (!finalDomain) {
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
      // Step 3a: WITH filters
      const step3Query = `${company} ${locationPart} ("official site" OR "website" OR "home page") -jobs -indeed -glassdoor -yelp`;
      console.log(`Step 3a: Simple fallback search with query: ${step3Query}`);

      const step3Result = await performGoogleSearch(step3Query, serpApiKey);

      searchSteps.push({
        step: "3a",
        query: step3Query,
        resultFound: step3Result.domain !== null,
        source: step3Result.sourceType || undefined,
      });

      if (step3Result.domain) {
        finalDomain = step3Result.domain;
        finalSourceUrl = step3Result.sourceUrl;
        // Lower confidence for step 3a: 10% for knowledge_graph, 5% for local_results
        finalConfidence = step3Result.sourceType === "knowledge_graph" ? 10 : 5;
        finalSource = step3Result.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
        finalSelectedOrg = step3Result.selectedOrg;
        finalGpsCoordinates = step3Result.gpsCoordinates;
        finalLatitude = step3Result.latitude;
        finalLongitude = step3Result.longitude;
        finalSearchInformation = step3Result.searchInformation;

        console.log(`Step 3a successful: ${finalDomain} with confidence ${finalConfidence}%`);
      } else if (step3Result.searchInformation?.spelling_fix) {
        // Step 3a failed but spelling correction detected
        const correctedName = extractCorrectedCompanyName(step3Result.searchInformation.spelling_fix);

        if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
          console.log(`Step 3a spelling correction: "${company}" → "${correctedName}"`);

          searchSteps.push({
            step: "3a-correction",
            query: `Spelling correction detected: "${company}" → "${correctedName}"`,
            resultFound: false,
            spellingCorrection: {
              original: company,
              corrected: correctedName,
            },
          });

          const correctedQuery = step3Query.replace(company, correctedName);
          const step3bResult = await performGoogleSearch(correctedQuery, serpApiKey);

          searchSteps.push({
            step: "3b",
            query: correctedQuery,
            resultFound: step3bResult.domain !== null,
            source: step3bResult.sourceType || undefined,
            spellingCorrected: true,
          });

          if (step3bResult.domain) {
            finalDomain = step3bResult.domain;
            finalSourceUrl = step3bResult.sourceUrl;
            finalConfidence = step3bResult.sourceType === "knowledge_graph" ? 10 : 5;
            finalSource =
              step3bResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
            finalSelectedOrg = step3bResult.selectedOrg;
            finalGpsCoordinates = step3bResult.gpsCoordinates;
            finalLatitude = step3bResult.latitude;
            finalLongitude = step3bResult.longitude;
            finalSearchInformation = step3bResult.searchInformation;

            console.log(`Step 3b successful with corrected spelling: ${finalDomain}`);
          }
        }
      }

      // Step 3c: WITHOUT filters (if 3a and 3b failed)
      if (!finalDomain) {
        const step3cQuery = `${company} ${locationPart}`;
        console.log(`Step 3c: Simple search without filters: ${step3cQuery}`);

        const step3cResult = await performGoogleSearch(step3cQuery, serpApiKey);

        searchSteps.push({
          step: "3c",
          query: step3cQuery,
          resultFound: step3cResult.domain !== null,
          source: step3cResult.sourceType || undefined,
        });

        if (step3cResult.domain) {
          finalDomain = step3cResult.domain;
          finalSourceUrl = step3cResult.sourceUrl;
          // Lower confidence for unfiltered: 8% for knowledge_graph, 4% for local_results
          finalConfidence = step3cResult.sourceType === "knowledge_graph" ? 8 : 4;
          finalSource = step3cResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
          finalSelectedOrg = step3cResult.selectedOrg;
          finalGpsCoordinates = step3cResult.gpsCoordinates;
          finalLatitude = step3cResult.latitude;
          finalLongitude = step3cResult.longitude;
          finalSearchInformation = step3cResult.searchInformation;

          console.log(`Step 3c successful: ${finalDomain} with confidence ${finalConfidence}%`);
        } else if (step3cResult.searchInformation?.spelling_fix) {
          const correctedName = extractCorrectedCompanyName(step3cResult.searchInformation.spelling_fix);

          if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
            console.log(`Step 3c spelling correction: "${company}" → "${correctedName}"`);

            searchSteps.push({
              step: "3c-correction",
              query: `Spelling correction detected: "${company}" → "${correctedName}"`,
              resultFound: false,
              spellingCorrection: {
                original: company,
                corrected: correctedName,
              },
            });

            const correctedQuery = step3cQuery.replace(company, correctedName);
            const step3dResult = await performGoogleSearch(correctedQuery, serpApiKey);

            searchSteps.push({
              step: "3d",
              query: correctedQuery,
              resultFound: step3dResult.domain !== null,
              source: step3dResult.sourceType || undefined,
              spellingCorrected: true,
            });

            if (step3dResult.domain) {
              finalDomain = step3dResult.domain;
              finalSourceUrl = step3dResult.sourceUrl;
              finalConfidence = step3dResult.sourceType === "knowledge_graph" ? 8 : 4;
              finalSource =
                step3dResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
              finalSelectedOrg = step3dResult.selectedOrg;
              finalGpsCoordinates = step3dResult.gpsCoordinates;
              finalLatitude = step3dResult.latitude;
              finalLongitude = step3dResult.longitude;
              finalSearchInformation = step3dResult.searchInformation;

              console.log(`Step 3d successful with corrected spelling: ${finalDomain}`);
            }
          }
        }
      }
    }

    // STEP 4: Company name only search (if all previous steps failed)
    if (!finalDomain) {
      // Step 4a: WITH filters
      const step4Query = `"${company}" ("official site" OR "website" OR "home page") -jobs -indeed -glassdoor -yelp`;
      console.log(`Step 4a: Company name only search with query: ${step4Query}`);

      const step4Result = await performGoogleSearch(step4Query, serpApiKey);

      searchSteps.push({
        step: "4a",
        query: step4Query,
        resultFound: step4Result.domain !== null,
        source: step4Result.sourceType || undefined,
      });

      if (step4Result.domain) {
        finalDomain = step4Result.domain;
        finalSourceUrl = step4Result.sourceUrl;
        // Lowest confidence for step 4a: 5% for knowledge_graph, 2% for local_results
        finalConfidence = step4Result.sourceType === "knowledge_graph" ? 5 : 2;
        finalSource = step4Result.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
        finalSelectedOrg = step4Result.selectedOrg;
        finalGpsCoordinates = step4Result.gpsCoordinates;
        finalLatitude = step4Result.latitude;
        finalLongitude = step4Result.longitude;
        finalSearchInformation = step4Result.searchInformation;

        console.log(`Step 4a successful: ${finalDomain} with confidence ${finalConfidence}%`);
      } else if (step4Result.searchInformation?.spelling_fix) {
        // Step 4a failed but spelling correction detected
        const correctedName = extractCorrectedCompanyName(step4Result.searchInformation.spelling_fix);

        if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
          console.log(`Step 4a spelling correction: "${company}" → "${correctedName}"`);

          searchSteps.push({
            step: "4a-correction",
            query: `Spelling correction detected: "${company}" → "${correctedName}"`,
            resultFound: false,
            spellingCorrection: {
              original: company,
              corrected: correctedName,
            },
          });

          const correctedQuery = `"${correctedName}" ("official site" OR "website" OR "home page") -jobs -indeed -glassdoor -yelp`;
          const step4bResult = await performGoogleSearch(correctedQuery, serpApiKey);

          searchSteps.push({
            step: "4b",
            query: correctedQuery,
            resultFound: step4bResult.domain !== null,
            source: step4bResult.sourceType || undefined,
            spellingCorrected: true,
          });

          if (step4bResult.domain) {
            finalDomain = step4bResult.domain;
            finalSourceUrl = step4bResult.sourceUrl;
            finalConfidence = step4bResult.sourceType === "knowledge_graph" ? 5 : 2;
            finalSource =
              step4bResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
            finalSelectedOrg = step4bResult.selectedOrg;
            finalGpsCoordinates = step4bResult.gpsCoordinates;
            finalLatitude = step4bResult.latitude;
            finalLongitude = step4bResult.longitude;
            finalSearchInformation = step4bResult.searchInformation;

            console.log(`Step 4b successful with corrected spelling: ${finalDomain}`);
          }
        }
      }

      // Step 4c: WITHOUT filters (if 4a and 4b failed)
      if (!finalDomain) {
        const step4cQuery = `"${company}"`;
        console.log(`Step 4c: Company name only without filters: ${step4cQuery}`);

        const step4cResult = await performGoogleSearch(step4cQuery, serpApiKey);

        searchSteps.push({
          step: "4c",
          query: step4cQuery,
          resultFound: step4cResult.domain !== null,
          source: step4cResult.sourceType || undefined,
        });

        if (step4cResult.domain) {
          finalDomain = step4cResult.domain;
          finalSourceUrl = step4cResult.sourceUrl;
          // Lowest confidence for unfiltered: 3% for knowledge_graph, 1% for local_results
          finalConfidence = step4cResult.sourceType === "knowledge_graph" ? 3 : 1;
          finalSource = step4cResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
          finalSelectedOrg = step4cResult.selectedOrg;
          finalGpsCoordinates = step4cResult.gpsCoordinates;
          finalLatitude = step4cResult.latitude;
          finalLongitude = step4cResult.longitude;
          finalSearchInformation = step4cResult.searchInformation;

          console.log(`Step 4c successful: ${finalDomain} with confidence ${finalConfidence}%`);
        } else if (step4cResult.searchInformation?.spelling_fix) {
          const correctedName = extractCorrectedCompanyName(step4cResult.searchInformation.spelling_fix);

          if (correctedName && correctedName.toLowerCase() !== company.toLowerCase()) {
            console.log(`Step 4c spelling correction: "${company}" → "${correctedName}"`);

            searchSteps.push({
              step: "4c-correction",
              query: `Spelling correction detected: "${company}" → "${correctedName}"`,
              resultFound: false,
              spellingCorrection: {
                original: company,
                corrected: correctedName,
              },
            });

            const correctedQuery = `"${correctedName}"`;
            const step4dResult = await performGoogleSearch(correctedQuery, serpApiKey);

            searchSteps.push({
              step: "4d",
              query: correctedQuery,
              resultFound: step4dResult.domain !== null,
              source: step4dResult.sourceType || undefined,
              spellingCorrected: true,
            });

            if (step4dResult.domain) {
              finalDomain = step4dResult.domain;
              finalSourceUrl = step4dResult.sourceUrl;
              finalConfidence = step4dResult.sourceType === "knowledge_graph" ? 3 : 1;
              finalSource =
                step4dResult.sourceType === "knowledge_graph" ? "google_knowledge_graph" : "google_local_results";
              finalSelectedOrg = step4dResult.selectedOrg;
              finalGpsCoordinates = step4dResult.gpsCoordinates;
              finalLatitude = step4dResult.latitude;
              finalLongitude = step4dResult.longitude;
              finalSearchInformation = step4dResult.searchInformation;

              console.log(`Step 4d successful with corrected spelling: ${finalDomain}`);
            }
          }
        }
      }
    }

    // Create enrichment log
    const log: EnrichmentLog = {
      timestamp,
      action: finalDomain
        ? finalSource === "google_knowledge_graph"
          ? "google_knowledge_graph_search"
          : "google_local_results_search"
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
      sourceUrl: finalSourceUrl,
      confidence: finalConfidence,
      source: finalSource || "google_knowledge_graph",
      ...(finalGpsCoordinates && { gpsCoordinates: finalGpsCoordinates }),
      ...(finalSearchInformation && { searchInformation: finalSearchInformation }),
      searchSteps,
    };

    return {
      domain: finalDomain,
      sourceUrl: finalSourceUrl,
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
      sourceUrl: null,
      confidence: 0,
      source: "google_knowledge_graph_error",
      log,
    };
  }
}

async function enrichWithEmail(
  email: string | null,
  company: string,
): Promise<{ domain: string | null; sourceUrl: string | null; confidence: number; source: string; log: EnrichmentLog }> {
  const timestamp = new Date().toISOString();

  // List of common personal email domains to skip
  const PERSONAL_EMAIL_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "msn.com",
    "aol.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "mail.com",
    "protonmail.com",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "fastmail.com",
  ];

  const searchSteps: EnrichmentLog["searchSteps"] = [];

  // Step 1: Check if email exists
  if (!email) {
    console.log("No email provided for enrichment");
    searchSteps.push({
      step: 1,
      query: "No email provided",
      resultFound: false,
    });

    const log: EnrichmentLog = {
      timestamp,
      action: "email_enrichment_skipped",
      searchParams: { company },
      organizationsFound: 0,
      domain: null,
      confidence: 0,
      source: "email_not_provided",
      searchSteps,
    };
    return { domain: null, sourceUrl: null, confidence: 0, source: "email_not_provided", log };
  }

  // Step 2: Extract domain from email
  const emailParts = email.split("@");
  if (emailParts.length !== 2 || !emailParts[1]) {
    console.log("Invalid email format");
    searchSteps.push({
      step: 1,
      query: `Invalid email format: ${email}`,
      resultFound: false,
    });

    const log: EnrichmentLog = {
      timestamp,
      action: "email_enrichment_failed",
      searchParams: { company, email },
      organizationsFound: 0,
      domain: null,
      confidence: 0,
      source: "email_invalid_format",
      searchSteps,
    };
    return { domain: null, sourceUrl: null, confidence: 0, source: "email_invalid_format", log };
  }

  const emailDomain = emailParts[1].toLowerCase();
  console.log(`Extracted domain from email: ${emailDomain}`);

  searchSteps.push({
    step: 1,
    query: `Extracted domain: ${emailDomain} from ${email}`,
    resultFound: true,
  });

  // Step 3: Check if it's a personal email domain
  if (PERSONAL_EMAIL_DOMAINS.includes(emailDomain)) {
    console.log(`Personal email domain detected: ${emailDomain}`);
    searchSteps.push({
      step: 2,
      query: `${emailDomain} is a personal email provider (gmail, yahoo, etc.) - personal domains cannot be verified as company websites`,
      resultFound: false,
    });

    const log: EnrichmentLog = {
      timestamp,
      action: "email_enrichment_skipped",
      searchParams: { company, email, extractedDomain: emailDomain },
      organizationsFound: 0,
      domain: null,
      confidence: 0,
      source: "email_personal_domain_skipped",
      searchSteps,
    };
    return { domain: null, sourceUrl: null, confidence: 0, source: "email_personal_domain_skipped", log };
  }

  searchSteps.push({
    step: 2,
    query: `${emailDomain} is not a personal email provider - proceeding to verification`,
    resultFound: true,
  });

  // Step 4: Verify domain exists via DNS lookup
  try {
    const dnsQuery = `https://dns.google/resolve?name=${emailDomain}&type=A`;
    console.log(`Verifying domain with DNS query: ${dnsQuery}`);

    const response = await fetch(dnsQuery);

    if (!response.ok) {
      throw new Error(`DNS lookup failed: ${response.status}`);
    }

    const data = await response.json();

    // Status 0 = Success (NOERROR), Status 3 = NXDOMAIN (domain doesn't exist)
    const hasARecords = data.Status === 0 && data.Answer && data.Answer.length > 0;

    console.log(`DNS lookup result: Status=${data.Status}, HasARecords=${hasARecords}`);

    if (hasARecords) {
      // Domain verified - has valid A records
      const ipAddresses = data.Answer.filter((a: any) => a.type === 1).map((a: any) => a.data);

      searchSteps.push({
        step: 3,
        query: dnsQuery,
        resultFound: true,
        source: `DNS resolved to ${ipAddresses.length} IP address(es): ${ipAddresses.join(", ")}`,
      });

      const log: EnrichmentLog = {
        timestamp,
        action: "email_domain_verification_success",
        searchParams: { company, email, extractedDomain: emailDomain },
        organizationsFound: 1,
        selectedOrganization: {
          name: company,
          domain: emailDomain,
        },
        domain: emailDomain,
        sourceUrl: emailDomain,
        confidence: 95,
        source: "email_domain_verified",
        searchSteps,
      };
      console.log(`Domain verified via DNS with 95% confidence: ${emailDomain}`);
      return { domain: emailDomain, sourceUrl: emailDomain, confidence: 95, source: "email_domain_verified", log };
    } else {
      // Domain not verified - no A records or NXDOMAIN
      const reason =
        data.Status === 3 ? "NXDOMAIN - domain does not exist" : "No A records found - domain may not have a website";

      searchSteps.push({
        step: 3,
        query: dnsQuery,
        resultFound: false,
        source: reason,
      });

      const log: EnrichmentLog = {
        timestamp,
        action: "email_domain_verification_failed",
        searchParams: { company, email, extractedDomain: emailDomain },
        organizationsFound: 0,
        domain: null,
        sourceUrl: null,
        confidence: 0,
        source: "email_domain_not_verified",
        searchSteps,
      };
      console.log(`Domain not verified: ${emailDomain} - ${reason}`);
      return { domain: null, sourceUrl: null, confidence: 0, source: "email_domain_not_verified", log };
    }
  } catch (error) {
    console.error("Error verifying email domain:", error);
    searchSteps.push({
      step: 3,
      query: `https://dns.google/resolve?name=${emailDomain}&type=A`,
      resultFound: false,
      source: "Error during verification",
    });

    const log: EnrichmentLog = {
      timestamp,
      action: "email_domain_verification_error",
      searchParams: { company, email, extractedDomain: emailDomain },
      organizationsFound: 0,
      domain: null,
      sourceUrl: null,
      confidence: 0,
      source: "email_domain_verification_error",
      searchSteps,
    };
    return { domain: null, sourceUrl: null, confidence: 0, source: "email_domain_verification_error", log };
  }
}

async function enrichWithApollo(
  company: string,
  city: string | null,
  state: string | null,
): Promise<{
  domain: string | null;
  sourceUrl: string | null;
  confidence: number;
  source: string;
  log: EnrichmentLog;
  latitude?: number;
  longitude?: number;
}> {
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
    // Build the complete URL
    const apolloUrl = `https://api.apollo.io/api/v1/mixed_companies/search?${
      locations.length > 0
        ? locations.map((loc) => `organization_locations[]=${encodeURIComponent(loc)}`).join("&") + "&"
        : ""
    }q_organization_name=${encodeURIComponent(company)}`;

    // Log the complete request URL
    console.log("=== APOLLO API REQUEST ===");
    console.log(`URL: ${apolloUrl}`);
    console.log("=== END APOLLO API REQUEST ===");

    // Call Apollo API
    const response = await fetch(apolloUrl, {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        accept: "application/json",
        "x-api-key": apolloApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo API error: ${response.status} - ${errorText}`);
      throw new Error(`Apollo API request failed: ${response.status}`);
    }

    const data: ApolloResponse = await response.json();

    // Log the entire Apollo API response for debugging
    console.log("=== COMPLETE APOLLO API RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=== END APOLLO API RESPONSE ===");

    console.log(`Apollo API returned ${data.organizations?.length || 0} organizations`);

    // Extract domain from the first organization
    let domain: string | null = null;
    let sourceUrl: string | null = null;
    let confidence = 0;
    let selectedOrg: EnrichmentLog["selectedOrganization"] = undefined;

    if (data.organizations && data.organizations.length > 0) {
      const org = data.organizations[0];

      // Try primary_domain first, then parse from website_url
      if (org.primary_domain) {
        domain = extractRootDomain(org.primary_domain);
        sourceUrl = normalizeDomain(org.primary_domain);
        confidence = 95;
      } else if (org.website_url) {
        // Parse domain from URL
        domain = extractRootDomain(org.website_url);
        sourceUrl = normalizeDomain(org.website_url);
        confidence = 90;
      }

      // Build selected org info for log
      selectedOrg = {
        name: org.name,
        domain: domain || "N/A",
        revenue: org.organization_revenue_printed || undefined,
        foundedYear: org.founded_year || undefined,
      };

      console.log(`Extracted domain: ${domain} (source: ${sourceUrl}) with confidence ${confidence}%`);
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
      sourceUrl,
      confidence,
      source: "apollo_api",
    };

    return {
      domain,
      sourceUrl,
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
      sourceUrl: null,
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
    const { leadId, company, city, state, mics_sector, email, source = "apollo" } = await req.json();

    if (!leadId || !company) {
      throw new Error("Missing required fields: leadId and company");
    }

    console.log(`Processing enrichment for lead: ${leadId}, source: ${source}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enrich with the specified source
    const result =
      source === "google"
        ? await enrichWithGoogle(company, city, state, mics_sector)
        : source === "email"
          ? await enrichWithEmail(email, company)
          : await enrichWithApollo(company, city, state);

    // Get existing lead data including current domain and confidence
    const { data: existingLead } = await supabase
      .from("leads")
      .select("enrichment_logs, domain, enrichment_confidence, enrichment_source")
      .eq("id", leadId)
      .single();

    const existingLogs = existingLead?.enrichment_logs || [];
    const updatedLogs = [...existingLogs, result.log];

    // Determine if we should update domain fields
    // Only overwrite if: new enrichment found a domain AND (no existing domain OR new confidence > existing confidence)
    const existingConfidence = existingLead?.enrichment_confidence ?? 0;
    const existingDomain = existingLead?.domain;
    
    const shouldUpdateDomain = result.domain && (
      !existingDomain || 
      result.confidence > existingConfidence
    );

    console.log(`Domain update check: existing=${existingDomain} (${existingConfidence}%), new=${result.domain} (${result.confidence}%), shouldUpdate=${shouldUpdateDomain}`);

    // Build update data - always log the enrichment attempt
    const updateData: any = {
      enrichment_logs: updatedLogs,
      enriched_at: new Date().toISOString(),
    };

    // Only update domain fields if new enrichment is better
    if (shouldUpdateDomain) {
      updateData.domain = result.domain;
      updateData.source_url = result.sourceUrl || null;
      updateData.enrichment_source = result.source;
      updateData.enrichment_confidence = result.confidence;
      updateData.enrichment_status = "enriched";
      console.log(`Updating domain to: ${result.domain} from ${result.source}`);
    } else if (!existingDomain && !result.domain) {
      // No existing domain and no new domain found - mark as failed
      updateData.enrichment_source = result.source;
      updateData.enrichment_confidence = result.confidence;
      updateData.enrichment_status = "failed";
      console.log(`No domain found, marking as failed`);
    } else {
      // Preserve existing domain - just log this enrichment attempt
      console.log(`Preserving existing domain: ${existingDomain} (${existingConfidence}%) - new enrichment (${result.source}: ${result.confidence}%) not better`);
    }

    // Add GPS coordinates if found (only from Google enrichment)
    if (
      "latitude" in result &&
      result.latitude !== undefined &&
      "longitude" in result &&
      result.longitude !== undefined
    ) {
      updateData.latitude = result.latitude;
      updateData.longitude = result.longitude;
    }

    const { error: updateError } = await supabase.from("leads").update(updateData).eq("id", leadId);

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
      },
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
      },
    );
  }
});
