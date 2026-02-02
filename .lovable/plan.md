
# Update MICS (Input) Display to Multi-line Format

## Overview
Change the MICS hierarchy display in the Industry Enrichment table from a single-line format with " > " separators to a multi-line format where each level appears on its own line.

## Current Behavior
```
Material Manufacture > Wood & Paper Products
```

## Proposed Behavior
```
Material Manufacture
Wood & Paper Products
```

## Technical Changes

### File: `src/components/IndustryEnrichmentTable.tsx`

**Update the MICS (Input) cell rendering (lines 408-417)**

Replace the single-line `.join(" > ")` display with a flex column layout that shows each hierarchy level on its own line:

```tsx
<TableCell>
  {lead.mics_sector || lead.mics_subsector || lead.mics_segment ? (
    <div className="flex flex-col text-sm max-w-[200px]" title={[lead.mics_sector, lead.mics_subsector, lead.mics_segment].filter(Boolean).join(" > ")}>
      {[lead.mics_sector, lead.mics_subsector, lead.mics_segment]
        .filter(Boolean)
        .map((item, index) => (
          <span key={index} className="truncate">{item}</span>
        ))}
    </div>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</TableCell>
```

This change:
- Uses a `flex flex-col` container to stack items vertically
- Each MICS level (sector, subsector, segment) displays on its own line
- Keeps the title attribute for full hover text
- Maintains truncation for long values
