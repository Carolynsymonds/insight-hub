

# Add Search and CSV Export to Advanced Company Signals

## Overview
Add a search bar to filter leads by company name and a CSV export button to download the visible table data.

## Changes

### File: `src/components/AdvancedCompanySignals.tsx`

1. **Add search state** -- new `searchQuery` state variable to track the search input.

2. **Filter leads** -- create a `filteredLeads` array that filters the `leads` prop by matching `company` name against the search query (case-insensitive). Use `filteredLeads` in the table rendering instead of `leads`.

3. **Add toolbar above the table** (between the heading and the table border div, around line 111-112):
   - A search `Input` with a `Search` icon and placeholder "Search by company name..."
   - A "Export CSV" `Button` with a `Download` icon, aligned to the right

4. **CSV export function** -- `handleExportCSV`:
   - Exports the **filtered** leads (what's currently visible in the table)
   - Columns: Company Name, Phone, City, State, Zip, Full Name, Contact Phone
   - Uses proper CSV escaping (wrapping values containing commas/quotes in double quotes)
   - Creates a Blob, generates a download link, and triggers the download as `advanced-signals-export.csv`

5. **New imports**: `Search` and `Download` icons from lucide-react, `Input` from UI components.

## Technical Details

```
Layout:
+--------------------------------------------------+
| Advanced Company Signals                         |
| [Search by company name...] [Export CSV]         |
| +----------------------------------------------+ |
| | Company | Phone | City | State | Zip | ...   | |
| +----------------------------------------------+ |
```

- Search is instant (client-side filter on the already-loaded leads array)
- CSV export respects the current search filter
- Empty state message updates to "No leads match your search" when filtering produces zero results
