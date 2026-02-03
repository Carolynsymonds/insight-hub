

# Store All Search Snippets from Industry Search

## Problem
Currently, the `search-industry-serper` function fetches 5 search results from Google but only stores the first snippet in `industry_google_snippet`. This loses valuable context from other search results.

## Solution
Combine all snippets from the top search results into a single text field, giving more comprehensive industry context.

## Changes Required

### 1. Modify Edge Function: `supabase/functions/search-industry-serper/index.ts`

Update the logic to combine all snippets instead of just storing the first one:

**Current behavior (lines 73-76)**:
```typescript
// Store first snippet
if (!topSnippet && result.snippet) {
  topSnippet = result.snippet;
}
```

**New behavior** - Collect all snippets and combine them:
```typescript
// Collect all snippets
const allSnippets: string[] = [];
for (let i = 0; i < Math.min(5, data.organic_results.length); i++) {
  const result = data.organic_results[i];
  // ... existing result processing ...
  
  if (result.snippet) {
    allSnippets.push(result.snippet);
  }
}

// Combine all snippets with separator
const combinedSnippet = allSnippets.join(" | ");
```

Then update the database with `combinedSnippet` instead of just `topSnippet`.

### 2. Deploy Edge Function

The function will be automatically redeployed after the change.

## Result
Instead of storing only:
> "From shingle roofs to flat roofs, our amazing technicians guarantee quality workmanship..."

It will store all snippets combined:
> "From shingle roofs to flat roofs, our amazing technicians guarantee quality workmanship... | Choice Roofing is a full-service roofing company serving the Dallas-Fort Worth area... | Founded in 2015, Choice Roofing specializes in residential and commercial..."

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/search-industry-serper/index.ts` | Combine all snippets instead of storing only the first |

