
# Make Header Row and Company Column Sticky

## Overview
Add sticky positioning to:
1. The table header row (stays visible when scrolling down)
2. Only the **Company** column (stays visible when scrolling right)

## Technical Changes

### File: `src/components/IndustryEnrichmentTable.tsx`

**1. Update the table container (line 359)**
Change from `overflow-x-auto` to `overflow-auto max-h-[70vh]` to enable both horizontal and vertical scrolling:
```tsx
<div className="border rounded-lg overflow-auto max-h-[70vh]">
```

**2. Make the header row sticky (line 362)**
Add sticky positioning to keep headers visible during vertical scroll:
```tsx
<TableRow className="bg-muted/30 sticky top-0 z-20">
```

**3. Make the Company header sticky (line 366)**
Add sticky left positioning with background and higher z-index for the intersection:
```tsx
<TableHead className="font-semibold sticky left-0 bg-background z-30">Company</TableHead>
```

**4. Make the Company body cells sticky (line 390)**
Add matching sticky positioning for body cells:
```tsx
<TableCell className="sticky left-0 bg-background z-10">{lead.company || "-"}</TableCell>
```

## Visual Result
- **Scroll down**: Entire header row stays fixed at top
- **Scroll right**: Only the Company column stays fixed on the left (Name, Phone, Email columns scroll off-screen)
- Company header cell uses `z-30` to stay on top when both sticky axes intersect
