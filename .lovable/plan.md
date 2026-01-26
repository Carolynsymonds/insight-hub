
# Fix: Domain Fallback Not Working on Single-Lead Pipeline

## Root Cause
The "Run Pipeline" button on individual leads uses `handleRunPipeline` in **LeadsTable.tsx** (lines 953-1320+), which is a completely separate implementation from the shared `runPipelineForLead` in **runPipeline.ts**.

The domain fallback logic we added exists ONLY in `runPipeline.ts`, but that function is only used for **bulk pipeline operations** from `Index.tsx`. The single-lead pipeline in `LeadsTable.tsx` never calls `attemptDomainFallback`.

## Current State

```text
+------------------------+           +------------------------+
|  LeadsTable.tsx        |           |  runPipeline.ts        |
|  handleRunPipeline()   |           |  runPipelineForLead()  |
+------------------------+           +------------------------+
| Single Lead "Run       |           | Bulk Pipeline from     |
| Pipeline" button       |           | Index.tsx              |
+------------------------+           +------------------------+
| NO fallback logic      |           | HAS fallback logic     |
| (lines 953-1320+)      |           | (attemptDomainFallback)|
+------------------------+           +------------------------+
```

## Solution
Add the same domain fallback logic to the `handleRunPipeline` function in `LeadsTable.tsx` after domain validation (around line 1120).

## Changes Required

### File: `src/components/LeadsTable.tsx`

**1. Add import for attemptDomainFallback:**
```typescript
import { attemptDomainFallback } from "@/lib/domainFallback";
```

**2. Update handleRunPipeline function after domain validation (around line 1120-1125):**

Currently the code checks if domain is valid and not parked, then continues to coordinates. We need to add fallback logic when domain IS parked:

```typescript
// After line 1123: onEnrichComplete();

// Track the current working domain (may change after fallback)
let workingDomain = updatedLead.domain;
let workingValidationData = validationData;

// If domain is parked or invalid, attempt to find a valid alternative
if (validationData?.is_parked || !validationData?.is_valid_domain) {
  setPipelineStep('Finding Alternative Domain...');
  
  // Refetch logs to get the latest (including validation log just added)
  const { data: leadWithLogs } = await supabase
    .from("leads")
    .select("enrichment_logs")
    .eq("id", lead.id)
    .single();
  
  const latestLogs = Array.isArray(leadWithLogs?.enrichment_logs) 
    ? leadWithLogs.enrichment_logs : [];
  
  const fallbackResult = await attemptDomainFallback(
    lead.id,
    updatedLead.domain,
    latestLogs
  );
  
  if (fallbackResult.success && fallbackResult.fallbackDomain) {
    // Successfully found a valid alternative domain
    workingDomain = fallbackResult.fallbackDomain;
    workingValidationData = fallbackResult.validationData;
    
    toast({
      title: "Alternative Domain Found",
      description: `Switched from parked domain to ${fallbackResult.fallbackDomain} (${fallbackResult.fallbackConfidence}% confidence from ${fallbackResult.fallbackSource})`
    });
    
    // Refresh UI to show the new domain
    onEnrichComplete();
  } else {
    // No valid alternative found - keep the parked/invalid domain and set score
    await supabase.from("leads").update({
      match_score: validationData?.is_parked ? 25 : 0,
      match_score_source: validationData?.is_parked ? "parked_domain" : "invalid_domain"
    }).eq("id", lead.id);
    
    toast({
      title: "No Valid Alternative Found",
      description: `Primary domain is ${validationData?.is_parked ? 'parked' : 'invalid'} and no valid alternatives exist.`,
      variant: "destructive"
    });
  }
}

// Then update the existing condition to use workingDomain and workingValidationData
if (workingValidationData?.is_valid_domain && !workingValidationData?.is_parked) {
  // Continue with coordinates, distance, etc. using workingDomain
}
```

**3. Update all subsequent domain references in the pipeline to use `workingDomain` instead of `updatedLead.domain`**

This affects:
- find-company-coordinates call (line 1128)
- score-domain-relevance call
- enrich-company-details call
- find-company-contacts call
- get-company-news call

## Expected Behavior After Fix

1. User clicks "Run Pipeline" on Paving Pros lead
2. Pipeline finds `paving-pros.com` (95% from email) and `pavingprosraleigh.com` (20% from Google)
3. `paving-pros.com` becomes primary (highest confidence)
4. Validation detects `paving-pros.com` is PARKED (JS redirect)
5. **NEW**: Pipeline shows "Finding Alternative Domain..."
6. **NEW**: `attemptDomainFallback` finds `pavingprosraleigh.com` in logs
7. **NEW**: Validates it - VALID
8. **NEW**: Updates lead to use `pavingprosraleigh.com` as primary domain
9. Toast shows "Alternative Domain Found"
10. Pipeline continues with the valid domain for coordinates, scoring, etc.

## Files to Modify

1. **src/components/LeadsTable.tsx**
   - Add import for `attemptDomainFallback`
   - Add fallback logic after domain validation in `handleRunPipeline`
   - Update domain references to use `workingDomain` variable

## Alternative Approach (Considered but not recommended)

Replace the inline `handleRunPipeline` with a call to `runPipelineForLead`. This would reduce code duplication but requires significant refactoring of callbacks and state management.
