import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentStep {
  step: number;
  action: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  details?: Record<string, any>;
}

interface ScrapedData {
  title: string | null;
  h1: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  logo_url: string | null;
  linkedin: string | null;
  facebook: string | null;
  about_pages: string[];
  nav_links: string[];
  services: string[];
}

interface DeepScrapeResult {
  founded_year: string | null;
  employee_count: string | null;
  contact_email: string | null;
  contact_email_personal: boolean;
  all_emails_found: string[];
  sources: {
    founded_year_source?: string;
    employee_count_source?: string;
    contact_email_source?: string;
  };
}

interface CompanyContact {
  email: string;
  source: string;
  is_personal: boolean;
}

// High-value URL patterns for deep scraping
const HIGH_VALUE_PATTERNS = [
  'about', 'history', 'company', 'services', 
  'team', 'contact', 'reach', 'our-story', 'story'
];

// Personal email domains to flag
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com'
];

// Check if Apollo description is a generic address placeholder
function isGenericAddressDescription(description: string): boolean {
  if (!description) return true;
  const lower = description.toLowerCase();
  // Pattern: "COMPANY is a company based out of ADDRESS"
  return lower.includes('is a company based out of') ||
         lower.includes('is a company located at') ||
         lower.includes('is based out of') ||
         (lower.includes('is a company') && (lower.includes('based') || lower.includes('located')));
}

function filterHighValueUrls(navLinks: string[], domain: string): string[] {
  return navLinks
    .filter(link => {
      const lower = link.toLowerCase();
      return HIGH_VALUE_PATTERNS.some(pattern => lower.includes(pattern));
    })
    .slice(0, 5)
    .map(link => `https://${domain}${link}`);
}

function extractFoundedYear(html: string): string | null {
  // Remove HTML tags for cleaner text matching
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  // Pattern 1: "Founded in 1987", "Established in 1995", "Since 2003"
  const pattern1 = /(?:founded|established|since|started|opened)\s+(?:in\s+)?(\d{4})/gi;
  let match = pattern1.exec(textContent);
  if (match && match[1]) {
    const year = parseInt(match[1]);
    if (year >= 1800 && year <= 2025) {
      return year.toString();
    }
  }
  
  // Pattern 2: "Serving Anchorage since 1978"
  const pattern2 = /serving\s+[\w\s,]+since\s+(\d{4})/gi;
  match = pattern2.exec(textContent);
  if (match && match[1]) {
    const year = parseInt(match[1]);
    if (year >= 1800 && year <= 2025) {
      return year.toString();
    }
  }
  
  // Pattern 3: "Over 20 years of experience" - calculate from current year
  const pattern3 = /(?:over|more\s+than)\s+(\d+)\s+years?\s+(?:of\s+)?(?:experience|in\s+business|serving)/gi;
  match = pattern3.exec(textContent);
  if (match && match[1]) {
    const years = parseInt(match[1]);
    if (years > 0 && years < 200) {
      const calculatedYear = new Date().getFullYear() - years;
      return calculatedYear.toString();
    }
  }
  
  return null;
}

function extractEmployeeCount(html: string): string | null {
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  // Pattern 1: "12 employees", "30+ staff", "team of 8"
  const patterns = [
    /(\d+)\s*\+?\s*(?:employees|staff|team\s*members|professionals|workers)/gi,
    /team\s+of\s+(\d+)/gi,
    /crew\s+of\s+(\d+)/gi,
    /(?:over|more\s+than)\s+(\d+)\s+(?:skilled|dedicated|experienced)?\s*(?:employees|staff|professionals)?/gi
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(textContent);
    if (match && match[1]) {
      const count = parseInt(match[1]);
      if (count > 0 && count < 100000) {
        return `${count} employees`;
      }
    }
  }
  
  return null;
}

function extractContactEmail(html: string): { email: string | null; isPersonal: boolean } {
  // General email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;
  const matches = html.match(emailPattern) || [];
  
  // Filter out common non-contact emails and duplicates
  const seen = new Set<string>();
  const filtered = matches.filter(email => {
    const lower = email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    
    return !lower.includes('example.com') && 
           !lower.includes('domain.com') &&
           !lower.includes('sentry') &&
           !lower.includes('wixpress') &&
           !lower.includes('wordpress') &&
           !lower.includes('@2x') &&
           !lower.includes('.png') &&
           !lower.includes('.jpg');
  });
  
  if (filtered.length > 0) {
    const email = filtered[0];
    const domain = email.split('@')[1].toLowerCase();
    const isPersonal = PERSONAL_EMAIL_DOMAINS.includes(domain);
    return { email, isPersonal };
  }
  
  return { email: null, isPersonal: false };
}

