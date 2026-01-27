

# Update CSV Export Domain Source Logic

## Overview
Update the `getDomainSource` helper function to return "Email" for all email-related enrichment sources, matching the filter logic.

## Technical Implementation

### File: `src/pages/Index.tsx`

**Update `getDomainSource` function (lines 1064-1073):**

```typescript
const getDomainSource = (enrichmentSource: string | null): string => {
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

## Result
After this change, all 136 email-related leads will show "Email" in the Domain Source column when exported to CSV, consistent with the filter behavior.

## Files to Modify
1. **`src/pages/Index.tsx`** - Update `getDomainSource` helper to include all email-related sources

