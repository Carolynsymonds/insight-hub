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
  services: string[];
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

    // Social links
    let linkedin: string | null = null;
    let facebook: string | null = null;
    const aboutPages: string[] = [];
    const links = doc.querySelectorAll("a[href]");
    
    for (const link of links) {
      const el = link as unknown as { getAttribute: (name: string) => string | null };
      const href = el.getAttribute("href") || "";
      if (href.includes("linkedin.com") && !linkedin) linkedin = href;
      if (href.includes("facebook.com") && !facebook) facebook = href;
      if ((href.includes("about") || href.includes("history")) && !href.includes("#")) {
        // Make absolute URL if relative
        let absoluteHref = href;
        if (!href.startsWith("http")) {
          absoluteHref = `https://${domain}${href.startsWith("/") ? "" : "/"}${href}`;
        }
        if (!aboutPages.includes(absoluteHref)) {
          aboutPages.push(absoluteHref);
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
            if (org.short_description) {
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

Output ONLY valid JSON in this exact format:
{"description": "...", "products_services": "..."}`
              },
              {
                role: 'user',
                content: `Analyze this scraped website data and generate company description and products/services:

Website Title: ${scrapedData.title || 'N/A'}
Main Heading (H1): ${scrapedData.h1 || 'N/A'}
Meta Description: ${scrapedData.meta_description || 'N/A'}
Meta Keywords: ${scrapedData.meta_keywords || 'N/A'}
Services/Items found on page: ${scrapedData.services.slice(0, 20).join(', ') || 'N/A'}

IMPORTANT: If Meta Keywords are available, prioritize them for the products_services field as they typically contain the most accurate list of company services curated by the website owner.

Generate a professional description and products/services summary.`
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
        scrapedData
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