function extractAllEmails(html: string): string[] {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;
  const matches = html.match(emailPattern) || [];
  
  const seen = new Set<string>();
  return matches.filter(email => {
    const lower = email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    
    return !lower.includes('example.com') && 
           !lower.includes('domain.com') &&
           !lower.includes('sentry') &&
           !lower.includes('wixpress') &&
           !lower.includes('wordpress') &&
           !lower.includes('@2x') &&
           !lower.includes('.png') &&
           !lower.includes('.jpg');
  });
}

function validateEmailMatch(
  leadEmail: string | null, 
  scrapedEmail: string | null
): { isValidated: boolean; matchType: 'exact' | 'domain' | 'none' } {
  if (!leadEmail || !scrapedEmail) {
    return { isValidated: false, matchType: 'none' };
  }
  
  const leadEmailLower = leadEmail.toLowerCase().trim();
  const scrapedEmailLower = scrapedEmail.toLowerCase().trim();
  
  // Exact email match (case-insensitive)
  if (leadEmailLower === scrapedEmailLower) {
    return { isValidated: true, matchType: 'exact' };
  }
  
  // Domain match (same company domain)
  const leadDomain = leadEmailLower.split('@')[1];
  const scrapedDomain = scrapedEmailLower.split('@')[1];
  
  // Skip if lead email is from a personal domain
  if (leadDomain && PERSONAL_EMAIL_DOMAINS.includes(leadDomain)) {
    return { isValidated: false, matchType: 'none' };
  }
  
  if (leadDomain && scrapedDomain && leadDomain === scrapedDomain) {
    return { isValidated: true, matchType: 'domain' };
  }
  
  return { isValidated: false, matchType: 'none' };
}

