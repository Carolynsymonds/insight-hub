

# Update Domain Source Logic to Prioritize Email Validation

## Overview
Update the `getDomainSource` function to prioritize email domain validation status. When a lead's domain has been validated via email (`email_domain_validated = true`), it should show "Email" as the domain source in the CSV export, regardless of how the domain was originally discovered.

## Current Issue
- Lead `amanda@elegantjohns.com` has `enrichment_source = google_knowledge_graph`
- But also has `email_domain_validated = true` (showing 95% confidence and VALID in UI)
- Current logic only checks `enrichment_source`, so CSV shows "Google" instead of "Email"

## Technical Implementation

### File: `src/pages/Index.tsx`

**1. Update `getDomainSource` function signature to accept both parameters:**

```typescript
const getDomainSource = (enrichmentSource: string | null, emailDomainValidated: boolean | null): string => {
  // Prioritize email domain validation - if domain matches email, show "Email"
  if (emailDomainValidated === true) {
    return 'Email';
  }
  
  const emailSources = [
    'email_domain_verified',
    'email_personal_domain_skipped',
    'email_domain_not_verified',
    'email_invalid_format'
  ];
  
  if (emailSources.includes(enrichmentSource || '')) {
    return 'Email';
  } else if (enrichmentSource === 'apollo_api') {
    return 'Apollo';
  } else if (enrichmentSource === 'google_knowledge_graph' || enrichmentSource === 'google_local_results') {
    return 'Google';
  }
  return '';
};
```

**2. Update the function call in CSV export:**

```typescript
getDomainSource(lead.enrichment_source, lead.email_domain_validated),
```

## Result
After this change:
- Leads where the domain matches the email address (validated via email) will show "Email" in the CSV
- This includes `amanda@elegantjohns.com` which will now correctly show "Email" instead of "Google"
- The logic prioritizes the email validation status over the original enrichment source

## Files to Modify
1. **`src/pages/Index.tsx`** - Update `getDomainSource` function signature and call site

