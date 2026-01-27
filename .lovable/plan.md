

# Add "SOURCE v2" Column to CSV Export

## Overview
Add a new "SOURCE v2" column to the CSV export that shows which enrichment sources found a valid domain with confidence >= 50%. This column will list all qualifying sources (Apollo, Google, Email) based on the `enrichment_logs` data.

## How It Works
The `enrichment_logs` field is a JSONB array where each entry contains:
- `source`: The enrichment source (e.g., "apollo_api", "google_knowledge_graph", "email_domain_verified")
- `domain`: The domain found (or null if not found)
- `confidence`: The confidence percentage (0-100)

Example from screenshot:
- Apollo: domain "midasfoods.com" with 95% confidence → **Include "Apollo"**
- Google: domain "midas.com" with 10% confidence → **Exclude** (below 50%)
- Email: No domain found → **Exclude**

## Technical Implementation

### File: `src/pages/Index.tsx`

**1. Add a helper function to parse enrichment logs and extract qualifying sources:**

```typescript
const getSourceV2 = (enrichmentLogs: any): string => {
  if (!enrichmentLogs || !Array.isArray(enrichmentLogs)) return '';
  
  const qualifyingSources: string[] = [];
  
  for (const log of enrichmentLogs) {
    // Skip if no domain found or confidence < 50
    if (!log.domain || (log.confidence !== undefined && log.confidence < 50)) continue;
    
    // Map source to friendly name
    if (log.source === 'apollo_api' && !qualifyingSources.includes('Apollo')) {
      qualifyingSources.push('Apollo');
    } else if ((log.source === 'google_knowledge_graph' || log.source === 'google_local_results') && !qualifyingSources.includes('Google')) {
      qualifyingSources.push('Google');
    } else if (log.source === 'email_domain_verified' && !qualifyingSources.includes('Email')) {
      qualifyingSources.push('Email');
    }
  }
  
  return qualifyingSources.join(', ');
};
```

**2. Add "SOURCE v2" to the CSV headers (after "Domain Source"):**

Current headers array (around line 1109):
```typescript
const headers = [
  "Name", "Email", "Company", "Zipcode", "DMA",
  "Company Website", "Domain Source", "Company Match Score", ...
];
```

Updated:
```typescript
const headers = [
  "Name", "Email", "Company", "Zipcode", "DMA",
  "Company Website", "Domain Source", "SOURCE v2", "Company Match Score", ...
];
```

**3. Add the new column value in the row mapping (around line 1225):**

Current:
```typescript
return [
  lead.full_name || "",
  lead.email || "",
  lead.company || "",
  lead.zipcode || "",
  lead.dma || "",
  lead.domain || "",
  getDomainSource(lead.enrichment_source, lead.email, lead.domain),
  lead.match_score !== null ? `${lead.match_score}%` : "",
  ...
];
```

Updated:
```typescript
return [
  lead.full_name || "",
  lead.email || "",
  lead.company || "",
  lead.zipcode || "",
  lead.dma || "",
  lead.domain || "",
  getDomainSource(lead.enrichment_source, lead.email, lead.domain),
  getSourceV2(lead.enrichment_logs),
  lead.match_score !== null ? `${lead.match_score}%` : "",
  ...
];
```

## Expected Output Examples

| Domain Source | SOURCE v2 | Explanation |
|--------------|-----------|-------------|
| Email | Apollo, Email | Apollo found domain at 95%, Email also verified at 95% |
| Google | Apollo, Google | Both found domains with 50%+ confidence |
| Apollo | Apollo | Only Apollo found a domain with 50%+ confidence |
| Email | (empty) | Domain matches email, but no sources have 50%+ confidence in enrichment_logs |

## Files to Modify
1. **`src/pages/Index.tsx`** - Add `getSourceV2` helper function, update headers array, and add column to row mapping

