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
    const { csvData } = await req.json();

    if (!csvData) {
      return new Response(
        JSON.stringify({ error: "csvData is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse CSV
    const lines = csvData.trim().split("\n");
    const records: Array<{
      naics_code: string;
      naics_title: string;
      mics_code: string | null;
      mics_title: string | null;
    }> = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle CSV with quoted fields
      const parts = parseCSVLine(line);
      if (parts.length >= 2) {
        records.push({
          naics_code: parts[0].trim(),
          naics_title: parts[1].trim(),
          mics_code: parts[2]?.trim() || null,
          mics_title: parts[3]?.trim() || null,
        });
      }
    }

    console.log(`Parsed ${records.length} NAICS codes`);

    // Clear existing data and insert new
    await supabase.from("naics_codes").delete().neq("naics_code", "");

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from("naics_codes").insert(batch);
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
        throw new Error(`Failed to insert batch: ${error.message}`);
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, imported: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("import-naics-codes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
