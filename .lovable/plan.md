

# Fix: Email Domain Verified Should Consider Quality Signals

## Problem
The Match Score gives an automatic 99% when a domain is extracted from an email, ignoring critical quality signals:
- **Distance: 482.4 miles** = Very low confidence (website is far from lead location)
- **Domain Relevance: 10/100** = Very low (domain name doesn't match company name)

This is clearly a wrong domain match, but the system gives 99% just because a domain was extracted from an email.

## Root Cause
The current scoring logic in `calculate-match-score/index.ts` has this priority:
1. Email Domain Verified → 99% (no questions asked)
2. Google Knowledge Graph → 95%
3. Calculated from Distance + Domain Relevance

The "Email Domain Verified" source gets 99% regardless of whether the domain actually makes sense for the company.

## Solution
Add a **quality gate** to the email domain verification step. If either:
- Distance is very high (>100 miles), OR
- Domain Relevance is very low (<30)

Then fall back to the calculated score instead of giving automatic 99%.

## Technical Changes

### File: `supabase/functions/calculate-match-score/index.ts`

**Update Step 1 logic (lines 90-95):**

```typescript
// Step 1: Check if email domain is verified (using effective source)
// BUT only give 99% if quality signals are good
if (effectiveSource === 'email_domain_verified') {
  const distanceMiles = lead.distance_miles ?? 999;
  const domainScore = lead.domain_relevance_score ?? 0;
  
  // Quality gate: only give 99% if signals support the match
  const distanceIsReasonable = distanceMiles < 100; // Under 100 miles
  const domainRelevanceIsReasonable = domainScore >= 30; // At least 30/100
  
  if (distanceIsReasonable && domainRelevanceIsReasonable) {
    // Both signals support the match - give full 99%
    matchScore = 99;
    matchScoreSource = 'email_domain';
    console.log('Step 1 applied: Email domain verified with good quality signals - 99%');
  } else if (distanceIsReasonable || domainRelevanceIsReasonable) {
    // One signal is bad - give moderate boost (70-85%)
    const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
    matchScore = Math.max(baseCalculated, 70); // At least 70%, capped at 85%
    matchScore = Math.min(matchScore, 85);
    matchScoreSource = 'email_domain_partial';
    console.log(`Step 1b applied: Email domain with partial quality - ${matchScore}%`);
  } else {
    // Both signals are bad - use calculated score, but with small email bonus
    const baseCalculated = calculateFromSignals(distanceMiles, domainScore);
    matchScore = Math.min(baseCalculated + 10, 60); // Small bonus, capped at 60%
    matchScoreSource = 'email_domain_low_quality';
    console.log(`Step 1c applied: Email domain with poor quality - ${matchScore}%`);
  }
}
```

## Expected Results

For the case in the screenshot (482 miles, 10/100 relevance):
- **Current**: 99% (Email Domain Verified)
- **After fix**: ~15% (calculated: distance ~0 + relevance 10 = ~5, plus 10 bonus = 15%, capped at 60%)

This correctly reflects that while we found a domain from the email, the quality signals strongly suggest it's not the right company.

## Quality Thresholds

| Distance | Domain Relevance | Result |
|----------|-----------------|--------|
| <100 mi  | ≥30            | 99% (full email domain verified) |
| <100 mi  | <30            | 70-85% (partial quality) |
| ≥100 mi  | ≥30            | 70-85% (partial quality) |
| ≥100 mi  | <30            | Calculated + 10, max 60% |

## Files to Modify

1. **`supabase/functions/calculate-match-score/index.ts`**
   - Extract distance/domain scoring logic into a helper function
   - Add quality gate to email domain verification step
   - Add similar quality gate to Google Knowledge Graph step (optional)

