

# Remove Find Domain and Match Score from Enrichment Drawer

## Overview
Remove the "Company Domain" and "Match Score" sections from the Advanced Company Signals enrichment drawer, keeping only the "Commercial News" section.

## Changes

### File: `src/components/AdvancedCompanySignals.tsx`

1. **Remove state variables**: `findingDomain`, `findDomainStep`, `domainResult`, `calculatingScore`, `matchScoreResult`
2. **Remove handlers**: `handleFindDomain`, `handleCalculateMatchScore`
3. **Remove imports** no longer needed: `RefreshCw`, `Search`, `Globe`, `CheckCircle`
4. **Remove drawer sections**: The "Company Domain" block (Find Domain button, loading state, domain result display) and the "Match Score" block (Calculate Match Score button, loading state, score display), along with their divider `<div className="border-t" />` elements
5. **Remove initialization logic** in `handleEnrichClick` that sets `domainResult` and `matchScoreResult` from lead data

The drawer will only contain the "Commercial News" section with the Find News button.

