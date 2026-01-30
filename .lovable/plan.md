
# Add Industry Filter and Source Column to Industry Enrichment Table

## Overview
Add filtering capability to show only leads with enriched industries, and display a "Source" column that shows where the industry data came from (Clay, Apollo, or AI).

## Understanding Industry Sources

Based on the codebase analysis, industry data can come from three sources:

1. **Clay** - When `clay_company_enrichment.industry_clay` exists for a lead
2. **Apollo** - When enrichment came from Apollo's organization API (stored in `scraped_data_log.apollo_data.industries`)
3. **AI** - When industry was set via the `enrich-industry` edge function using Lovable AI

## Implementation

### 1. Update Lead Interface
Add the `scraped_data_log` field to the `Lead` interface in `IndustryEnrichmentTable.tsx` to access Apollo enrichment data.

### 2. Add Filter State and UI
Add a filter dropdown above the table with options:
- "All Leads" (default)
- "Enriched Only" (leads with `company_industry` not null)
- "Not Enriched" (leads with `company_industry` is null)

### 3. Add Source Column
Add a new "Source" column to the table that determines the industry source:
- Query the `clay_company_enrichment` table to check if `industry_clay` matches `company_industry`
- Check `scraped_data_log.apollo_data.industry` for Apollo source
- Default to "AI" for industries set via the enrich-industry function

### 4. Fetch Clay Company Enrichments
Fetch `clay_company_enrichment` data for all leads to determine which industries came from Clay.

## Technical Details

### Modified Files
- `src/components/IndustryEnrichmentTable.tsx` - Add filter, source column, and Clay data fetching

### Filter Implementation
```text
+------------------+
| Filter Dropdown  |
+------------------+
| All Leads        | <- shows all leads
| Enriched Only    | <- shows leads with company_industry
| Not Enriched     | <- shows leads without company_industry
+------------------+
```

### Source Logic (pseudo-code)
```text
function getIndustrySource(lead, clayEnrichment):
  if clayEnrichment.industry_clay exists:
    return "Clay"
  else if lead.scraped_data_log?.apollo_data?.industry exists:
    return "Apollo"
  else if lead.company_industry exists:
    return "AI"
  else:
    return "-"
```

### Updated Table Structure
```text
+------+-------+-------+---------+-----+----------+--------+------------+--------+
| Name | Phone | Email | Company | DMA | Industry | Source | MICS Title | Action |
+------+-------+-------+---------+-----+----------+--------+------------+--------+
| ...  | ...   | ...   | ...     | ... | Retail   | Clay   | ...        | [...]  |
| ...  | ...   | ...   | ...     | ... | Tech     | Apollo | ...        | [...]  |
| ...  | ...   | ...   | ...     | ... | Services | AI     | ...        | [...]  |
+------+-------+-------+---------+-----+----------+--------+------------+--------+
```

## Files to Modify
1. **`src/components/IndustryEnrichmentTable.tsx`**
   - Add `industryFilter` state
   - Add filter dropdown UI using existing Select component
   - Add `clayCompanyEnrichments` state and fetch effect
   - Add Source column with logic to determine source
   - Update `colSpan` for empty state
   - Update table min-width for new column

## Summary
This adds the ability to filter leads by industry enrichment status and shows where each industry value came from, making it easier to understand and audit the enrichment data.
