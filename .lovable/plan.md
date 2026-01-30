
# Industry Enrichment Section

## Overview
Create a new dedicated section in the application focused specifically on enriching the `company_industry` field for leads. This section will display a focused table with essential lead info (Name, Phone, Email, Company, DMA) plus an Industry column and an "Enrich Industry" action button for each row.

## User Interface Design

### New Section: "Industry Enrichment" View
- Add a new navigation item in the sidebar called "Industry Enrichment"
- Display a table showing all leads with columns:
  - Name
  - Phone  
  - Email
  - Company
  - DMA
  - Industry (shows current `company_industry` value or "-" if empty)
  - Action Button ("Enrich Industry")

### Table Behavior
- Show all leads from the database
- Industry column displays the existing `company_industry` value if present
- Empty industries show "-" or "Not Enriched"
- Enrich button is disabled when industry is already populated (or shows "Re-enrich")

## Technical Implementation

### 1. Update AppSidebar.tsx
Add new menu item for "Industry Enrichment" view:
```typescript
{
  title: "Industry Enrichment",
  icon: Building2,  // or Factory icon
  view: "industry-enrichment",
  allowedRoles: ["admin", "user"],
}
```

### 2. Create New Component: IndustryEnrichmentTable.tsx
New component that:
- Receives leads array as prop
- Displays focused table with the 6 columns + action
- Handles individual "Enrich Industry" button clicks
- Shows loading state during enrichment

Table structure:
```text
+-----------+-------+-------+---------+-------+----------+----------------+
| Name      | Phone | Email | Company | DMA   | Industry | Action         |
+-----------+-------+-------+---------+-------+----------+----------------+
| John Doe  | ...   | ...   | Acme Co | NYC   | Retail   | [Re-enrich]    |
| Jane Doe  | ...   | ...   | Beta    | LA    | -        | [Enrich]       |
+-----------+-------+-------+---------+-------+----------+----------------+
```

### 3. Create New Edge Function: enrich-industry
New backend function that:
- Takes `leadId` and optionally `company`, `domain` as input
- Uses Lovable AI to analyze the company and determine industry classification
- Updates the `company_industry` field in the leads table
- Returns the enriched industry value

The function will:
1. Check if lead has a domain - if so, use AI to analyze the website
2. If no domain, use company name + DMA to make a best guess
3. Call Lovable AI with a prompt to classify the industry
4. Save result to `company_industry` field

### 4. Update Index.tsx
Add conditional rendering for the new "industry-enrichment" view:
```typescript
} : activeView === "industry-enrichment" ? (
  <IndustryEnrichmentTable 
    leads={leads} 
    onEnrichComplete={fetchLeads} 
  />
)
```

## Industry Enrichment Logic

The edge function will use AI to classify companies into industries using:

**Input data:**
- Company name
- Domain (if available)
- DMA location
- Any existing description

**Output:**
- Industry classification string (e.g., "Retail", "Manufacturing", "Healthcare")

**AI Prompt Strategy:**
```
Given this company information:
- Company: {company}
- Domain: {domain}
- Location: {dma}
- Description: {description}

Classify this company into a specific industry category. 
Return a concise industry name (1-3 words).
```

## Files to Create/Modify

### New Files:
1. **`src/components/IndustryEnrichmentTable.tsx`** - New table component
2. **`supabase/functions/enrich-industry/index.ts`** - New edge function

### Modified Files:
1. **`src/components/AppSidebar.tsx`** - Add new menu item
2. **`src/pages/Index.tsx`** - Add view rendering logic for industry-enrichment view

## Styling
- Table uses existing UI components (Table, Button, Badge)
- Follows the sharp-corner, navy/white design system
- Industry column shows badge styling when populated
- Loading spinner on button during enrichment

## Summary
This creates a dedicated workflow for industry enrichment with:
- Clear sidebar navigation
- Focused table showing only relevant columns
- Individual row-level enrichment buttons
- AI-powered industry classification using existing Lovable AI integration
- Database persistence of results