async function scrapeHighValuePages(
  navLinks: string[], 
  domain: string, 
  scraperApiKey: string,
  homepageHtml: string
): Promise<DeepScrapeResult> {
  const result: DeepScrapeResult = {
    founded_year: null,
    employee_count: null,
    contact_email: null,
    contact_email_personal: false,
    all_emails_found: [],
    sources: {}
  };
  
  const allEmails = new Set<string>();
  
  // Collect all emails from homepage
  extractAllEmails(homepageHtml).forEach(e => allEmails.add(e.toLowerCase()));
  
  // First check homepage HTML
  const homepageFoundedYear = extractFoundedYear(homepageHtml);
  const homepageEmployeeCount = extractEmployeeCount(homepageHtml);
  const homepageEmail = extractContactEmail(homepageHtml);
  
  if (homepageFoundedYear) {
    result.founded_year = homepageFoundedYear;
    result.sources.founded_year_source = 'Homepage';
    console.log(`Found founded year on homepage: ${homepageFoundedYear}`);
  }
  if (homepageEmployeeCount) {
    result.employee_count = homepageEmployeeCount;
    result.sources.employee_count_source = 'Homepage';
    console.log(`Found employee count on homepage: ${homepageEmployeeCount}`);
  }
  if (homepageEmail.email) {
    result.contact_email = homepageEmail.email;
    result.contact_email_personal = homepageEmail.isPersonal;
    result.sources.contact_email_source = 'Homepage';
    console.log(`Found email on homepage: ${homepageEmail.email} (personal: ${homepageEmail.isPersonal})`);
  }
  
  // Exit early if all basic fields found on homepage (but still collect emails from other pages)
  const foundAllBasicFields = result.founded_year && result.employee_count && result.contact_email;
  if (foundAllBasicFields) {
    console.log('All deep scrape fields found on homepage');
  }
  
  // Scrape high-value internal pages for additional data and emails
  const highValueUrls = filterHighValueUrls(navLinks, domain);
  console.log(`Deep scraping ${highValueUrls.length} high-value pages: ${highValueUrls.join(', ')}`);
  
  for (const pageUrl of highValueUrls) {
    try {
      console.log(`Scraping: ${pageUrl}`);
      const response = await fetch(
        `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(pageUrl)}`
      );
      
      if (!response.ok) {
        console.log(`Failed to scrape ${pageUrl}: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const pageName = pageUrl.split('/').pop() || 'unknown';
      
      // Collect all emails from this page
      extractAllEmails(html).forEach(e => allEmails.add(e.toLowerCase()));
      
      // Extract founded year if not found yet
      if (!result.founded_year) {
        const year = extractFoundedYear(html);
        if (year) {
          result.founded_year = year;
          result.sources.founded_year_source = pageName;
          console.log(`Found founded year: ${year} on ${pageName}`);
        }
      }
      
      // Extract employee count if not found yet
      if (!result.employee_count) {
        const count = extractEmployeeCount(html);
        if (count) {
          result.employee_count = count;
          result.sources.employee_count_source = pageName;
          console.log(`Found employee count: ${count} on ${pageName}`);
        }
      }
      
      // Extract contact email if not found yet
      if (!result.contact_email) {
        const emailResult = extractContactEmail(html);
        if (emailResult.email) {
          result.contact_email = emailResult.email;
          result.contact_email_personal = emailResult.isPersonal;
          result.sources.contact_email_source = pageName;
          console.log(`Found email: ${emailResult.email} (personal: ${emailResult.isPersonal}) on ${pageName}`);
        }
      }
    } catch (error) {
      console.error(`Error scraping ${pageUrl}:`, error);
    }
  }
  
  // Store all collected emails
  result.all_emails_found = Array.from(allEmails);
  console.log(`Total unique emails collected: ${result.all_emails_found.length}`);
  
  return result;
}

function parseScrapedHtml(html: string, domain: string): ScrapedData | null {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;

    // Title
    const title = doc.querySelector("title")?.textContent?.trim() || null;

    // H1
    const h1 = doc.querySelector("h1")?.textContent?.trim() || null;

    // Meta description
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || null;

    // Meta keywords - check both quote styles
    let metaKeywords = doc.querySelector('meta[name="keywords"]')?.getAttribute("content") || null;
    if (!metaKeywords) {
      metaKeywords = doc.querySelector("meta[name='keywords']")?.getAttribute("content") || null;
    }

    // Logo (img with "logo" in class or id)
    let logo_url: string | null = null;
    const images = doc.querySelectorAll("img");
    for (const img of images) {
      const el = img as unknown as { getAttribute: (name: string) => string | null };
      const className = (el.getAttribute("class") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();
      const alt = (el.getAttribute("alt") || "").toLowerCase();
      if (className.includes("logo") || id.includes("logo") || alt.includes("logo")) {
        logo_url = el.getAttribute("src");
        // Make absolute URL if relative
        if (logo_url && !logo_url.startsWith("http")) {
          logo_url = `https://${domain}${logo_url.startsWith("/") ? "" : "/"}${logo_url}`;
        }
        break;
      }
    }

    // Social links and navigation
    let linkedin: string | null = null;
    let facebook: string | null = null;
    const aboutPages: string[] = [];
    const navLinks: string[] = [];
    const links = doc.querySelectorAll("a[href]");
    
    for (const link of links) {
      const el = link as unknown as { getAttribute: (name: string) => string | null };
      const href = el.getAttribute("href") || "";
      
      // Social links
      if (href.includes("linkedin.com") && !linkedin) linkedin = href;
      if (href.includes("facebook.com") && !facebook) facebook = href;
      
      // About/History pages (keep as absolute URLs)
      if ((href.includes("about") || href.includes("history")) && !href.includes("#")) {
        let absoluteHref = href;
        if (!href.startsWith("http")) {
          absoluteHref = `https://${domain}${href.startsWith("/") ? "" : "/"}${href}`;
        }
        if (!aboutPages.includes(absoluteHref)) {
          aboutPages.push(absoluteHref);
        }
      }
      
      // Capture internal navigation links (relative paths starting with /)
      if (href.startsWith("/") && !href.includes("#") && href.length > 1) {
        if (!navLinks.includes(href)) {
          navLinks.push(href);
        }
      }
    }

    // Services: extract <li> text (filter reasonable length items)
    const services: string[] = [];
    const listItems = doc.querySelectorAll("li");
    for (const li of listItems) {
      const text = li.textContent?.trim();
      if (text && text.length > 2 && text.length < 100 && !text.includes("\n")) {
        services.push(text);
      }
    }

    return {
      title,
      h1,
      meta_description: metaDesc,
      meta_keywords: metaKeywords,
      logo_url,
      linkedin,
      facebook,
      about_pages: aboutPages.slice(0, 5),
      nav_links: navLinks.slice(0, 15),
      services: services.slice(0, 30)
    };
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, domain, enrichmentSource, apolloNotFound } = await req.json();

    if (!leadId || !domain) {
      return new Response(
        JSON.stringify({ error: 'leadId and domain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const scraperApiKey = Deno.env.get('SCRAPER_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the lead's email for validation
    const { data: leadData, error: leadFetchError } = await supabase
      .from('leads')
      .select('email')
      .eq('id', leadId)
      .single();
    
    const leadEmail = leadData?.email || null;
    console.log(`Lead Email: ${leadEmail}`);

    const enrichmentSteps: EnrichmentStep[] = [];
    const isDirectApollo = enrichmentSource === 'apollo_api';
    const skipApollo = apolloNotFound === true;

    console.log(`=== ENRICH COMPANY DETAILS REQUEST ===`);
    console.log(`Lead ID: ${leadId}`);
    console.log(`Domain: ${domain}`);
    console.log(`Enrichment Source: ${enrichmentSource}`);
    console.log(`Direct Apollo: ${isDirectApollo}`);
    console.log(`Skip Apollo (already not found): ${skipApollo}`);

    // Normalize domain (remove protocol, www, trailing slashes)
    let normalizedDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    console.log(`Normalized Domain: ${normalizedDomain}`);

    // ============= APOLLO PATH =============
    if (!skipApollo) {
      // Try Apollo first
      if (!apolloApiKey) {
        console.log('APOLLO_API_KEY not configured, skipping Apollo');
      } else {
        // Step 1: Search/Verify in Apollo
        if (isDirectApollo) {
          enrichmentSteps.push({
            step: 1,
            action: 'apollo_direct_retrieval',
            status: 'success',
            timestamp: new Date().toISOString(),
            details: {
              message: 'Domain was originally found via Apollo - retrieving details directly',
              domain: normalizedDomain
            }
          });
          console.log('Step 1: Skipping search - domain already from Apollo');
        } else {
          enrichmentSteps.push({
            step: 1,
            action: 'apollo_domain_search',
            status: 'pending',
            timestamp: new Date().toISOString(),
            details: {
              message: 'Searching Apollo for domain...',
              domain: normalizedDomain
            }
          });
          console.log('Step 1: Searching Apollo for domain...');
        }

        // Call Apollo Organization Enrich API
        const apolloUrl = `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(normalizedDomain)}`;
        
        console.log(`Apollo URL: ${apolloUrl}`);

        const response = await fetch(apolloUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': apolloApiKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("=== APOLLO ORGANIZATION ENRICH RESPONSE ===");
          console.log(JSON.stringify(data, null, 2));
          console.log("=== END APOLLO RESPONSE ===");

          const org = data.organization;

          if (org) {
            // Apollo found the organization - use Apollo enrichment
            if (!isDirectApollo && enrichmentSteps.length > 0) {
              enrichmentSteps[0].status = 'success';
              enrichmentSteps[0].details = {
                ...enrichmentSteps[0].details,
                organizationFound: true,
                organizationName: org.name
              };
            }

            // Step 2: Retrieve company details
            enrichmentSteps.push({
              step: 2,
              action: 'apollo_details_retrieved',
              status: 'pending',
              timestamp: new Date().toISOString(),
              details: { message: 'Retrieving company details...' }
            });
            console.log('Step 2: Retrieving company details from Apollo...');

            // Map Apollo response to database fields
            const updateData: any = {};
            const fieldsPopulated: string[] = [];

            if (org.estimated_num_employees) {
              updateData.size = `${org.estimated_num_employees} employees`;
              fieldsPopulated.push('size');
            }
            if (org.organization_revenue_printed) {
              updateData.annual_revenue = org.organization_revenue_printed;
              fieldsPopulated.push('annual_revenue');
            }
            if (org.industries && Array.isArray(org.industries) && org.industries.length > 0) {
              updateData.company_industry = org.industries.join(', ');
              fieldsPopulated.push('company_industry');
            }
            // Only use Apollo's short_description if it's not a generic address placeholder
            const apolloDescriptionIsGeneric = isGenericAddressDescription(org.short_description);
            if (org.short_description && !apolloDescriptionIsGeneric) {
              updateData.description = org.short_description;
              fieldsPopulated.push('description');
            }
            if (org.technology_names && Array.isArray(org.technology_names) && org.technology_names.length > 0) {
              updateData.tech_stack = org.technology_names.join(', ');
              fieldsPopulated.push('tech_stack');
            }
            if (org.linkedin_url) {
              updateData.linkedin = org.linkedin_url;
              fieldsPopulated.push('linkedin');
            }
            if (org.facebook_url) {
              updateData.facebook = org.facebook_url;
              fieldsPopulated.push('facebook');
            }
            if (org.founded_year) {
              updateData.founded_date = org.founded_year.toString();
              fieldsPopulated.push('founded_date');
            }
            if (org.logo_url) {
              updateData.logo_url = org.logo_url;
              fieldsPopulated.push('logo_url');
            }

            // Products/Services: Generate using AI
            const companyContext = {
              name: org.name,
              keywords: org.keywords || [],
              industry: org.industry,
              industries: org.industries || [],
              sic_codes: org.sic_codes || [],
              naics_codes: org.naics_codes || [],
              short_description: org.short_description
            };

            const hasContextData = companyContext.keywords.length > 0 || 
                                  companyContext.industry || 
                                  companyContext.industries.length > 0 || 
                                  companyContext.short_description;

            if (hasContextData && LOVABLE_API_KEY) {
              try {
                console.log('Generating products/services description with Lovable AI...');
                
                const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                      {
                        role: 'system',
                        content: `You are an expert at writing concise, professional company descriptions. 
Given company data, generate a single paragraph describing what products and/or services the company provides.
Write in third person. Be specific and comprehensive. Do not include generic marketing language.
Output ONLY the description paragraph, no preamble or explanation.`
                      },
                      {
                        role: 'user',
                        content: `Generate a products/services description for this company:

Company Name: ${companyContext.name}
Keywords: ${companyContext.keywords.join(', ') || 'N/A'}
Industry: ${companyContext.industry || 'N/A'}
Industries: ${companyContext.industries.join(', ') || 'N/A'}
SIC Codes: ${JSON.stringify(companyContext.sic_codes)}
NAICS Codes: ${JSON.stringify(companyContext.naics_codes)}
Short Description: ${companyContext.short_description || 'N/A'}

Write a comprehensive paragraph describing what products and services this company offers.`
                      }
                    ],
                  }),
                });

                if (aiResponse.ok) {
                  const aiData = await aiResponse.json();
                  const generatedDescription = aiData.choices?.[0]?.message?.content?.trim();
                  
                  if (generatedDescription) {
                    console.log('AI generated description:', generatedDescription);
                    updateData.products_services = generatedDescription;
                    fieldsPopulated.push('products_services');
                    
                    // Use AI-generated description if Apollo's was generic
                    if (!updateData.description || apolloDescriptionIsGeneric) {
                      updateData.description = generatedDescription;
                      if (!fieldsPopulated.includes('description')) {
                        fieldsPopulated.push('description');
                      }
                      console.log('Using AI-generated description (Apollo was generic)');
                    }
                  } else if (companyContext.keywords.length > 0) {
                    updateData.products_services = companyContext.keywords.join(', ');
                    fieldsPopulated.push('products_services');
                  }
                } else if (companyContext.keywords.length > 0) {
                  updateData.products_services = companyContext.keywords.join(', ');
                  fieldsPopulated.push('products_services');
                }
              } catch (aiError) {
                console.error('Error calling Lovable AI:', aiError);
                if (companyContext.keywords.length > 0) {
                  updateData.products_services = companyContext.keywords.join(', ');
                  fieldsPopulated.push('products_services');
                }
              }
            }

            // Update step 2 as success
            const lastStepIndex = enrichmentSteps.length - 1;
            enrichmentSteps[lastStepIndex].status = 'success';
            enrichmentSteps[lastStepIndex].details = {
              ...enrichmentSteps[lastStepIndex].details,
              fieldsPopulated,
              organizationName: org.name
            };

            // Store Apollo enrichment log for UI display
            updateData.scraped_data_log = {
              source: 'apollo',
              organization_name: org.name,
              domain: org.primary_domain || normalizedDomain,
              fields_populated: fieldsPopulated,
              enrichment_steps: enrichmentSteps,
              apollo_data: {
                estimated_employees: org.estimated_num_employees,
                revenue: org.organization_revenue_printed,
                industry: org.industry,
                industries: org.industries,
                keywords: org.keywords?.slice(0, 10),
                founded_year: org.founded_year,
                city: org.city,
                state: org.state,
                country: org.country
              }
            };

            console.log("=== UPDATE DATA (Apollo) ===");
            console.log(JSON.stringify(updateData, null, 2));

            // Update the lead record
            const { error: updateError } = await supabase
              .from('leads')
              .update(updateData)
              .eq('id', leadId);

            if (updateError) {
              console.error('Error updating lead:', updateError);
              throw updateError;
            }

            console.log(`Successfully enriched company details for lead ${leadId} via Apollo`);

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Company details enriched successfully from Apollo',
                enrichedFields: fieldsPopulated,
                enrichmentSteps,
                source: 'apollo'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Apollo didn't find the org or API error - mark step as failed
        console.log('Organization not found in Apollo, flagging and proceeding to ScraperAPI...');
        if (enrichmentSteps.length > 0) {
          enrichmentSteps[0].status = 'failed';
          enrichmentSteps[0].details = {
            ...enrichmentSteps[0].details,
            error: 'Organization not found in Apollo'
          };
        }

        // Set apollo_not_found flag in database
        await supabase
          .from('leads')
          .update({ apollo_not_found: true })
          .eq('id', leadId);
      }
    } else {
      // Apollo already flagged as not found
      enrichmentSteps.push({
        step: 1,
        action: 'apollo_skipped',
        status: 'success',
        timestamp: new Date().toISOString(),
        details: {
          message: 'Skipping Apollo (previously not found)',
          domain: normalizedDomain
        }
      });
      console.log('Step 1: Skipping Apollo (previously flagged as not found)');
    }

    // ============= SCRAPER API PATH =============
    if (!scraperApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SCRAPER_API_KEY not configured and Apollo did not find the organization',
          enrichmentSteps,
          notFound: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2 (or continuation): Scrape website
    const scrapeStepNum = skipApollo ? 2 : enrichmentSteps.length + 1;
    enrichmentSteps.push({
      step: scrapeStepNum,
      action: 'scraper_api',
      status: 'pending',
      timestamp: new Date().toISOString(),
      details: {
        message: 'Scraping website...',
        domain: normalizedDomain
      }
    });
    console.log(`Step ${scrapeStepNum}: Scraping website with ScraperAPI...`);

    const scraperUrl = `http://api.scraperapi.com/?api_key=${scraperApiKey}&url=https://${normalizedDomain}/`;
    console.log(`ScraperAPI URL: ${scraperUrl}`);

    const scrapeResponse = await fetch(scraperUrl);
    
    if (!scrapeResponse.ok) {
      console.error(`ScraperAPI error: ${scrapeResponse.status}`);
      enrichmentSteps[enrichmentSteps.length - 1].status = 'failed';
      enrichmentSteps[enrichmentSteps.length - 1].details = {
        ...enrichmentSteps[enrichmentSteps.length - 1].details,
        error: `ScraperAPI returned ${scrapeResponse.status}`
      };

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to scrape website: ${scrapeResponse.status}`,
          enrichmentSteps,
          notFound: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await scrapeResponse.text();
    console.log(`Scraped HTML length: ${html.length} characters`);

    enrichmentSteps[enrichmentSteps.length - 1].status = 'success';
    enrichmentSteps[enrichmentSteps.length - 1].details = {
      ...enrichmentSteps[enrichmentSteps.length - 1].details,
      htmlLength: html.length
    };

    // Step 3: Parse HTML
    const parseStepNum = scrapeStepNum + 1;
    enrichmentSteps.push({
      step: parseStepNum,
      action: 'html_parsing',
      status: 'pending',
      timestamp: new Date().toISOString(),
      details: { message: 'Parsing HTML content...' }
    });
    console.log(`Step ${parseStepNum}: Parsing HTML...`);

    const scrapedData = parseScrapedHtml(html, normalizedDomain);
    
    if (!scrapedData) {
      enrichmentSteps[enrichmentSteps.length - 1].status = 'failed';
      enrichmentSteps[enrichmentSteps.length - 1].details = {
        ...enrichmentSteps[enrichmentSteps.length - 1].details,
        error: 'Failed to parse HTML'
      };

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse website HTML',
          enrichmentSteps,
          notFound: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== SCRAPED DATA ===');
    console.log(JSON.stringify(scrapedData, null, 2));

    enrichmentSteps[enrichmentSteps.length - 1].status = 'success';
    enrichmentSteps[enrichmentSteps.length - 1].details = {
      ...enrichmentSteps[enrichmentSteps.length - 1].details,
      scrapedData
    };

    // Step 4: AI Generation
    const aiStepNum = parseStepNum + 1;
    enrichmentSteps.push({
      step: aiStepNum,
      action: 'ai_generation',
      status: 'pending',
      timestamp: new Date().toISOString(),
      details: { message: 'Generating description with AI...' }
    });
    console.log(`Step ${aiStepNum}: Generating description with AI...`);

    const updateData: any = {};
    const fieldsPopulated: string[] = [];

    // Populate fields from scraped data
    if (scrapedData.logo_url) {
      updateData.logo_url = scrapedData.logo_url;
      fieldsPopulated.push('logo_url');
    }
    if (scrapedData.linkedin) {
      updateData.linkedin = scrapedData.linkedin;
      fieldsPopulated.push('linkedin');
    }
    if (scrapedData.facebook) {
      updateData.facebook = scrapedData.facebook;
      fieldsPopulated.push('facebook');
    }

    // Generate description and products_services with AI
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are an expert at analyzing company websites and writing professional business descriptions.
Given scraped website data, generate:
1. A concise company description (1-2 sentences summarizing what the company does)
2. A list of products and services the company offers (as a comprehensive paragraph)
3. The primary industry/sector this company operates in (e.g., "Roofing & Construction", "Healthcare Services", "Software & Technology", "Automotive Services", "Manufacturing", "Professional Services", "Retail", etc.)

Output ONLY valid JSON in this exact format:
{"description": "...", "products_services": "...", "company_industry": "..."}`
              },
              {
                role: 'user',
                content: `Analyze this scraped website data and generate company description, products/services, and industry classification:

Website Title: ${scrapedData.title || 'N/A'}
Main Heading (H1): ${scrapedData.h1 || 'N/A'}
Meta Description: ${scrapedData.meta_description || 'N/A'}
Meta Keywords: ${scrapedData.meta_keywords || 'N/A'}
Services/Items found on page: ${scrapedData.services.slice(0, 20).join(', ') || 'N/A'}

IMPORTANT: 
- If Meta Keywords are available, prioritize them for the products_services field as they typically contain the most accurate list of company services.
- For company_industry, determine the primary sector/industry based on the overall content. Use standard industry categories.

Generate professional outputs for all three fields.`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiContent = aiData.choices?.[0]?.message?.content?.trim();
          
          if (aiContent) {
            console.log('AI response:', aiContent);
            try {
              // Strip markdown code fences if present
              let jsonContent = aiContent;
              if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
              }
              console.log('Cleaned JSON:', jsonContent);
              
              // Try to parse JSON response
              const parsed = JSON.parse(jsonContent);
              if (parsed.description) {
                updateData.description = parsed.description;
                fieldsPopulated.push('description');
              }
              if (parsed.products_services) {
                updateData.products_services = parsed.products_services;
                fieldsPopulated.push('products_services');
              }
              if (parsed.company_industry) {
                updateData.company_industry = parsed.company_industry;
                fieldsPopulated.push('company_industry');
              }
            } catch (parseError) {
              // If not JSON, use the whole response as description
              console.log('AI response not JSON, using as description:', parseError);
              updateData.description = aiContent;
              fieldsPopulated.push('description');
            }
          }
        } else {
          console.error('AI API error:', aiResponse.status);
        }
      } catch (aiError) {
        console.error('Error calling Lovable AI:', aiError);
      }
    }

    // Fallback if AI didn't generate description
    if (!updateData.description && scrapedData.meta_description) {
      updateData.description = scrapedData.meta_description;
      fieldsPopulated.push('description');
    }
    if (!updateData.products_services && scrapedData.services.length > 0) {
      updateData.products_services = scrapedData.services.slice(0, 15).join(', ');
      fieldsPopulated.push('products_services');
    }

    enrichmentSteps[enrichmentSteps.length - 1].status = 'success';
    enrichmentSteps[enrichmentSteps.length - 1].details = {
      ...enrichmentSteps[enrichmentSteps.length - 1].details,
      fieldsPopulated
    };

    // Step 5: Deep scrape high-value pages for additional data
    let deepScrapeResult: DeepScrapeResult | null = null;

    if (scrapedData.nav_links.length > 0) {
      const deepScrapeStepNum = aiStepNum + 1;
      const highValueUrls = filterHighValueUrls(scrapedData.nav_links, normalizedDomain);
      
      enrichmentSteps.push({
        step: deepScrapeStepNum,
        action: 'deep_scrape',
        status: 'pending',
        timestamp: new Date().toISOString(),
        details: { 
          message: 'Scraping high-value pages for founded year, employees, email...',
          highValueUrls
        }
      });
      console.log(`Step ${deepScrapeStepNum}: Deep scraping high-value pages...`);
      
      deepScrapeResult = await scrapeHighValuePages(
        scrapedData.nav_links, 
        normalizedDomain, 
        scraperApiKey,
        html
      );
      
      enrichmentSteps[enrichmentSteps.length - 1].status = 'success';
      enrichmentSteps[enrichmentSteps.length - 1].details = {
        ...enrichmentSteps[enrichmentSteps.length - 1].details,
        result: deepScrapeResult
      };
      
      // Add deep scrape results to updateData
      if (deepScrapeResult.founded_year && !updateData.founded_date) {
        updateData.founded_date = deepScrapeResult.founded_year;
        fieldsPopulated.push('founded_date');
      }
      if (deepScrapeResult.employee_count && !updateData.size) {
        updateData.size = deepScrapeResult.employee_count;
        fieldsPopulated.push('size');
      }
      if (deepScrapeResult.contact_email) {
        updateData.contact_email = deepScrapeResult.contact_email;
        updateData.contact_email_personal = deepScrapeResult.contact_email_personal;
        fieldsPopulated.push('contact_email');
        
        // Validate email match
        const emailValidation = validateEmailMatch(leadEmail, deepScrapeResult.contact_email);
        if (emailValidation.isValidated) {
          updateData.email_domain_validated = true;
          updateData.domain_relevance_score = 100;
          updateData.domain_relevance_explanation = `Domain validated: Scraped email ${deepScrapeResult.contact_email} matches lead email (${emailValidation.matchType} match)`;
          fieldsPopulated.push('email_domain_validated');
          console.log(`✅ Email validated (${emailValidation.matchType} match): ${leadEmail} ↔ ${deepScrapeResult.contact_email}`);
        }
        
        // Collect company contacts (all emails found except the one matching lead)
        if (deepScrapeResult.all_emails_found.length > 0) {
          const contactEmailLower = deepScrapeResult.contact_email?.toLowerCase() || '';
          const companyContacts: CompanyContact[] = deepScrapeResult.all_emails_found
            .filter(e => e.toLowerCase() !== leadEmail?.toLowerCase())
            .filter(e => e.toLowerCase() !== contactEmailLower)
            .map(email => ({
              email: email,
              source: 'website_scrape',
              is_personal: PERSONAL_EMAIL_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`))
            }));
          
          if (companyContacts.length > 0) {
            updateData.company_contacts = companyContacts;
            fieldsPopulated.push('company_contacts');
            console.log(`Found ${companyContacts.length} additional company contacts`);
          }
        }
      }
    } else {
      // No nav links, but still check homepage for these fields
      console.log('No nav links found, checking homepage only for deep scrape fields...');
      
      const homepageFoundedYear = extractFoundedYear(html);
      const homepageEmployeeCount = extractEmployeeCount(html);
      const homepageEmail = extractContactEmail(html);
      
      if (homepageFoundedYear && !updateData.founded_date) {
        updateData.founded_date = homepageFoundedYear;
        fieldsPopulated.push('founded_date');
      }
      if (homepageEmployeeCount && !updateData.size) {
        updateData.size = homepageEmployeeCount;
        fieldsPopulated.push('size');
      }
      if (homepageEmail.email) {
        updateData.contact_email = homepageEmail.email;
        updateData.contact_email_personal = homepageEmail.isPersonal;
        fieldsPopulated.push('contact_email');
        
        // Validate email match for homepage-only case
        const emailValidation = validateEmailMatch(leadEmail, homepageEmail.email);
        if (emailValidation.isValidated) {
          updateData.email_domain_validated = true;
          updateData.domain_relevance_score = 100;
          updateData.domain_relevance_explanation = `Domain validated: Scraped email ${homepageEmail.email} matches lead email (${emailValidation.matchType} match)`;
          fieldsPopulated.push('email_domain_validated');
          console.log(`✅ Email validated (${emailValidation.matchType} match): ${leadEmail} ↔ ${homepageEmail.email}`);
        }
        
        // Collect homepage emails as company contacts
        const homepageAllEmails = extractAllEmails(html);
        if (homepageAllEmails.length > 0) {
          const companyContacts: CompanyContact[] = homepageAllEmails
            .filter(e => e.toLowerCase() !== leadEmail?.toLowerCase())
            .filter(e => e.toLowerCase() !== homepageEmail.email?.toLowerCase())
            .map(email => ({
              email: email,
              source: 'website_scrape',
              is_personal: PERSONAL_EMAIL_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`))
            }));
          
          if (companyContacts.length > 0) {
            updateData.company_contacts = companyContacts;
            fieldsPopulated.push('company_contacts');
            console.log(`Found ${companyContacts.length} additional company contacts`);
          }
        }
      }
    }

    // Save the scraped data for transparency/debugging (including deep scrape results)
    const highValueUrls = scrapedData.nav_links.length > 0 
      ? filterHighValueUrls(scrapedData.nav_links, normalizedDomain) 
      : [];
    
    updateData.scraped_data_log = {
      ...scrapedData,
      deep_scrape: {
        pages_scraped: highValueUrls,
        founded_year: deepScrapeResult?.founded_year || null,
        employee_count: deepScrapeResult?.employee_count || null,
        contact_email: deepScrapeResult?.contact_email || null,
        contact_email_personal: deepScrapeResult?.contact_email_personal || false,
        sources: deepScrapeResult?.sources || null
      }
    };

    console.log("=== UPDATE DATA (Scraped) ===");
    console.log(JSON.stringify(updateData, null, 2));

    // Update the lead record
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        throw updateError;
      }
    }

    console.log(`Successfully enriched company details for lead ${leadId} via ScraperAPI`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Company details enriched successfully from website scraping',
        enrichedFields: fieldsPopulated,
        enrichmentSteps,
        source: 'scraper',
        scrapedData,
        deepScrapeResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in enrich-company-details function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
