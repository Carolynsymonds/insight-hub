
# Replace "Social Status" with "Enrichment Type" in CSV Export

## Overview
Remove the "Social Status" column from the CSV export and replace it with an "Enrichment Type" column that shows the classification of each lead's enrichment results.

## Enrichment Type Logic
Based on the existing filter implementation:

| Value | Condition |
|-------|-----------|
| `Company Domain` | Lead has a non-null `domain` field |
| `Socials` | Lead has at least one validated social (`facebook_validated`, `linkedin_validated`, or `instagram_validated` is `true`) |
| `Company Domain, Socials` | Lead has BOTH a domain AND validated socials |
| *(empty)* | Lead has neither |

## Technical Changes

### File: `src/pages/Index.tsx`

**1. Update header (line 1121):**

Change:
```typescript
"Founded", "Valid Company LinkedIn", "Valid Company Facebook", "Social Status", "Company Summary", ...
```

To:
```typescript
"Founded", "Valid Company LinkedIn", "Valid Company Facebook", "Enrichment Type", "Company Summary", ...
```

**2. Replace social status logic (lines 1227-1248):**

Change:
```typescript
// Determine social status
const hasValidSocial = ...
...
let socialStatus = "";
if (hasValidSocial) {
  socialStatus = "valid";
} else if (validationsRun && hasSocialUrls) {
  socialStatus = "socials found but invalid";
} else if (validationsRun && !hasSocialUrls) {
  socialStatus = "socials not found";
}
```

To:
```typescript
// Determine enrichment type
const hasValidSocials = 
  lead.facebook_validated === true ||
  lead.linkedin_validated === true ||
  lead.instagram_validated === true;
const hasDomain = lead.domain !== null && lead.domain !== "";

let enrichmentType = "";
if (hasDomain && hasValidSocials) {
  enrichmentType = "Company Domain, Socials";
} else if (hasDomain) {
  enrichmentType = "Company Domain";
} else if (hasValidSocials) {
  enrichmentType = "Socials";
}
```

**3. Update return array (line 1265):**

Change:
```typescript
socialStatus,
```

To:
```typescript
enrichmentType,
```

## Result
- CSV will show "Enrichment Type" column instead of "Social Status"
- Values will be: "Company Domain", "Socials", "Company Domain, Socials", or empty
- Matches the filter dropdown logic exactly

## Files to Modify
1. **`src/pages/Index.tsx`** - Update header, logic, and row mapping
