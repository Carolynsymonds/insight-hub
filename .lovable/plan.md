

# Update "Enrichment Socials" Filter to Require Valid Socials

## Overview
Update the "Enrichment Socials" filter to only show leads where at least one social media profile has been validated. Leads with socials that are found but marked as invalid should NOT be included.

## Current Issue
The current logic only checks if a social field exists:
```typescript
const hasSocials = lead.facebook || lead.linkedin || lead.instagram;
```

This incorrectly includes leads where socials were found but later marked as invalid during validation.

## Updated Classification Logic

| Enrichment Type | Current Condition | New Condition |
|----------------|-------------------|---------------|
| **Enrichment Socials** | `facebook`, `linkedin`, or `instagram` is non-null | At least one of `facebook_validated`, `linkedin_validated`, or `instagram_validated` is `true` |

## Technical Implementation

### File: `src/pages/Index.tsx`

**Update filter logic (lines 1080-1083):**

Change from:
```typescript
} else if (enrichmentTypeFilter === 'socials') {
  // Show leads that have at least one social found
  const hasSocials = lead.facebook || lead.linkedin || lead.instagram;
  if (!hasSocials) return false;
}
```

To:
```typescript
} else if (enrichmentTypeFilter === 'socials') {
  // Show leads that have at least one VALID social found
  // Socials that are found but marked invalid should not count
  const hasValidSocials = 
    lead.facebook_validated === true || 
    lead.linkedin_validated === true || 
    lead.instagram_validated === true;
  if (!hasValidSocials) return false;
}
```

## Result
- Leads with "Socials found but invalid" will NOT appear when filtering by "Enrichment Socials"
- Only leads where at least one social profile has been validated will be shown

## Files to Modify
1. **`src/pages/Index.tsx`** - Update the `enrichmentTypeFilter === 'socials'` condition

