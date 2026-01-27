

# Fix Domain Source Filter to Verify Email Domain Match

## Overview
The current filter logic incorrectly classifies leads as "Email" source based solely on the `email_domain_validated` flag. However, this flag can be `true` even when the domain doesn't actually match the email (like Gmail addresses where the domain was found via Google search). We need to verify that the domain actually matches the email domain.

## Current Issue
- Lead `garmanleejustin@gmail.com` with domain `yorkexcavating.com` shows as "Email" source
- The `email_domain_validated` flag is `true`, but the domain (`yorkexcavating.com`) doesn't match the email domain (`gmail.com`)
- The company detail page shows "No domain found" under Email, confirming no domain was extracted from the email

## Correct Logic
A lead should only be classified as "Email" source when:
1. The domain actually matches the email domain (e.g., `amanda@elegantjohns.com` → `elegantjohns.com`) 
2. OR the `enrichment_source` indicates an email-based enrichment

## Technical Implementation

### File: `src/pages/Index.tsx`

**1. Create a helper function to check if domain matches email:**

```typescript
// Check if a domain matches the email domain (after the @)
const domainMatchesEmail = (email: string | null, domain: string | null): boolean => {
  if (!email || !domain) return false;
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const leadDomain = domain.toLowerCase().replace(/^www\./, '');
  return emailDomain === leadDomain;
};
```

**2. Update the filter logic (around line 1044):**

Replace the current check:
```typescript
if (lead.email_domain_validated === true) {
  // Domain was validated via email, include this lead
}
```

With:
```typescript
// Check if domain actually matches the email domain
if (domainMatchesEmail(lead.email, lead.domain)) {
  // Domain matches email, include this lead
}
```

**3. Update the `getDomainSource` function (around line 1069):**

Replace:
```typescript
if (emailDomainValidated === true) {
  return 'Email';
}
```

With:
```typescript
// This function needs the email and domain to properly check
// We'll update the signature and call site
```

The function signature needs to change to:
```typescript
const getDomainSource = (
  enrichmentSource: string | null, 
  email: string | null, 
  domain: string | null
): string => {
  // Check if domain actually matches the email domain
  if (domainMatchesEmail(email, domain)) {
    return 'Email';
  }
  // ... rest of logic for enrichment sources
};
```

**4. Update the CSV export call site:**

Change from:
```typescript
getDomainSource(lead.enrichment_source, lead.email_domain_validated)
```

To:
```typescript
getDomainSource(lead.enrichment_source, lead.email, lead.domain)
```

## Result
After this change:
- `amanda@elegantjohns.com` with domain `elegantjohns.com` → Shows as "Email" ✓
- `garmanleejustin@gmail.com` with domain `yorkexcavating.com` → Shows as "Google" ✓
- Only leads where the domain genuinely came from the email will be classified as "Email" source

## Files to Modify
1. **`src/pages/Index.tsx`** - Add helper function, update filter logic, update `getDomainSource` function and its call sites

