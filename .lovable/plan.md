

# Add Industry Google Search with Snippet Storage

## Overview
Create a new "Enrich" button that opens a right-side drawer to search Google for company industry information and store the search snippet in a new database field.

## What This Does
- Adds an "Enrich" button next to the existing "Classify" button in the Industry Enrichment table
- Opens a right-side drawer where you can search Google for company information
- Stores the search result snippet in a new field for reference

## Search Query Format
```
"<Company Name>" "<DMA>" what does this company do
```

Example: `"Acme Corp" "Dallas, TX" what does this company do`

## Changes Required

### 1. Database Migration
Add new column to store the Google snippet:
```sql
ALTER TABLE public.leads 
ADD COLUMN industry_google_snippet text;
```

### 2. New Edge Function
**File: `supabase/functions/search-industry-serper/index.ts`**

- Accepts: `leadId`, `company`, `dma`
- Builds query: `"${company}" "${dma}" what does this company do`
- Calls Serper API (Google search)
- Stores top result snippet in `industry_google_snippet` field
- Returns search results for display in UI

### 3. Frontend Updates
**File: `src/components/IndustryEnrichmentTable.tsx`**

- Add "Enrich" button per row (next to Classify)
- Right-side drawer containing:
  - Company name and DMA display
  - "Find Industry" button with Google icon
  - Collapsible logs showing raw search results
  - Display of stored snippet after search
- Refreshes data after successful search

## UI Flow

```
1. Click "Enrich" button on a lead row
   ↓
2. Right drawer opens showing company info
   ↓
3. Click "Find Industry" (Google icon)
   ↓
4. Search runs: "<Company>" "<DMA>" what does this company do
   ↓
5. Snippet saved to industry_google_snippet
   ↓
6. Results displayed in collapsible logs section
```

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `supabase/functions/search-industry-serper/index.ts` |
| Modify | `supabase/config.toml` (add function config) |
| Modify | `src/components/IndustryEnrichmentTable.tsx` |
| Auto-update | `src/integrations/supabase/types.ts` |

## Technical Notes
- Uses existing `SERPAPI_KEY` secret (already configured)
- Does NOT modify `company_industry` field - only stores snippet
- Drawer uses existing Drawer component with `direction="right"`

