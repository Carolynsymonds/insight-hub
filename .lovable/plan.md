
# Industry Enrichment Category Selection

## Overview
This plan implements a two-step flow for the Industry Enrichment view: first display a category selection grid (matching the existing home page design), then show the Industry Enrichment table filtered by the selected category.

## Current Behavior
- Clicking "Industry Enrichment" in the sidebar immediately shows the full table with all leads
- A dropdown filter exists in the table header to filter by category

## Proposed Behavior
1. Clicking "Industry Enrichment" shows a category selection grid (same design as home page)
2. Each category card displays the category name and lead count
3. Clicking a category card shows the Industry Enrichment table filtered to that category
4. A "Back to Categories" navigation allows returning to the selection grid

---

## Technical Implementation

### 1. Add State for Industry Enrichment Category Selection
**File**: `src/pages/Index.tsx`

Add a new state variable to track the selected category specifically for Industry Enrichment:

```typescript
const [industryEnrichmentCategory, setIndustryEnrichmentCategory] = useState<string | null>(null);
```

### 2. Reset Category on View Change
**File**: `src/pages/Index.tsx`

Update `handleViewChange` to reset the industry enrichment category when switching views:

```typescript
const handleViewChange = (view: string) => {
  setActiveView(view);
  if (view === "home") {
    setSelectedCategory(null);
  }
  // Reset industry enrichment category when switching away
  if (view !== "industry-enrichment") {
    setIndustryEnrichmentCategory(null);
  }
};
```

### 3. Update Industry Enrichment Rendering
**File**: `src/pages/Index.tsx`

Change the `industry-enrichment` view rendering (around line 1314) to conditionally show either the category grid or the table:

```tsx
activeView === "industry-enrichment" ? (
  industryEnrichmentCategory === null ? (
    // Show category selection grid
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0F0F4B] mb-2">Industry Enrichment</h2>
        <p className="text-sm text-muted-foreground">
          Select a category to view and enrich industry classifications
        </p>
      </div>
      <div className="grid grid-cols-4 gap-8 max-w-[1100px]">
        {CATEGORIES.map(category => {
          const count = categoryCounts[category.name] || 0;
          return { category, count };
        })
        .sort((a, b) => {
          if (a.count > 0 && b.count === 0) return -1;
          if (a.count === 0 && b.count > 0) return 1;
          return b.count - a.count;
        })
        .map(({ category, count }) => (
          <div
            key={category.name}
            className="flex flex-col items-center justify-center gap-3 h-[180px] border-2 border-[#14124E] text-[#14124E] bg-white transition hover:bg-[#14124E] hover:text-white cursor-pointer"
            onClick={() => setIndustryEnrichmentCategory(category.name)}
          >
            <span className="font-medium text-sm">{category.name}</span>
            <span className="text-sm">{count} leads</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    // Show table with back button
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        onClick={() => setIndustryEnrichmentCategory(null)}
        className="mb-2"
      >
        ← Back to Categories
      </Button>
      <IndustryEnrichmentTable 
        leads={leads.filter(l => l.category === industryEnrichmentCategory)} 
        onEnrichComplete={fetchLeads} 
      />
    </div>
  )
)
```

### 4. Update IndustryEnrichmentTable Component
**File**: `src/components/IndustryEnrichmentTable.tsx`

Since the leads will now be pre-filtered by category from the parent, remove the category filter dropdown from the table header to avoid confusion. The category filter state and dropdown can be removed since filtering is handled at the parent level.

Changes:
- Remove `categoryFilter` state variable
- Remove the category `Select` dropdown from the header
- Remove category filtering from `filteredLeads` useMemo
- Keep the "Classify All" button which will now correctly count only leads in the selected category

---

## Files Modified
1. `src/pages/Index.tsx` - Add state, update view change handler, update rendering logic
2. `src/components/IndustryEnrichmentTable.tsx` - Remove category dropdown (optional cleanup)

## User Experience Flow
1. User clicks "Industry Enrichment" in sidebar
2. Category grid appears showing all 11 categories with lead counts
3. User clicks a category (e.g., "Vehicles" with 100 leads)
4. Industry Enrichment table appears showing only leads from that category
5. User can click "Back to Categories" to return to the grid and select a different category
