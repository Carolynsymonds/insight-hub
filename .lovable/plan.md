
# Empty Match Score for "Socials Only" Enrichment in CSV Export

## Overview
When a lead was enriched only via social profiles (no domain found), the Match Score column in the CSV export should be empty instead of showing "0%". Match Score measures confidence in the lead-to-company **website** match, so it's not applicable when there's no domain.

## Technical Change

### File: `src/pages/Index.tsx`

**Update match score export logic (line 1251):**

Change:
```typescript
lead.match_score !== null ? `${lead.match_score}%` : "",
```

To:
```typescript
// Only show match score if lead has a domain (match score is about domain confidence)
// Socials-only enrichments should have empty match score
(hasDomain && lead.match_score !== null) ? `${lead.match_score}%` : "",
```

This uses the existing `hasDomain` variable (already calculated on line 1232) to conditionally include the match score only when a domain exists.

## Result
- Leads with `enrichmentType === "Socials"` will have an empty Match Score column
- Leads with `enrichmentType === "Company Domain"` or `"Company Domain, Socials"` will show their match score as before
- This correctly reflects that Match Score measures domain match confidence

## Files to Modify
1. **`src/pages/Index.tsx`** - Line 1251: Add `hasDomain` condition to match score export
