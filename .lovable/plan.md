
# Add "First Line Address" Column

## Overview
Add a new "First Line Address" field to the leads system -- from database schema through to the lead entry form and the Advanced Company Signals table display.

## Changes

### 1. Database Migration
Add a new nullable `first_line_address` (text) column to the `leads` table.

```sql
ALTER TABLE public.leads ADD COLUMN first_line_address text;
```

### 2. Lead Upload Form (`src/components/LeadUpload.tsx`)

- Add `first_line_address: ""` to the `formData` state and reset object
- Add a new Input field labeled "First Line Address" in the manual entry form (placed near the other address fields like City/State/Zip)
- Add CSV column mappings so CSV uploads can map this field:
  - `"first_line_address"` -> `first_line_address`
  - `"address"` -> `first_line_address`
  - `"street_address"` -> `first_line_address`
  - `"address_line_1"` -> `first_line_address`

### 3. Advanced Company Signals Table (`src/components/AdvancedCompanySignals.tsx`)

- Add "Address" column header in the Company group section (update colSpan from 5 to 6)
- Add table cell displaying `lead.first_line_address || "---"`
- Position it after Domain, before City
- Update empty state colSpan from 8 to 9
- Add "Address" to the CSV export headers and data mapping

### 4. Edit Lead Dialog (`src/components/EditLeadDialog.tsx`)

- Add `first_line_address` to the field configuration so users can edit the address after creation

## Technical Details

- The new column is nullable with no default, so existing leads will show "---" until populated
- CSV uploads with an "address" or "first_line_address" header will auto-map to this field
- No RLS policy changes needed since the existing leads policies cover all columns
