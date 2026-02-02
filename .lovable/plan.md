

# Add AI Audit Column for MICS Classification Comparison

## Overview
Add a new "Audit" column next to "Conf." that uses AI to compare MICS (form) vs MICS (new)/NAICS Title and provides an explanation of why the form data may be wrong and why the NAICS-derived classification is correct.

## Architecture

### 1. New Edge Function: `audit-mics-classification`
Creates a new backend function that:
- Takes the lead's MICS form data, MICS (new), NAICS code/title, company name, and description
- Uses Lovable AI to analyze the discrepancy
- Returns a structured audit result with verdict and explanation
- Does NOT persist to database (on-demand analysis only)

### 2. Frontend Component Updates

**File: `src/components/IndustryEnrichmentTable.tsx`**

- Add new "Audit" column header after "Conf."
- Add state to track auditing leads and store audit results
- Add "Audit" button that triggers AI analysis
- Display audit results in a tooltip or expandable cell

## Technical Changes

### New File: `supabase/functions/audit-mics-classification/index.ts`

```typescript
// Edge function that uses Lovable AI to compare MICS classifications
// Input: { company, description, micsForm, micsNew, naicsCode, naicsTitle }
// Output: { verdict: "match" | "mismatch" | "partial", explanation: string }
```

**AI Prompt Design:**
- Compare MICS (form) submitted by user vs MICS (new) derived from NAICS
- Explain why the form classification may be incorrect (too broad, wrong sector, etc.)
- Explain why the NAICS-derived classification is more accurate
- Return a concise verdict with supporting reasoning

### File: `src/components/IndustryEnrichmentTable.tsx`

**1. Update Lead interface (add audit_result field for local state)**

**2. Add new state variables:**
```typescript
const [auditingLeads, setAuditingLeads] = useState<Set<string>>(new Set());
const [auditResults, setAuditResults] = useState<Map<string, { verdict: string; explanation: string }>>(new Map());
```

**3. Add handleAudit function:**
- Calls the `audit-mics-classification` edge function
- Stores result in local state (Map by lead ID)
- Shows loading state while auditing

**4. Add new table column header after "Conf.":**
```tsx
<TableHead className="font-semibold">Audit</TableHead>
```

**5. Add new table cell with Audit button/result:**
- Shows "Audit" button if no result yet
- Shows verdict badge (✓ Match / ⚠ Mismatch / ~ Partial) with hover tooltip showing explanation
- Button disabled if no NAICS code or no MICS form data

**6. Update table min-width and colspan for empty state**

**7. Update CSV export to include Audit column (verdict + explanation)**

## Visual Result

| Conf. | Audit |
|-------|-------|
| 95%   | 🔘 Audit |
| 87%   | ⚠️ Mismatch (hover for details) |
| 92%   | ✓ Match |

- **Audit button**: Triggers AI comparison for that lead
- **Result display**: Shows colored badge with verdict
- **Tooltip/Popover**: Shows full explanation on hover

## Edge Function Details

**Prompt structure:**
```
Compare these two industry classifications for the company:

Company: {company}
Business Description: {description}

MICS (form) - User submitted: {micsForm}
MICS (new) - AI derived from NAICS: {micsNew}
NAICS Code: {naicsCode}
NAICS Title: {naicsTitle}

Analyze:
1. Are these classifications aligned or different?
2. If different, explain why MICS (form) may be incorrect
3. Explain why MICS (new) / NAICS classification is more accurate
4. Provide a verdict: "match", "mismatch", or "partial"
```

**Response format (tool call):**
```json
{
  "verdict": "mismatch",
  "explanation": "The form classified this as 'Retail Trade' but the company is actually a wholesaler. NAICS 423110 (Wholesale Trade - Motor Vehicle) is correct because they sell to dealerships, not consumers."
}
```

