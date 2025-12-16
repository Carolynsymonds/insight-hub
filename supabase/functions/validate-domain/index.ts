import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DOMAIN_MARKETPLACES = [
  'hugedomains.com',
  'sedo.com',
  'godaddy.com',
  'afternic.com',
  'domainmarket.com',
  'parkingcrew.com',
  'bodis.com',
  'dan.com',
  'namecheap.com',
  'register.com'
];

// Content markers that indicate a parked or for-sale domain page
const PARKING_PAGE_MARKERS = [
  'this domain is for sale',
  'domain for sale',
  'buy this domain',
  'parked domain',
  'domain parking',
  'sedoparking',
  'domain may be for sale',
  'make an offer',
  'make offer on this domain',
  'inquire about this domain',
  'domain is available',
  'get this domain',
  'purchase this domain',
  'hugedomains.com',
  'godaddy.com/domainsearch',
  'afternic.com',
  'dan.com',
  'sedo.com',
  'domainmarket.com',
  'parkingcrew',
  'bodis.com',
  'coming soon', // Often used on parked domains
  'under construction', // Sometimes indicates parked
  'domainnamesales',
  'domainlore',
  'parked by',
  'parked free',
];

interface ValidationResult {
  domain: string;
  dns_valid: boolean;
  http_status: number | null;
  redirect_to: string | null;
  is_valid_domain: boolean;
  is_parked: boolean;
  parking_indicator: string | null;
  reason: string;
}

// Check if page content contains parking page markers
function containsParkingMarkers(html: string): string | null {
  const htmlLower = html.toLowerCase();
  for (const marker of PARKING_PAGE_MARKERS) {
    if (htmlLower.includes(marker.toLowerCase())) {
      return marker;
    }
  }
  return null;
}

