

# Clear Audit Data and Improve AI Explanation Format

## Overview
Reset all audit results and update the AI prompt to provide clearer, structured explanations that explicitly state "why X is wrong" and "why X is right".

## Changes Required

### 1. Clear Audit Results (Frontend)
**File: `src/components/IndustryEnrichmentTable.tsx`**

The audit results are stored in local state (`auditResults` Map), so clearing them is straightforward:
- Add a "Clear Audits" button near the table controls
- When clicked, reset the `auditResults` state to an empty Map

### 2. Improve AI Prompt Structure
**File: `supabase/functions/audit-mics-classification/index.ts`**

Update the prompt and tool response format to explicitly structure the explanation:

**Current prompt asks for:**
- General explanation of why form is correct/incorrect

**New prompt will ask for:**
- `why_wrong`: Specific explanation of why MICS (form) is incorrect
- `why_right`: Specific explanation of why MICS (new)/NAICS is correct
- Combined into a clear, formatted explanation

**Updated tool parameters:**
```typescript
parameters: {
  properties: {
    verdict: { type: "string", enum: ["match", "mismatch", "partial"] },
    why_wrong: { 
      type: "string",
      description: "Why MICS (form) is wrong or inaccurate. If match, explain why it's actually correct."
    },
    why_right: { 
      type: "string",
      description: "Why MICS (new)/NAICS classification is correct based on actual business activities."
    }
  }
}
```

### 3. Update Frontend Display
**File: `src/components/IndustryEnrichmentTable.tsx`**

- Update the `AuditResult` interface to include `why_wrong` and `why_right` fields
- Format the "Audit +" column to display both reasons clearly:
  - For mismatch/partial: Show "WRONG: [reason]" and "RIGHT: [reason]"
  - For match: Show "CORRECT: [reason]"

## Technical Details

### Updated AI Prompt
```
Compare these two industry classifications:

Company: {company}
Business Description: {description}

MICS (form) - User submitted: {micsForm}
MICS (new) - AI derived: {micsNew}
NAICS Code: {naicsCode}
NAICS Title: {naicsTitle}

Provide:
1. A verdict: "match", "mismatch", or "partial"
2. For mismatch/partial: Explain specifically WHY the MICS (form) is wrong
3. Explain WHY the MICS (new) / NAICS classification is correct

Be specific and reference actual business activities.
```

### Updated Audit+ Column Display Format
```
MISMATCH:
✗ Form Wrong: "Retail Trade" is incorrect because this company sells to businesses, not consumers.
✓ NAICS Correct: "Wholesale Trade" (NAICS 423110) accurately reflects B2B motor vehicle parts distribution.
```

### Clear Audits Button
Add a button in the table header area:
```tsx
<Button variant="outline" size="sm" onClick={() => setAuditResults(new Map())}>
  Clear Audits
</Button>
```

## Files to Modify

1. `supabase/functions/audit-mics-classification/index.ts`
   - Update prompt to explicitly ask for "why wrong" and "why right"
   - Update tool parameters to return structured fields
   - Combine fields into formatted explanation string

2. `src/components/IndustryEnrichmentTable.tsx`
   - Add "Clear Audits" button
   - Update display format in "Audit +" column to show structured explanation

