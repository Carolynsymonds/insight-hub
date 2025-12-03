import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, domain, enrichmentSource } = await req.json();

    if (!leadId || !domain) {
      return new Response(
        JSON.stringify({ error: 'leadId and domain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apolloApiKey) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const enrichmentSteps: EnrichmentStep[] = [];
    const isDirectApollo = enrichmentSource === 'apollo_api';

    console.log(`=== ENRICH COMPANY DETAILS REQUEST ===`);
    console.log(`Lead ID: ${leadId}`);
    console.log(`Domain: ${domain}`);
    console.log(`Enrichment Source: ${enrichmentSource}`);
    console.log(`Direct Apollo: ${isDirectApollo}`);

    // Normalize domain (remove protocol, www, trailing slashes)
    let normalizedDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    console.log(`Normalized Domain: ${normalizedDomain}`);

    // Step 1: Search/Verify in Apollo (skip detailed search if already from Apollo)
    if (isDirectApollo) {
      // Direct retrieval - domain was already found via Apollo
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
      // Need to verify domain exists in Apollo first
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo API error: ${response.status} - ${errorText}`);
      
      // Update step 1 as failed
      if (!isDirectApollo && enrichmentSteps.length > 0) {
        enrichmentSteps[0].status = 'failed';
        enrichmentSteps[0].details = {
          ...enrichmentSteps[0].details,
          error: `Apollo API returned ${response.status}`
        };
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Apollo API returned ${response.status}: ${errorText}`,
          enrichmentSteps
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    console.log("=== APOLLO ORGANIZATION ENRICH RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=== END APOLLO RESPONSE ===");

    const org = data.organization;

    if (!org) {
      // Update step 1 as failed - organization not found
      if (!isDirectApollo && enrichmentSteps.length > 0) {
        enrichmentSteps[0].status = 'failed';
        enrichmentSteps[0].details = {
          ...enrichmentSteps[0].details,
          error: 'Organization not found in Apollo'
        };
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Organization not found in Apollo',
          enrichmentSteps,
          notFound: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update step 1 as success
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
      details: {
        message: 'Retrieving company details...'
      }
    });
    console.log('Step 2: Retrieving company details...');

    // Map Apollo response to database fields
    const updateData: any = {};
    const fieldsPopulated: string[] = [];

    // Size: estimated_num_employees
    if (org.estimated_num_employees) {
      updateData.size = `${org.estimated_num_employees} employees`;
      fieldsPopulated.push('size');
    }

    // Annual Revenue: organization_revenue_printed
    if (org.organization_revenue_printed) {
      updateData.annual_revenue = org.organization_revenue_printed;
      fieldsPopulated.push('annual_revenue');
    }

    // Industry: industries array (join with comma)
    if (org.industries && Array.isArray(org.industries) && org.industries.length > 0) {
      updateData.company_industry = org.industries.join(', ');
      fieldsPopulated.push('company_industry');
    }

    // Description: short_description
    if (org.short_description) {
      updateData.description = org.short_description;
      fieldsPopulated.push('description');
    }

    // Tech Stack: technology_names array (join with comma)
    if (org.technology_names && Array.isArray(org.technology_names) && org.technology_names.length > 0) {
      updateData.tech_stack = org.technology_names.join(', ');
      fieldsPopulated.push('tech_stack');
    }

    // LinkedIn: linkedin_url
    if (org.linkedin_url) {
      updateData.linkedin = org.linkedin_url;
      fieldsPopulated.push('linkedin');
    }

    // Facebook: facebook_url
    if (org.facebook_url) {
      updateData.facebook = org.facebook_url;
      fieldsPopulated.push('facebook');
    }

    // Founded Date: founded_year
    if (org.founded_year) {
      updateData.founded_date = org.founded_year.toString();
      fieldsPopulated.push('founded_date');
    }

    // Logo URL: logo_url
    if (org.logo_url) {
      updateData.logo_url = org.logo_url;
      fieldsPopulated.push('logo_url');
    }

    // Products/Services: Generate intelligent description using Lovable AI
    const companyContext = {
      name: org.name,
      keywords: org.keywords || [],
      industry: org.industry,
      industries: org.industries || [],
      sic_codes: org.sic_codes || [],
      naics_codes: org.naics_codes || [],
      short_description: org.short_description
    };

    // Check if we have enough data to generate a description
    const hasContextData = companyContext.keywords.length > 0 || 
                          companyContext.industry || 
                          companyContext.industries.length > 0 || 
                          companyContext.short_description;

    if (hasContextData) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
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
            } else {
              console.log('AI returned empty response, falling back to keywords');
              if (companyContext.keywords.length > 0) {
                updateData.products_services = companyContext.keywords.join(', ');
                fieldsPopulated.push('products_services');
              }
            }
          } else {
            console.error('AI API error:', aiResponse.status, await aiResponse.text());
            // Fallback to keywords
            if (companyContext.keywords.length > 0) {
              updateData.products_services = companyContext.keywords.join(', ');
              fieldsPopulated.push('products_services');
            }
          }
        } catch (aiError) {
          console.error('Error calling Lovable AI:', aiError);
          // Fallback to keywords
          if (companyContext.keywords.length > 0) {
            updateData.products_services = companyContext.keywords.join(', ');
            fieldsPopulated.push('products_services');
          }
        }
      } else {
        console.log('LOVABLE_API_KEY not configured, falling back to keywords');
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

    console.log("=== UPDATE DATA ===");
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

    console.log(`Successfully enriched company details for lead ${leadId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Company details enriched successfully',
        enrichedFields: fieldsPopulated,
        enrichmentSteps,
        isDirectApollo
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