// Check if final URL after redirects is a marketplace
function isMarketplaceDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DOMAIN_MARKETPLACES.some(marketplace => hostname.includes(marketplace));
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-domain] Starting validation for: ${domain}`);

    // Step 1: DNS Check
    console.log(`[validate-domain] Step 1: DNS Check via Google DNS API`);
    const dnsUrl = `https://dns.google/resolve?name=${domain}&type=A`;
    const dnsResponse = await fetch(dnsUrl);
    const dnsData = await dnsResponse.json();

    console.log(`[validate-domain] DNS Response:`, JSON.stringify(dnsData));

    if (dnsData.Status !== 0) {
      const result: ValidationResult = {
        domain,
        dns_valid: false,
        http_status: null,
        redirect_to: null,
        is_valid_domain: false,
        is_parked: false,
        parking_indicator: null,
        reason: `DNS lookup failed with status ${dnsData.Status}. Domain does not resolve.`
      };
      console.log(`[validate-domain] Result:`, JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!dnsData.Answer || dnsData.Answer.length === 0) {
      const result: ValidationResult = {
        domain,
        dns_valid: false,
        http_status: null,
        redirect_to: null,
        is_valid_domain: false,
        is_parked: false,
        parking_indicator: null,
        reason: 'DNS lookup returned no A records. Domain has no IP address.'
      };
      console.log(`[validate-domain] Result:`, JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[validate-domain] DNS valid - A records found: ${dnsData.Answer.map((a: any) => a.data).join(', ')}`);

    // Step 2: HTTP/Redirect Check with content analysis
    console.log(`[validate-domain] Step 2: HTTP Check for https://${domain}`);
    
    let httpStatus: number | null = null;
    let redirectTo: string | null = null;
    let isValid = false;
    let isParked = false;
    let parkingIndicator: string | null = null;
    let reason = '';

    // Create abort controller with 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const httpResponse = await fetch(`https://${domain}`, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DomainValidator/1.0)'
        }
      });
      
      clearTimeout(timeoutId);

      httpStatus = httpResponse.status;
      console.log(`[validate-domain] HTTP Status: ${httpStatus}`);

      // Check for redirects
      const locationHeader = httpResponse.headers.get('location');
      if (locationHeader) {
        redirectTo = locationHeader;
        console.log(`[validate-domain] Redirect detected to: ${redirectTo}`);

        // Check if redirect is to a domain marketplace
        const redirectLower = redirectTo.toLowerCase();
        const isMarketplaceRedirect = DOMAIN_MARKETPLACES.some(marketplace => 
          redirectLower.includes(marketplace)
        );

        if (isMarketplaceRedirect) {
          // Parked domain - mark as VALID but flagged as parked
          isValid = true;
          isParked = true;
          parkingIndicator = `Redirects to ${redirectTo}`;
          reason = `Domain is parked or for sale (redirects to marketplace). Domain exists but may be available for purchase.`;
        } else {
          // Check if it's a normal self-redirect (www <-> non-www or http -> https)
          try {
            const redirectUrl = new URL(redirectTo, `https://${domain}`);
            const redirectHost = redirectUrl.hostname.replace(/^www\./, '');
            const originalHost = domain.replace(/^www\./, '');
            
            if (redirectHost === originalHost) {
              isValid = true;
              reason = `Domain is valid. Normal redirect to ${redirectTo}.`;
            } else {
              // External redirect - could be valid but flag it
              isValid = false;
              reason = `Domain redirects to external site: ${redirectTo}. May not be the actual business domain.`;
            }
          } catch {
            isValid = false;
            reason = `Domain redirects to: ${redirectTo}. Unable to parse redirect URL.`;
          }
        }
      } else if (httpStatus === 200) {
        // HTTP 200 - need to check the page content for parking markers
        console.log(`[validate-domain] HTTP 200 - checking page content for parking markers`);
        
        const bodyText = await httpResponse.text();
        const parkingMarker = containsParkingMarkers(bodyText);
        
        if (parkingMarker) {
          console.log(`[validate-domain] Parking marker found: "${parkingMarker}"`);
          // Parked domain - mark as VALID but flagged as parked
          isValid = true;
          isParked = true;
          parkingIndicator = parkingMarker;
          reason = `Domain appears to be parked or for sale (detected: "${parkingMarker}"). Domain exists but may be available for purchase.`;
        } else {
          // Also do a follow-redirect check to see where JS redirects might go
          console.log(`[validate-domain] No parking markers in content, checking for JS redirects`);
          
          const followController = new AbortController();
          const followTimeoutId = setTimeout(() => followController.abort(), 10000);
          
          try {
            const followResponse = await fetch(`https://${domain}`, {
              method: 'GET',
              redirect: 'follow',
              signal: followController.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DomainValidator/1.0)'
              }
            });
            clearTimeout(followTimeoutId);
            
            const finalUrl = followResponse.url;
            console.log(`[validate-domain] Final URL after following redirects: ${finalUrl}`);
            
            if (isMarketplaceDomain(finalUrl)) {
              // Parked domain - mark as VALID but flagged as parked
              isValid = true;
              isParked = true;
              parkingIndicator = `Redirects to ${finalUrl}`;
              reason = `Domain is parked or for sale (redirects to marketplace). Domain exists but may be available for purchase.`;
            } else {
              // Check the final page content as well
              const finalBodyText = await followResponse.text();
              const finalParkingMarker = containsParkingMarkers(finalBodyText);
              
              if (finalParkingMarker) {
                console.log(`[validate-domain] Parking marker found after redirect: "${finalParkingMarker}"`);
                // Parked domain - mark as VALID but flagged as parked
                isValid = true;
                isParked = true;
                parkingIndicator = finalParkingMarker;
                reason = `Domain appears to be parked or for sale (detected: "${finalParkingMarker}"). Domain exists but may be available for purchase.`;
              } else {
                isValid = true;
                reason = 'Domain resolves correctly and returns HTTP 200.';
              }
            }
          } catch (followError) {
            clearTimeout(followTimeoutId);
            console.log(`[validate-domain] Follow redirect check failed:`, followError);
            // If follow check fails but initial check passed, consider it valid
            isValid = true;
            reason = 'Domain resolves correctly and returns HTTP 200.';
          }
        }
      } else if (httpStatus === 301 || httpStatus === 302 || httpStatus === 307 || httpStatus === 308) {
        isValid = false;
        reason = `Domain returns redirect status ${httpStatus} but no location header.`;
      } else if (httpStatus === 403) {
        // 403 could mean the site exists but blocks bots - consider it potentially valid
        isValid = true;
        reason = 'Domain returns HTTP 403 (Forbidden). Site exists but may block automated requests.';
      } else if (httpStatus === 404) {
        isValid = false;
        reason = 'Domain returns HTTP 404 (Not Found). No content at this domain.';
      } else if (httpStatus >= 500) {
        isValid = false;
        reason = `Domain returns server error (HTTP ${httpStatus}). Server may be down or misconfigured.`;
      } else {
        isValid = true;
        reason = `Domain returns HTTP ${httpStatus}. Domain appears to be active.`;
      }
    } catch (httpError) {
      clearTimeout(timeoutId);
      console.log(`[validate-domain] HTTPS request failed:`, httpError);
      
      // Try HTTP if HTTPS fails
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);
      
      try {
        console.log(`[validate-domain] Retrying with http://${domain}`);
        const httpFallbackResponse = await fetch(`http://${domain}`, {
          method: 'GET',
          redirect: 'manual',
          signal: fallbackController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DomainValidator/1.0)'
          }
        });
        
        clearTimeout(fallbackTimeoutId);
        
        httpStatus = httpFallbackResponse.status;
        const locationHeader = httpFallbackResponse.headers.get('location');
        
        if (locationHeader) {
          redirectTo = locationHeader;
          // Check marketplace redirect
          const isMarketplaceRedirect = DOMAIN_MARKETPLACES.some(marketplace => 
            redirectTo!.toLowerCase().includes(marketplace)
          );
          
          if (isMarketplaceRedirect) {
            // Parked domain - mark as VALID but flagged as parked
            isValid = true;
            isParked = true;
            parkingIndicator = `Redirects to ${redirectTo}`;
            reason = `Domain is parked or for sale (redirects to marketplace). Domain exists but may be available for purchase.`;
          } else {
            isValid = true;
            reason = `Domain accessible via HTTP and redirects to ${redirectTo}.`;
          }
        } else if (httpStatus === 200) {
          // Check content for parking markers on HTTP fallback too
          const bodyText = await httpFallbackResponse.text();
          const parkingMarker = containsParkingMarkers(bodyText);
          
          if (parkingMarker) {
            // Parked domain - mark as VALID but flagged as parked
            isValid = true;
            isParked = true;
            parkingIndicator = parkingMarker;
            reason = `Domain appears to be parked or for sale (detected: "${parkingMarker}"). Domain exists but may be available for purchase.`;
          } else {
            isValid = true;
            reason = 'Domain resolves correctly via HTTP and returns 200.';
          }
        } else {
          isValid = false;
          reason = `Domain returns HTTP ${httpStatus} via HTTP fallback.`;
        }
      } catch (fallbackError) {
        clearTimeout(fallbackTimeoutId);
        console.log(`[validate-domain] HTTP fallback also failed:`, fallbackError);
        // DNS valid but HTTP completely fails - domain might be inactive
        isValid = false;
        reason = 'Domain has valid DNS but HTTP connection failed. Domain may be inactive or blocking connections.';
      }
    }

    const result: ValidationResult = {
      domain,
      dns_valid: true,
      http_status: httpStatus,
      redirect_to: redirectTo,
      is_valid_domain: isValid,
      is_parked: isParked,
      parking_indicator: parkingIndicator,
      reason
    };

    console.log(`[validate-domain] Final result:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[validate-domain] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
