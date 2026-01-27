
# Add Domain Source Filter to Leads Table

## Overview
Add a new filter dropdown that allows users to filter leads based on how the domain was found:
- **All Sources** - Show all leads (default)
- **Email Domain** - Show leads where domain was extracted from contact's email
- **Search (Apollo/Google)** - Show leads where domain was found via Apollo API or Google search

## Current Data Distribution
Based on database query:
| Source | Count |
|--------|-------|
| Google Knowledge Graph | 84 |
| Google Local Results | 54 |
| Email Domain Verified | 29 |
| Apollo API | 16 |

## Technical Implementation

### File: `src/pages/Index.tsx`

**1. Add new state variable (around line 74):**
```typescript
const [domainSourceFilter, setDomainSourceFilter] = useState<'all' | 'email' | 'search'>('all');
```

**2. Add filtering logic in the `filteredLeads` filter function (around line 1039, before `return true`):**
```typescript
// Domain source filter
if (domainSourceFilter !== 'all') {
  if (domainSourceFilter === 'email') {
    // Only show leads where domain came from email
    return lead.enrichment_source === 'email_domain_verified';
  }
  if (domainSourceFilter === 'search') {
    // Show leads where domain came from Apollo or Google search
    return lead.enrichment_source === 'apollo_api' || 
           lead.enrichment_source === 'google_knowledge_graph' || 
           lead.enrichment_source === 'google_local_results';
  }
}
```

**3. Add new filter dropdown in the filter bar (after the date filter, around line 1476):**
```typescript
<Select 
  value={domainSourceFilter} 
  onValueChange={(value: 'all' | 'email' | 'search') => setDomainSourceFilter(value)}
>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Domain Source" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Sources</SelectItem>
    <SelectItem value="email">From Email</SelectItem>
    <SelectItem value="search">From Search</SelectItem>
  </SelectContent>
</Select>
```

## Filter Behavior

| Filter Value | `enrichment_source` Values Shown |
|-------------|-----------------------------------|
| All Sources | All leads (no filtering by source) |
| From Email | `email_domain_verified` only |
| From Search | `apollo_api`, `google_knowledge_graph`, `google_local_results` |

## Files to Modify
1. **`src/pages/Index.tsx`**
   - Add `domainSourceFilter` state
   - Add filter logic to `filteredLeads`
   - Add dropdown UI in filter bar

## UI Location
The new dropdown will appear in the filter bar next to the existing "Date" filter dropdown, maintaining consistent styling with the existing filters.
