
# Replace Domain Source with SOURCE Column

## Overview
Remove the old "Domain Source" logic/column and rename "SOURCE v2" to just "SOURCE". This simplifies the codebase by keeping only the enrichment_logs-based source detection.

## Current State
1. **Domain Source filter** - Uses `domainSourceFilter` state and `getDomainSource()` function
2. **SOURCE v2 filter** - Uses `sourceV2Filter` state and `getSourceV2()` function
3. **CSV Export** - Has both "Domain Source" and "SOURCE v2" columns

## Changes Required

### File: `src/pages/Index.tsx`

**1. Remove `domainSourceFilter` state declaration (line 77):**
- Delete: `const [domainSourceFilter, setDomainSourceFilter] = useState<'all' | 'email' | 'search'>('all');`

**2. Rename `sourceV2Filter` to `sourceFilter` (line 78):**
- Change to: `const [sourceFilter, setSourceFilter] = useState<'all' | 'apollo' | 'google' | 'email'>('all');`

**3. Remove Domain Source filter logic (lines 1051-1072):**
- Delete the entire `domainSourceFilter` block that checks `email` and `search` sources

**4. Update SOURCE v2 filter to use `sourceFilter` (lines 1075-1097):**
- Rename comment from "SOURCE v2 filter" to "SOURCE filter"
- Replace all `sourceV2Filter` references with `sourceFilter`

**5. Remove `getDomainSource` helper function (lines 1110-1131):**
- Delete the entire function

**6. Rename `getSourceV2` to `getSource` (lines 1133-1154):**
- Update function name and comment

**7. Update CSV headers (line 1157-1163):**
- Remove "Domain Source"
- Rename "SOURCE v2" to "SOURCE"

**8. Update CSV row mapping (lines 1273-1274):**
- Remove: `getDomainSource(lead.enrichment_source, lead.email, lead.domain),`
- Change: `getSourceV2(lead.enrichment_logs),` to `getSource(lead.enrichment_logs),`

**9. Remove Domain Source filter UI (lines 1593-1605):**
- Delete the entire Domain Source `<Select>` component

**10. Update SOURCE v2 filter UI (lines 1606-1619):**
- Update state references from `sourceV2Filter` to `sourceFilter`
- Update label from "SOURCE v2" to "SOURCE"
- Update SelectItem labels to just show source names

## Result
- Single "SOURCE" column in CSV export showing which enrichment sources found a domain
- Single "SOURCE" filter dropdown in the UI
- Cleaner, simpler codebase with one unified approach
