

# Update "From Email" Filter to Include All Email-Related Sources

## Overview
Expand the "From Email" filter to capture all leads where email domain extraction was attempted, not just successfully verified ones.

## Current Issue
The filter only matches `email_domain_verified`, missing 107 additional leads with other email-related sources.

## Email Sources to Include

| Source | Count | Description |
|--------|-------|-------------|
| `email_domain_verified` | 29 | Email domain was verified |
| `email_personal_domain_skipped` | 98 | Personal email domain (Gmail, Yahoo, etc.) was skipped |
| `email_domain_not_verified` | 8 | Email domain extraction attempted but not verified |
| `email_invalid_format` | 1 | Email had invalid format |

## Technical Implementation

### File: `src/pages/Index.tsx`

**Update filtering logic (lines 1043-1047):**

Current:
```typescript
if (domainSourceFilter === 'email') {
  if (lead.enrichment_source !== 'email_domain_verified') return false;
}
```

Updated:
```typescript
if (domainSourceFilter === 'email') {
  const emailSources = [
    'email_domain_verified',
    'email_personal_domain_skipped', 
    'email_domain_not_verified',
    'email_invalid_format'
  ];
  if (!emailSources.includes(lead.enrichment_source)) return false;
}
```

## Result
After this change, the "From Email" filter will show all 136 leads where email-based domain extraction was attempted, providing a complete view of email-sourced leads.

## Files to Modify
1. **`src/pages/Index.tsx`** - Update the email filter condition to include all email-related enrichment sources

