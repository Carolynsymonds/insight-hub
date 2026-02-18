
# Advanced Company Signals Section

## Overview
Add a new sidebar section called "Advanced Company Signals" that displays uploaded leads in a simplified table with key company and contact fields, plus an "Enrich" button per row that opens a right-side drawer for future enrichment workflows.

## Changes

### 1. Add Sidebar Menu Item
**File: `src/components/AppSidebar.tsx`**
- Add a new menu entry "Advanced Company Signals" with the `Sparkles` icon
- View key: `"advanced-signals"`
- Allowed roles: `["admin", "user"]`

### 2. Create the Advanced Company Signals Component
**New file: `src/components/AdvancedCompanySignals.tsx`**
- Receives `leads` array as a prop (reuses the existing leads data already fetched in Index.tsx)
- Renders a table with these columns:
  - **Company columns**: Company Name, Phone (company/lead phone), City, State, Zip
  - **Contact columns**: Full Name, Phone
  - **Action column**: "Enrich" button
- The "Enrich" button opens a right-side Drawer (using the existing `vaul` Drawer component with `direction="right"`)
- The Drawer will show the selected lead's basic info as a header and an empty placeholder area labeled "Enrichments will be configured here" (ready for future enrichment steps)
- Includes a callback prop `onEnrichComplete` for refreshing data after enrichments

### 3. Wire Up the View in Index.tsx
**File: `src/pages/Index.tsx`**
- Import the new `AdvancedCompanySignals` component
- Add a conditional render block for `activeView === "advanced-signals"` that passes `leads` and `fetchLeads` to the component
- No new state or data fetching needed -- it reuses the existing `leads` state

## Technical Details

### Table Structure
```text
| Company Name | Phone | City | State | Zip | Full Name | Phone | Enrich |
|-------------|-------|------|-------|-----|-----------|-------|--------|
| Acme Corp   | 555.. | NYC  | NY    | 100 | John S.   | 555.. | [btn]  |
```

### Drawer Behavior
- Opens from the right side (`direction="right"`)
- Header shows the selected lead's company name and contact name
- Body contains a placeholder for future enrichment steps
- Close button available in the drawer header

### Component Props
- `leads: Lead[]` -- the full leads array from Index.tsx
- `onEnrichComplete: () => void` -- callback to refresh leads after enrichment
