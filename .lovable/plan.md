
# Fix: Detect JavaScript-Based Domain Parking Redirects

## Problem
The domain `paving-pros.com` passes validation as "valid" with 95% confidence, but it actually uses a JavaScript-based redirect to send visitors to `https://www.dot-realty.org/articles/...?psystem=PW&domain=paving-pros.com`.

This is a domain monetization system that:
1. Returns HTTP 200 (no server-side redirect)
2. Uses JavaScript to redirect users to affiliate content
3. Passes the original domain in a URL parameter (`domain=paving-pros.com`)

The current validation only checks HTTP redirects, which JavaScript redirects bypass.

## Solution

Update `supabase/functions/validate-domain/index.ts` to detect JavaScript-based redirects and monetization patterns by:

1. **Add JavaScript redirect detection patterns** - Check HTML content for common JS redirect code
2. **Add domain monetization system markers** - Detect known parking/monetization platforms
3. **Add meta refresh detection** - Catch `<meta http-equiv="refresh">` redirects
4. **Flag as parked when detected** - Mark these domains as parked, not valid

## Changes to validate-domain/index.ts

### 1. Add JavaScript Redirect Patterns (new constant)
```text
const JS_REDIRECT_PATTERNS = [
  'window.location.href',
  'window.location.replace',
  'window.location.assign',
  'window.location =',
  'document.location.href',
  'document.location =',
  'top.location.href',
  'top.location =',
  'meta http-equiv="refresh"',
  'meta http-equiv=\'refresh\'',
];
```

### 2. Expand PARKING_PAGE_MARKERS with monetization indicators
Add these markers:
- `psystem=` (parking system parameter seen in the redirect URL)
- `domain=` in query strings (common in monetization systems)
- `parking.` (subdomain prefix)
- `trellian.com` (known monetization network)
- `above.com` (known parking service)
- `dsparking` (domain parking service)
- `domainsponsor` (monetization service)
- `.pw` domain references (common in monetization)

### 3. Add new detection function
```text
function containsJsRedirect(html: string): string | null {
  const htmlLower = html.toLowerCase();
  for (const pattern of JS_REDIRECT_PATTERNS) {
    if (htmlLower.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }
  // Check for meta refresh
  const metaRefresh = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+>/i);
  if (metaRefresh) {
    return 'meta refresh redirect';
  }
  return null;
}
```

### 4. Update HTTP 200 handling logic
When HTTP 200 is received, before declaring the domain valid:
1. Check for parking markers (existing)
2. Check for JavaScript redirect patterns (new)
3. If JS redirect detected, mark as parked with reason "JavaScript redirect detected"

### 5. Add logging for page content preview
Log the first 1000 characters of page content when no markers found, to aid debugging similar issues:
```text
console.log(`[validate-domain] Page content preview: ${bodyText.substring(0, 1000)}`);
```

## Expected Result After Fix

For `paving-pros.com`:
- `is_valid_domain`: true
- `is_parked`: true  
- `parking_indicator`: "window.location" or detected pattern
- `reason`: "Domain appears to be parked (JavaScript redirect detected). Domain exists but redirects to external content."

This will:
- Show "PARKED" badge instead of "VALID"
- Set match score to 25 instead of 95
- Display the specific reason in logs
