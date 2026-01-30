
# Add NAICS Classification Button to Industry Enrichment Table

## Overview
Create a new button that classifies leads into NAICS 2022 industry codes using AI, based on company name, existing industry classification, and nature of business (description/summary).

## Data Flow

```text
+-------------------+     +------------------+     +----------------+
| Industry Table    | --> | classify-naics   | --> | leads table    |
| Click "Classify"  |     | Edge Function    |     | naics_code     |
|                   |     | (Lovable AI)     |     | naics_confidence|
+-------------------+     +------------------+     +----------------+

Input: company, company_industry, description
Output: { "naics": 541512, "confidence": 85 }
```

## Implementation

### 1. Database Migration
Add two new columns to the `leads` table:
- `naics_code` (text) - The NAICS 2022 code (e.g., "541512")
- `naics_confidence` (integer) - Confidence percentage (0-100)

### 2. Create Edge Function: `classify-naics`
New function at `supabase/functions/classify-naics/index.ts`

**Input:**
- `leadId` - Required
- `company` - Company name
- `industry` - Current industry classification (`company_industry`)
- `description` - Nature of business (from `description` field)

**AI Prompt:**
```text
Given the following company information: 
- Company name: [company]
- Industry: [industry]
- Nature of the business: [description]

Categorise company into a best guess of which industry they operate in, 
using the NAICS 2022 list. Determine your confidence in percentage.
```

**Tool Call Schema:**
```json
{
  "name": "classify_naics",
  "parameters": {
    "naics": { "type": "string", "description": "NAICS 2022 code" },
    "confidence": { "type": "number", "description": "Confidence 0-100" }
  }
}
```

**Database Update:**
Updates `leads.naics_code` and `leads.naics_confidence`

### 3. Update Industry Enrichment Table UI
Modify `src/components/IndustryEnrichmentTable.tsx`:

- Add new columns: "NAICS Code" and "Confidence"
- Add "Classify NAICS" button for each row
- Button states: "Classify" (no NAICS) / "Re-classify" (has NAICS)
- Loading state while classification is in progress
- Display NAICS code and confidence percentage when available

### 4. Update config.toml
Add the new function configuration:
```toml
[functions.classify-naics]
verify_jwt = false
```

## UI Changes

### Updated Table Structure
```text
+------+-------+---------+-----+----------+--------+------------+------------+------+--------+
| Name | Phone | Company | DMA | Industry | Source | MICS Title | NAICS Code | Conf | Action |
+------+-------+---------+-----+----------+--------+------------+------------+------+--------+
| ...  | ...   | ...     | ... | Retail   | Clay   | ...        | 441110     | 92%  | [...]  |
| ...  | ...   | ...     | ... | Tech     | Apollo | ...        | -          | -    | [...]  |
+------+-------+---------+-----+----------+--------+------------+------------+------+--------+
```

### Button Behavior
- **Primary button** ("Classify NAICS") when no NAICS code exists
- **Outline button** ("Re-classify") when NAICS code already exists
- **Loading spinner** during classification
- **Success toast** showing the classified NAICS code and confidence

## Files to Create/Modify

1. **New File:** `supabase/functions/classify-naics/index.ts`
   - Edge function for NAICS classification using Lovable AI

2. **Modify:** `supabase/config.toml`
   - Add classify-naics function configuration

3. **Modify:** `src/components/IndustryEnrichmentTable.tsx`
   - Add NAICS Code and Confidence columns
   - Add "Classify NAICS" button
   - Add loading and success states
   - Update Lead interface with new fields

4. **Database Migration:**
   - Add `naics_code` (text, nullable)
   - Add `naics_confidence` (integer, nullable)

## Error Handling
- 429 (Rate Limit): Display toast "Rate limits exceeded, please try again later"
- 402 (Payment Required): Display toast "Payment required, please add funds to your workspace"
- Other errors: Display specific error message in toast

## Summary
This adds a "Classify NAICS" button that uses Lovable AI to categorize companies into NAICS 2022 codes based on their name, existing industry classification, and business description. The results (code + confidence %) are stored in new database columns and displayed in the table.
