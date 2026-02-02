
# Add CSV Export to Industry Enrichment Table

## Overview
Add a CSV export button to the Industry Enrichment table that exports all visible data with the specified columns matching the table display.

## Export Columns
1. Name
2. Phone
3. Email
4. Company
5. DMA
6. Industry
7. Source
8. MICS (form)
9. MICS (new)
10. NAICS Code
11. NAICS Title
12. Conf.

## Technical Changes

### File: `src/components/IndustryEnrichmentTable.tsx`

**1. Add Download icon import (line 20)**
```tsx
import { Loader2, Download } from "lucide-react";
```

**2. Add export handler function (after line 316)**

Create a new function `handleExportCSV` that:
- Uses the `filteredLeads` array (respects current filter selection)
- Gets the industry source using the existing `getIndustrySource` function
- Looks up MICS (new) from `naicsMicsTitles` map
- Formats MICS (form) by joining sector/subsector/segment with " > "
- Wraps all fields in double quotes with proper escaping
- Triggers a browser download

```tsx
const handleExportCSV = () => {
  const headers = [
    "Name", "Phone", "Email", "Company", "DMA", 
    "Industry", "Source", "MICS (form)", "MICS (new)", 
    "NAICS Code", "NAICS Title", "Conf."
  ];

  const rows = filteredLeads.map((lead) => {
    const source = getIndustrySource(lead);
    const micsForm = [lead.mics_sector, lead.mics_subsector, lead.mics_segment]
      .filter(Boolean)
      .join(" > ");
    const micsNew = lead.naics_code ? naicsMicsTitles.get(lead.naics_code) || "" : "";
    const confidence = lead.naics_confidence !== null ? `${lead.naics_confidence}%` : "";

    return [
      lead.full_name || "",
      lead.phone || "",
      lead.email || "",
      lead.company || "",
      lead.dma || "",
      lead.company_industry || "",
      source !== "-" ? source : "",
      micsForm,
      micsNew,
      lead.naics_code || "",
      lead.naics_title || "",
      confidence
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `industry-enrichment-${new Date().toISOString().split("T")[0]}.csv`);
  link.click();
  URL.revokeObjectURL(url);

  toast({
    title: "Export Complete",
    description: `Exported ${filteredLeads.length} leads to CSV`
  });
};
```

**3. Add Export button to the header section (around line 327)**

Add a new button before the "Classify All" button:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleExportCSV}
  disabled={filteredLeads.length === 0}
>
  <Download className="h-4 w-4 mr-1" />
  Export CSV
</Button>
```

## Visual Result
- New "Export CSV" button appears in the header row next to "Classify All"
- Button is disabled when no leads are displayed
- Clicking exports the currently filtered leads to a CSV file named `industry-enrichment-YYYY-MM-DD.csv`
- Shows a toast notification confirming the export count
