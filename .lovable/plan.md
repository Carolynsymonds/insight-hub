
# Fix: Fallback to Alternative Domain When Primary Domain is Parked/Invalid

## Problem Summary
When the email domain enrichment finds a domain with 95% confidence (`paving-pros.com`) but validation reveals it's parked/monetized, the system keeps showing the parked domain as primary instead of falling back to an alternative domain found by other enrichment sources (like `pavingprosraleigh.com` from Google at 20% confidence).

## Current Flow
1. Apollo search - no domain found
2. Google search - finds `pavingprosraleigh.com` (20% confidence)
3. Email extraction - finds `paving-pros.com` (95% confidence) - becomes primary domain
4. Validate Domain - detects `paving-pros.com` is PARKED (JS redirect)
5. **Problem**: Parked domain remains as primary, user cannot easily see the valid alternative

## Proposed Solution

### Option A: Automatic Fallback (Recommended)
After domain validation detects a PARKED or INVALID domain, automatically search the enrichment logs for alternative domains and fall back to the best valid one.

### Changes Required

**1. Update `runPipeline.ts` - Add fallback logic after validation**

After validation detects a parked/invalid domain:
```
// If domain is parked/invalid, try to find a fallback from enrichment logs
if (validationData?.is_parked || !validationData?.is_valid_domain) {
  // Search enrichment logs for alternative domains
  const enrichmentLogs = updatedLead.enrichment_logs || [];
  const alternativeDomains = enrichmentLogs
    .filter(log => log.domain && log.domain !== updatedLead.domain)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  if (alternativeDomains.length > 0) {
    const fallbackDomain = alternativeDomains[0];
    // Validate the fallback domain
    // If valid, update the lead to use fallback domain
    // Log the domain change in enrichment_logs
  }
}
```

**2. Update `validateAndSaveDomain` in LeadsTable.tsx**

Add optional parameter to trigger fallback search when domain is invalid/parked.

**3. UI Enhancement (Optional)**

When a domain is marked as PARKED, show an alternative domain suggestion in the UI if one exists in the logs.

## Implementation Details

### Step 1: Create fallback logic in pipeline
In `src/lib/runPipeline.ts`, after domain validation:
- Check if `is_parked` or `!is_valid_domain`
- Parse `enrichment_logs` to find other domains
- Exclude the current (invalid/parked) domain
- Sort by confidence descending
- Take the first alternative and validate it
- If the alternative is valid, update the lead's domain field

### Step 2: Update validation flow
Modify `validateAndSaveDomain` to optionally return fallback domain info when the primary domain fails validation.

### Step 3: Log the fallback action
Add a new log entry type `domain_fallback` to track when the system automatically switches to an alternative domain.

## Expected Behavior After Fix

For the Paving Pros case:
1. Pipeline finds `pavingprosraleigh.com` (Google, 20%) and `paving-pros.com` (Email, 95%)
2. `paving-pros.com` becomes primary (highest confidence)
3. Validation detects `paving-pros.com` is PARKED
4. **New**: System finds `pavingprosraleigh.com` in logs as alternative
5. **New**: Validates `pavingprosraleigh.com` - it's VALID
6. **New**: Updates lead to use `pavingprosraleigh.com` as primary domain
7. User sees the valid domain with appropriate confidence
8. Enrichment logs show the fallback action for transparency

## Files to Modify

1. **src/lib/runPipeline.ts**
   - Add fallback logic after domain validation step
   - Search enrichment_logs for alternative domains
   - Validate and switch to best alternative if primary is parked/invalid

2. **src/components/LeadsTable.tsx** (optional)
   - Update `validateAndSaveDomain` to support fallback workflow
   - Add UI indicator when fallback domain was used

3. **supabase/functions/validate-domain/index.ts** (no changes needed)
   - Already correctly detects parked domains

## Edge Cases to Handle

- All alternative domains are also invalid/parked - mark lead as "no valid domain"
- No alternative domains exist in logs - keep parked domain but clearly flag it
- Alternative domain validation fails (network error) - retry or keep original
- Circular fallback prevention - track which domains have been tried
