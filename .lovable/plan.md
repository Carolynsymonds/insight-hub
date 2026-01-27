
# Update SOURCE v2 to Check Domain Validity Instead of Confidence

## Current Issue
The `yorkexcavating.com` domain is valid (HTTP 200), but it's not showing in SOURCE v2 because it was found by Google with only 20% confidence. The current logic filters out sources with confidence < 50%.

## New Logic
Change SOURCE v2 to show sources that found a **valid domain**, regardless of confidence:
- Only require that `log.domain` exists (not null)
- Remove the confidence >= 50% check entirely

## Technical Changes

### File: `src/pages/Index.tsx`

**1. Update the filter logic (lines 1080-1082):**

Change from:
```typescript
// Skip if no domain found or confidence < 50
if (!log.domain || (log.confidence !== undefined && log.confidence < 50)) continue;
```

To:
```typescript
// Skip if no domain found
if (!log.domain) continue;
```

**2. Update the `getSourceV2` function (lines 1140-1141):**

Change from:
```typescript
// Skip if no domain found or confidence < 50
if (!log.domain || (log.confidence !== undefined && log.confidence < 50)) continue;
```

To:
```typescript
// Skip if no domain found
if (!log.domain) continue;
```

**3. Update filter dropdown labels (lines 1614-1617):**

Change from:
```typescript
<SelectItem value="apollo">Apollo (≥50%)</SelectItem>
<SelectItem value="google">Google (≥50%)</SelectItem>
<SelectItem value="email">Email (≥50%)</SelectItem>
```

To:
```typescript
<SelectItem value="apollo">Apollo</SelectItem>
<SelectItem value="google">Google</SelectItem>
<SelectItem value="email">Email</SelectItem>
```

**4. Update the function comment (line 1133):**

Change from:
```typescript
// Helper to extract qualifying sources from enrichment_logs (domain found with >=50% confidence)
```

To:
```typescript
// Helper to extract sources that found a domain from enrichment_logs
```

## Expected Result
After this change, `yorkexcavating.com` will show "Google" in SOURCE v2 because Google found a valid domain, even though the confidence was only 20%.

| Lead | Google Confidence | Before | After |
|------|-------------------|--------|-------|
| York Excavating | 20% | (empty) | Google |
| Midas Foods | 95% | Apollo | Apollo |
| General Acrylics | 95% | Apollo, Email | Apollo, Email |

## Files to Modify
1. **`src/pages/Index.tsx`** - Update filter logic, `getSourceV2` function, dropdown labels, and comment
