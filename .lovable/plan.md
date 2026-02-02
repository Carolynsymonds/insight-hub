# Clear Audit Data and Improve AI Explanation Format

## Status: ✅ COMPLETE

## Changes Made

### 1. Clear Audit Results (Frontend) ✅
- Added "Clear Audits" button near table controls
- Resets `auditResults` state to empty Map when clicked

### 2. Improved AI Prompt Structure ✅
- Updated prompt to explicitly request `why_wrong` and `why_right` fields
- Updated tool parameters to return structured response

### 3. Updated Frontend Display ✅
- Updated `AuditResult` interface with `why_wrong` and `why_right` fields
- "Audit +" column shows structured explanation:
  - For mismatch/partial: "✗ Form Wrong:" + "✓ NAICS Correct:"
  - For match: "✓ Form Correct:" + "✓ NAICS Correct:"
- CSV export updated with new column structure

