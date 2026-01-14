import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const leadId = payload?.leadId as string | undefined;

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Always fetch the latest lead data from the database to avoid missing fields in client payloads.
    const { data: leadRow, error: leadFetchError } = await supabase
      .from("leads")
      .select(
        "company, company_industry, mics_sector, products_services, size, annual_revenue, founded_date, zipcode, dma, domain, linkedin, facebook, instagram, news"
      )
      .eq("id", leadId)
      .single();

    if (leadFetchError) {
      console.error("Lead fetch error:", leadFetchError);
      throw leadFetchError;
    }

    const company = (payload?.company ?? leadRow?.company) as string | null | undefined;
    const company_industry = (payload?.company_industry ?? leadRow?.company_industry) as
      | string
      | null
      | undefined;
    const mics_sector = (payload?.mics_sector ?? leadRow?.mics_sector) as string | null | undefined;
    const products_services = (payload?.products_services ?? leadRow?.products_services) as
      | string
      | null
      | undefined;
    const size = (payload?.size ?? leadRow?.size) as string | null | undefined;
    const annual_revenue = (payload?.annual_revenue ?? leadRow?.annual_revenue) as string | null | undefined;
    const founded_date = (payload?.founded_date ?? leadRow?.founded_date) as string | null | undefined;
    const zipcode = (payload?.zipcode ?? leadRow?.zipcode) as string | null | undefined;
    const dma = (payload?.dma ?? leadRow?.dma) as string | null | undefined;
    const domain = (payload?.domain ?? leadRow?.domain) as string | null | undefined;
    const linkedin = (payload?.linkedin ?? leadRow?.linkedin) as string | null | undefined;
    const facebook = (payload?.facebook ?? leadRow?.facebook) as string | null | undefined;
    const instagram = (payload?.instagram ?? leadRow?.instagram) as string | null | undefined;
    const news = (payload?.news ?? leadRow?.news) as unknown;

    // Build context sections
    const coreIdentity = [
      company ? `Company: ${company}` : null,
      company_industry ? `Industry: ${company_industry}` : null,
      mics_sector ? `Sector: ${mics_sector}` : null,
      products_services ? `Products/Services: ${products_services}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const businessScale = [
      size ? `Size: ${size} employees` : null,
      annual_revenue ? `Revenue: ${annual_revenue}` : null,
      founded_date ? `Founded: ${founded_date}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const location = [zipcode ? `Zipcode: ${zipcode}` : null, dma ? `DMA/Region: ${dma}` : null]
      .filter(Boolean)
      .join("\n");

    const digitalPresence = [
      domain ? `Website: ${domain}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      facebook ? `Facebook: ${facebook}` : null,
      instagram ? `Instagram: ${instagram}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Parse news JSON and extract formatted items
    let formattedNews = "";
    if (news) {
      try {
        const newsData: any = typeof news === "string" ? JSON.parse(news) : news;
        const items = Array.isArray(newsData)
          ? newsData
          : Array.isArray(newsData?.items)
            ? newsData.items
            : Array.isArray(newsData?.news)
              ? newsData.news
              : [];

        if (items.length > 0) {
          formattedNews = items
            .map((item: any) =>
              `- "${item?.title ?? ""}" (${item?.source ?? item?.publisher ?? "Unknown"}, ${item?.date ?? item?.publishedAt ?? "Unknown date"}): ${item?.snippet ?? item?.summary ?? ""}`
            )
            .join("\n");
        }
      } catch (_e) {
        if (typeof news === "string" && news.length > 10) {
          formattedNews = news;
        }
      }
    }

    const newsSection = formattedNews
      ? `Recent News Articles Found (evaluate relevance carefully):\n${formattedNews}`
      : "";

    const prompt = `Generate Key Insights for this company as SHORT bullet points.

COMPANY INFORMATION:
${coreIdentity}

${businessScale}

${location}

${digitalPresence}

${newsSection}

STRICT RULES:
1. NO prose sentences. NO "what they do" summary.
2. Each bullet is a SHORT fact fragment (not a full sentence)
3. Start each line with "• "
4. Include ONLY these types of facts (if data available):
   - Employee count + revenue (e.g., "21 employees, ~$23.0M revenue")
   - Founded year (e.g., "Founded in 1958")
   - Location with zip (e.g., "Based in Phoenix, AZ (85027)")
   - Core specialty (e.g., "Specializes in post-tensioned concrete and hydrogrid fast-drying courts")
   - Recent acquisition or notable news ONLY if DIRECTLY about this specific company
5. Maximum 5 bullets. Skip any category with no data.
6. NEWS HANDLING - CRITICAL:
   - ONLY include news if the article is DIRECTLY and SPECIFICALLY about "${company ?? "this company"}"
   - IGNORE news that just happens to match keywords
   - IGNORE generic industry news that doesn't mention the company by name
   - If no news is directly relevant to this company, OMIT the news bullet entirely
   - NEVER write "No relevant news found" / "No relevant recent news" / similar

Generate the bullet points now:`;

    console.log("Generating Must Knows for lead:", leadId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You output ONLY bullet points with short fact fragments. No prose. No full sentences. No 'what they do' summaries.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawMustKnows = (aiData.choices?.[0]?.message?.content as string | undefined)?.trim();

    if (!rawMustKnows) {
      throw new Error("No content generated from AI");
    }

    // Post-process to enforce rule compliance and remove forbidden "no news" bullets.
    const mustKnows = rawMustKnows
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/(no\s+relevant\s+(recent\s+)?news|no\s+recent\s+news)/i.test(l))
      .slice(0, 5)
      .map((l) => {
        const cleaned = l.replace(/^[-•*]\s*/, "").trim();
        return cleaned ? `• ${cleaned}` : "";
      })
      .filter(Boolean)
      .join("\n");

    if (!mustKnows) {
      throw new Error("AI output contained no valid bullet points");
    }

    console.log("Generated Must Knows:", mustKnows);

    // Update the lead with the generated must_knows
    const { error: updateError } = await supabase
      .from("leads")
      .update({ must_knows: mustKnows })
      .eq("id", leadId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, must_knows: mustKnows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in generate-must-knows:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
