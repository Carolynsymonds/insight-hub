

# Fix Text Selection in Right-Side Drawer

## Problem
The Vaul drawer component prevents text selection by default. This is a built-in behavior of the Vaul library to support drag-to-close gestures, but it makes it impossible to select/copy text content within the drawer.

## Solution
Add CSS classes to enable text selection within the drawer content by overriding the default `user-select: none` behavior.

## Changes Required

### Modify `src/components/IndustryEnrichmentTable.tsx`

Add `select-text` CSS class to the scrollable content area inside the drawer:

**Line ~1020** - Update the content div:
```tsx
<div className="p-4 space-y-6 overflow-auto select-text">
```

This single change adds `user-select: text` to the content area, allowing users to select and copy text from the search results and company information.

## Alternative (if above doesn't work)

If the simple class doesn't work due to Vaul's overlay handling, we may need to also update the DrawerContent component in `src/components/ui/drawer.tsx`:

**Line ~35-45** - Add `select-text` to the content wrapper:
```tsx
<DrawerPrimitive.Content
  ref={ref}
  className={cn(
    "fixed z-50 flex flex-col border bg-background select-text",
    // ... rest of classes
  )}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/IndustryEnrichmentTable.tsx` | Add `select-text` class to drawer content div |
| `src/components/ui/drawer.tsx` (if needed) | Add `select-text` class to DrawerContent |

## Technical Note
- Tailwind's `select-text` class applies `user-select: text`
- This overrides the default `user-select: none` that Vaul applies for drag gestures
- Since the drawer is `direction="right"`, drag-to-close isn't the primary interaction anyway

