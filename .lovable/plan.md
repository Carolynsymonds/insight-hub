

# Add Optional Domain Field to Manual Lead Entry

## Overview
Add a "Company Domain" input field to the manual lead entry form, allowing users to optionally provide a domain when adding a new lead.

## Changes

### File: `src/components/LeadUpload.tsx`

1. **Add `domain` to `formData` state** (line 94 area): Add `domain: ""` to the initial state object.

2. **Add `domain` field to the form UI** (after the Company field around line 497): Add a new input field labeled "Company Domain (optional)" with placeholder text like "e.g. acmecorp.com".

3. **Reset `domain` on submit** (line 178 area): Include `domain: ""` in the form reset object after successful submission.

4. **Add `domain` to CSV column mappings** (line 51 area): Add `"domain": { dbField: "domain", label: "Domain" }` so CSV uploads also support domain columns.

No backend changes needed -- the `leads` table already has a `domain` text column.

