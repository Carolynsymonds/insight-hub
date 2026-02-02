
# Add Left Border to MICS (NAICS) Column

## Overview
Add a left border to the "MICS (NAICS)" column to visually separate the AI-generated classification results from the input data columns.

## Changes

### File: `src/components/IndustryEnrichmentTable.tsx`

**1. Add border to the table header (line 371)**
```tsx
// Before
<TableHead className="font-semibold">MICS (NAICS)</TableHead>

// After
<TableHead className="font-semibold border-l">MICS (NAICS)</TableHead>
```

**2. Add border to the table body cells (line 419)**
```tsx
// Before
<TableCell>

// After
<TableCell className="border-l">
```

This adds a consistent left border on the "MICS (NAICS)" column for both the header and all data rows, creating a clear visual separation between input data (left side) and AI-generated classification results (right side).
