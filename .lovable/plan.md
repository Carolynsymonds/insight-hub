
# Add Domain Source Column to CSV Export

## Overview
Add a new "Domain Source" column to the CSV export that indicates whether the domain was found via Apollo, Google, or Email.

## Technical Implementation

### File: `src/pages/Index.tsx`

**1. Add "Domain Source" to headers array (line 1060):**
```typescript
const headers = [
  "Name", "Email", "Company", "Zipcode", "DMA",
  "Company Website", "Domain Source", // NEW COLUMN
  "Company Match Score", "Industry", "Company Revenue", "Company Size",
  "Founded", "Valid Company LinkedIn", "Valid Company Facebook", "Company Summary", "Company Contacts",
  "Company News", "Key Insights", "Products & Services", "Contact Job Title", "Contact Phone",
  "Contact Summary", "Contact LinkedIn", "Contact Facebook", "Contact YouTube"
];
```

**2. Add helper function to determine domain source (before `handleExportCSV`):**
```typescript
const getDomainSource = (enrichmentSource: string | null): string => {
  if (enrichmentSource === 'email_domain_verified') {
    return 'Email';
  } else if (enrichmentSource === 'apollo_api') {
    return 'Apollo';
  } else if (enrichmentSource === 'google_knowledge_graph' || enrichmentSource === 'google_local_results') {
    return 'Google';
  }
  return '';
};
```

**3. Add domain source value to row data (line 1175, after domain):**
```typescript
return [
  lead.full_name || "",
  lead.email || "",
  lead.company || "",
  lead.zipcode || "",
  lead.dma || "",
  lead.domain || "",
  getDomainSource(lead.enrichment_source), // NEW VALUE
  lead.match_score !== null ? `${lead.match_score}%` : "",
  // ... rest of columns
];
```

## CSV Output Example

| Name | Email | Company | ... | Company Website | Domain Source | Company Match Score |
|------|-------|---------|-----|-----------------|---------------|---------------------|
| John Smith | john@acme.com | Acme Corp | ... | acme.com | Email | 99% |
| Sarah Lee | sarah@tech.io | Tech Inc | ... | techinc.com | Apollo | 85% |
| Bob Wilson | bob@example.com | Example LLC | ... | example.org | Google | 72% |

## Source Mapping

| `enrichment_source` value | CSV Display |
|---------------------------|-------------|
| `email_domain_verified` | Email |
| `apollo_api` | Apollo |
| `google_knowledge_graph` | Google |
| `google_local_results` | Google |
| `null` or other | (empty) |

## Files to Modify
1. **`src/pages/Index.tsx`** - Add helper function, update headers, and add column value to row mapping
