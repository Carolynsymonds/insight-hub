

# Add Google Snippet to NAICS Classification Prompt

## Overview
Update the NAICS classification process to include the `industry_google_snippet` field in the AI prompt, giving the classifier more context about what the company does based on Google search results.

## Changes Required

### 1. Frontend: `src/components/IndustryEnrichmentTable.tsx`

Pass the `industry_google_snippet` field to the edge function in both locations:

**`handleClassifyNaics` function (~line 204-211)**:
```typescript
body: {
  leadId: lead.id,
  company: lead.company,
  industry: lead.company_industry,
  description: lead.description,
  googleSnippet: lead.industry_google_snippet,  // ADD THIS
},
```

**`handleBulkClassify` function (~line 142-149)**:
```typescript
body: {
  leadId: lead.id,
  company: lead.company,
  industry: lead.company_industry,
  description: lead.description,
  googleSnippet: lead.industry_google_snippet,  // ADD THIS
},
```

### 2. Edge Function: `supabase/functions/classify-naics/index.ts`

**Extract the new parameter (line 15)**:
```typescript
const { leadId, company, industry, description, googleSnippet } = await req.json();
```

**Update the prompt (lines 29-34)**:
```typescript
const prompt = `Given the following company information:
- Company name: ${company || "Unknown"}
- Industry: ${industry || "Unknown"}
- Nature of the business: ${description || "Unknown"}
- Google search context: ${googleSnippet || "Not available"}

Categorise company into a best guess of which industry they operate in, using the NAICS 2022 list. Determine your confidence in percentage.`;
```

## Result
The AI classifier will now have access to real-world search snippets about the company, improving classification accuracy especially when the company name or description is vague.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/IndustryEnrichmentTable.tsx` | Add `googleSnippet` to both function invoke calls |
| `supabase/functions/classify-naics/index.ts` | Extract `googleSnippet` param and include in prompt |

