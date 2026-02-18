

# Add "Find Domain" Button to Advanced Company Signals Drawer

## Overview
Add a "Find Domain" button inside the enrichment drawer (alongside the existing "Find News" button) that runs the same 3-source domain enrichment logic used in the main Leads Table: Apollo, Google, and Email validation.

## Changes

### 1. Update `src/components/AdvancedCompanySignals.tsx`

Add a new section in the drawer above or below the "Commercial News" section:

- **"Find Domain" section** with a button (Search icon) that triggers the 3-step enrichment:
  - Step 1: Search Apollo (`enrich-lead` with `source: "apollo"`)
  - Step 2: Search Google (`enrich-lead` with `source: "google"`)
  - Step 3: Check Email (`enrich-lead` with `source: "email"`, only if lead has an email)
  - Step 4: If no domain found, run `diagnose-enrichment`

- **Loading state**: Shows a spinner with step indicator text ("Searching Apollo (1/3)...", "Searching Google (2/3)...", etc.)

- **Results display**: After completion, show the lead's current domain (refetched from database) with:
  - Domain as a clickable link
  - Enrichment source badge
  - Confidence percentage
  - "No domain found" message if all sources fail

- **State variables**: `findingDomain` (boolean), `findDomainStep` (string for step text), `domainResult` (refetched lead domain info)

- The button calls `onEnrichComplete` after finishing to refresh the leads list

### Logic (mirrors `handleFindDomain` from LeadsTable.tsx)

```text
1. Call enrich-lead (source: "apollo") with lead's company, city, state, mics_sector, email
2. Call enrich-lead (source: "google") with same params
3. If lead.email exists, call enrich-lead (source: "email") with same params
4. Refetch lead from DB to check if domain was found
5. If no domain found, call diagnose-enrichment
6. Show toast with result
7. Call onEnrichComplete to refresh parent
```

### UI Layout in Drawer
The drawer body will have two sections stacked vertically:

1. **Company Domain** -- Find Domain button, loading steps, result display
2. **Commercial News** -- existing Find News functionality (unchanged)

Both sections use the same visual pattern: heading, action button, loading state, results.

## Technical Details

- Reuses the existing `enrich-lead` and `diagnose-enrichment` edge functions (no new backend code needed)
- Passes `lead.company`, `lead.city`, `lead.state`, `lead.mics_sector`, and `lead.email` from the selected lead
- After enrichment completes, refetches the lead row to display updated domain/confidence/source
- Uses toast notifications for success/failure feedback consistent with the main Leads Table behavior
