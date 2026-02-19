

# Add "Classify Commercial vs Residential" via Google Places Nearby Search

## Overview
Add a new "Classify Location" button below the Classify Address Type section in the enrichment drawer. After geocoding returns lat/lng, this button calls Google Places Nearby Search to determine if the address is **Commercial** or **Residential**.

## Changes

### 1. New Edge Function: `classify-location`

Create `supabase/functions/classify-location/index.ts` that:
- Accepts `leadId`, `latitude`, `longitude`
- Calls `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=30&type=establishment&key={GOOGLE_MAPS_API_KEY}`
- Classifies based on the response:
  - **Commercial**: If results contain establishments with types like `store`, `office`, `warehouse`, `finance`, `point_of_interest`, etc., and `business_status` is `OPERATIONAL`
  - **Residential**: If no establishments found, only `street_address`, or no business profiles
- Saves the classification to the lead (a new `address_classification` column, or reuse an existing field)
- Returns `{ classification: "commercial" | "residential", nearby_business_name, nearby_types }`
- Uses the existing `GOOGLE_MAPS_API_KEY` secret

### 2. Database Migration

Add a nullable column to store the classification:

```sql
ALTER TABLE public.leads ADD COLUMN address_classification text;
```

### 3. Update `supabase/config.toml`

Add entry for the new function:

```toml
[functions.classify-location]
verify_jwt = false
```

### 4. Update Enrichment Drawer (`src/components/AdvancedCompanySignals.tsx`)

Add a new section below Classify Address Type:

- **Title**: "Location Classification"
- **Button**: "Classify Location" (with a Building icon) -- only enabled when lat/lng are available (after geocoding)
- **Loading state**: Spinner while calling the edge function
- **Results display**:
  - Badge: green for "Commercial", amber for "Residential"
  - If commercial: show the nearest business name and types found
  - Re-run button to refresh
- **State**: Add `classifyLoading` and `classifyResult` states
- Pre-populate from `lead.address_classification` when opening the drawer

## Technical Details

- No new secrets needed -- reuses `GOOGLE_MAPS_API_KEY`
- The 30m radius is intentionally small to check the exact address location
- The classification logic in the edge function:
  1. If `results` array is empty or all results only have `street_address` type --> "residential"
  2. If any result has establishment-related types AND `business_status === "OPERATIONAL"` --> "commercial"
  3. Fallback: "residential"
- The button is disabled until geocoding has been completed (lat/lng must exist)

