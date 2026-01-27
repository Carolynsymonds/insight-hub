

# Update "From Email" Filter to Check Email Domain Validation

## Overview
Update the domain source filter to also check the `email_domain_validated` field, matching the logic we added to the CSV export. This ensures leads like `elegantjohns.com` appear when filtering by "From Email" because their domain matches their email address.

## Current Issue
- Lead `amanda@elegantjohns.com` has `enrichment_source = google_knowledge_graph`
- But also has `email_domain_validated = true`
- The filter only checks `enrichment_source`, so it gets excluded from "From Email" filter
- The CSV export was updated to prioritize `email_domain_validated`, but the filter was not

## Technical Implementation

### File: `src/pages/Index.tsx`

**Update filter logic (lines 1044-1052):**

Current:
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

Updated:
```typescript
if (domainSourceFilter === 'email') {
  // Prioritize email domain validation - if domain matches email, include it
  if (lead.email_domain_validated === true) {
    // Domain was validated via email, include this lead
  } else {
    // Fall back to checking enrichment_source
    const emailSources = [
      'email_domain_verified',
      'email_personal_domain_skipped',
      'email_domain_not_verified',
      'email_invalid_format'
    ];
    if (!emailSources.includes(lead.enrichment_source)) return false;
  }
}
```

## Result
After this change:
- Leads where `email_domain_validated = true` will appear in the "From Email" filter
- This includes `amanda@elegantjohns.com` which will now correctly show when filtering by email
- The filter logic matches the CSV export logic for consistency

## Files to Modify
1. **`src/pages/Index.tsx`** - Update the email filter condition to also check `email_domain_validated`

