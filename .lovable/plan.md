

# Add "Classify Address Type" via Google Geocoding API

## Overview
Add a new "Classify Address Type" section in the Enrichment drawer (below Commercial News) that geocodes the lead's address using the Google Geocoding API, returning and saving latitude and longitude.

## Changes

### 1. New Edge Function: `geocode-address`

Create `supabase/functions/geocode-address/index.ts` that:
- Accepts `leadId`, `first_line_address`, `state`, `zipcode`
- Builds address string: `{first_line_address}, {state} {zipcode}`
- Calls `https://maps.googleapis.com/maps/api/geocode/json?address={encoded_address}&key={GOOGLE_MAPS_API_KEY}`
- Extracts `lat` and `lng` from `results[0].geometry.location`
- Extracts `location_type` from `results[0].geometry.location_type` (ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE) -- this is the "address type classification"
- Extracts formatted address components (e.g., street_number, route, locality, etc.)
- Updates the lead's `latitude` and `longitude` columns in the database
- Returns `{ success, latitude, longitude, location_type, formatted_address }`
- Uses the existing `GOOGLE_MAPS_API_KEY` secret (already configured)

### 2. Update Enrichment Drawer (`src/components/AdvancedCompanySignals.tsx`)

Add a new section below "Commercial News" in the drawer:

- **Title**: "Classify Address Type"
- **Button**: "Geocode Address" (with a MapPin icon) -- shown when no geocode result exists
- **Loading state**: spinner while calling the edge function
- **Results display**:
  - Location type badge (color-coded: ROOFTOP = green, RANGE_INTERPOLATED = blue, GEOMETRIC_CENTER = yellow, APPROXIMATE = orange)
  - Formatted address from Google
  - Latitude and Longitude values
  - Re-run button to refresh
- **Disabled state**: Button disabled if the lead has no `first_line_address` and no `zipcode`

### 3. State Management

- Add `geocodeLoading` boolean state
- Add `geocodeResult` state to hold `{ latitude, longitude, location_type, formatted_address }`
- Pre-populate `geocodeResult` from `selectedLead.latitude`/`selectedLead.longitude` when opening the drawer (if already geocoded)

## Technical Details

- The `GOOGLE_MAPS_API_KEY` secret is already configured -- no new secrets needed
- The `leads` table already has `latitude` and `longitude` columns -- no database migration needed
- The Google Geocoding API `location_type` field classifies the address precision:
  - **ROOFTOP**: Exact street address match
  - **RANGE_INTERPOLATED**: Approximated between two precise points
  - **GEOMETRIC_CENTER**: Center of a region (e.g., a city block)
  - **APPROXIMATE**: General area only
- Edge function config: `verify_jwt = false` in `supabase/config.toml` (validates auth in code)

