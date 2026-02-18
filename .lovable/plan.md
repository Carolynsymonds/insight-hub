

# Find News Enrichment Action

## Overview
Add a "Find News" button inside the enrichment drawer that searches for commercially relevant news about a company using SerpAPI, then uses AI to analyze results and return a structured verdict with event type, headline, summary, confidence, and recency.

## Changes

### 1. New Edge Function: `find-commercial-news`
**File: `supabase/functions/find-commercial-news/index.ts`**

- Accepts `leadId`, `company`, and optional `domain`
- Constructs SerpAPI search query: `"{{company}}" AND (funding OR expansion OR partnership OR launch)`
- Fetches top 10 Google search results via SerpAPI
- Sends results to Lovable AI (`google/gemini-3-flash-preview`) with a system prompt that:
  - Only considers results clearly about the correct company
  - Ignores similarly named companies, blog spam, directories, job boards
  - Uses tool calling to return structured output
- Uses tool calling to extract one of two structured responses:

**If relevant news found:**
```json
{
  "news_found": true,
  "event_type": "funding",
  "headline": "Acme Corp raises $50M Series B",
  "event_summary": "Acme Corp announced a $50M Series B round led by Sequoia Capital to expand fleet operations.",
  "source_url": "https://techcrunch.com/...",
  "estimated_recency": "recent",
  "confidence_score": 85
}
```

**If no relevant news:**
```json
{
  "news_found": false,
  "reason": "Search results reference similarly named companies, none match the target in Dallas, TX.",
  "confidence_score": 70
}
```

- Stores the result as JSON in the lead's `news` field
- Returns the structured result to the frontend

**Secrets used (all already configured):**
- `SERPAPI_KEY` for Google search
- `LOVABLE_API_KEY` for AI analysis

### 2. Update `supabase/config.toml`
- Add `[functions.find-commercial-news]` with `verify_jwt = false`

### 3. Update Drawer UI
**File: `src/components/AdvancedCompanySignals.tsx`**

Replace the placeholder content in the drawer body with:
- A "Find News" button (with `Newspaper` icon) to trigger the search
- Loading spinner while processing
- Results display:
  - **If news found**: Event type badge, headline, event summary, source link, recency tag, and confidence bar
  - **If no news**: "No commercially relevant news found" with the AI's reason
- If the lead already has news data in its `news` field, display existing results with option to re-run

## Technical Details

### AI Tool Calling Schema
The edge function uses tool calling (not raw JSON prompting) to extract structured output:

```text
Tool: analyze_company_news
Parameters:
  - news_found: boolean
  - event_type: enum [funding, expansion, partnership, launch, acquisition, contract, other]
  - headline: string (max 20 words)
  - event_summary: string (1-2 sentences)
  - source_url: string
  - estimated_recency: enum [recent, 6-12 months, old, unknown]
  - confidence_score: integer 0-100
  - reason: string (only when news_found=false)
```

### System Prompt (key instructions)
- "Only consider results clearly referring to the correct company"
- "Use the company domain (if provided) to validate matches"
- "Ignore similarly named companies, blog spam, directories, job boards"
- "If uncertain whether a result is about the correct company, exclude it"

### UI States in Drawer
1. **Idle** -- "Find News" button visible
2. **Loading** -- Spinner with "Searching for commercial news..."
3. **Result (found)** -- Event type badge, headline, summary, source link, recency, confidence
4. **Result (not found)** -- Muted message with AI reason and confidence
5. **Error** -- Toast notification with retry option

