

# Add "Enrichment Type" Filter

## Overview
Add a new filter dropdown called "Enrichment Type" that allows users to filter leads by what type of enrichment they have:
- **All** (default) - Shows all leads
- **Enrichment Company Domain** - Shows leads that have a domain (from any source: Apollo, Google, or Email)
- **Enrichment Socials** - Shows leads that have social media information found

## Classification Logic

| Enrichment Type | Condition |
|----------------|-----------|
| **Enrichment Company Domain** | Lead has a non-null `domain` field |
| **Enrichment Socials** | Lead has at least one social found: `facebook`, `linkedin`, or `instagram` is non-null |

## Technical Implementation

### File: `src/pages/Index.tsx`

**1. Add new state variable (around line 77, after `sourceFilter`):**

```typescript
const [enrichmentTypeFilter, setEnrichmentTypeFilter] = useState<'all' | 'company_domain' | 'socials'>('all');
```

**2. Add filter logic in the `filteredLeads` computation (after the SOURCE filter block, around line 1095):**

```typescript
// Enrichment Type filter
if (enrichmentTypeFilter !== 'all') {
  if (enrichmentTypeFilter === 'company_domain') {
    // Show leads that have a domain (from any source)
    if (!lead.domain) return false;
  } else if (enrichmentTypeFilter === 'socials') {
    // Show leads that have at least one social found
    const hasSocials = lead.facebook || lead.linkedin || lead.instagram;
    if (!hasSocials) return false;
  }
}
```

**3. Add filter dropdown UI (after the SOURCE filter Select, around line 1555):**

```tsx
<Select 
  value={enrichmentTypeFilter} 
  onValueChange={(value: 'all' | 'company_domain' | 'socials') => setEnrichmentTypeFilter(value)}
>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Enrichment Type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Enrichment Types</SelectItem>
    <SelectItem value="company_domain">Enrichment Company Domain</SelectItem>
    <SelectItem value="socials">Enrichment Socials</SelectItem>
  </SelectContent>
</Select>
```

## Filter Bar Layout

The filter bar will show:
1. View Mode buttons (Company | Contact | View All)
2. Domain Status dropdown
3. Date dropdown
4. SOURCE dropdown
5. **Enrichment Type dropdown** ← NEW
6. "Showing X of Y leads" text

## Files to Modify
1. **`src/pages/Index.tsx`** - Add state, filter logic, and dropdown UI

