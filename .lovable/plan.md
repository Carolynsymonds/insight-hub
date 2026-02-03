

# Add Bulk "Find Industry + Classify" Button

## Overview
Add a new button that runs the combined "Find Industry + Classify" workflow on all leads in the table that haven't been processed yet. This will sequentially search for industry information and classify NAICS for each unprocessed lead.

## Changes Required

### File: `src/components/IndustryEnrichmentTable.tsx`

#### 1. Add New State Variables (around line 115)
```typescript
const [isBulkFindAndClassifying, setIsBulkFindAndClassifying] = useState(false);
const [bulkFindClassifyProgress, setBulkFindClassifyProgress] = useState({ current: 0, total: 0, company: "" });
```

#### 2. Create Handler Function (after `handleFindAndClassify` around line 908)

The new function will:
- Filter leads that don't have a NAICS code yet
- For each lead, sequentially call:
  1. `search-industry-serper` to get Google snippet
  2. `classify-naics` to classify with the fresh snippet
- Track progress with current/total count and current company name
- Handle rate limit (429) and payment (402) errors to stop early
- Show toast with success/error count when complete

```typescript
const handleBulkFindAndClassify = async () => {
  if (leadsNeedingClassification.length === 0) {
    toast({
      title: "No Leads to Process",
      description: "All leads already have NAICS codes assigned.",
    });
    return;
  }

  setIsBulkFindAndClassifying(true);
  setBulkFindClassifyProgress({ current: 0, total: leadsNeedingClassification.length, company: "" });

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < leadsNeedingClassification.length; i++) {
    const lead = leadsNeedingClassification[i];
    setBulkFindClassifyProgress({ 
      current: i + 1, 
      total: leadsNeedingClassification.length, 
      company: lead.company || "Unknown" 
    });

    try {
      // Step 1: Find Industry
      const searchResponse = await supabase.functions.invoke("search-industry-serper", {
        body: {
          leadId: lead.id,
          company: lead.company,
          dma: lead.dma,
        },
      });

      if (searchResponse.error) throw new Error(searchResponse.error.message);
      
      const searchData = searchResponse.data;
      if (searchData.error) {
        if (searchData.error.includes("Rate limit")) {
          toast({ title: "Rate Limited", description: "Stopping bulk operation.", variant: "destructive" });
          break;
        }
        throw new Error(searchData.error);
      }

      const snippet = searchData.snippet;

      // Step 2: Classify NAICS
      const classifyResponse = await supabase.functions.invoke("classify-naics", {
        body: {
          leadId: lead.id,
          company: lead.company,
          industry: lead.company_industry,
          description: lead.description,
          googleSnippet: snippet || lead.industry_google_snippet,
        },
      });

      if (classifyResponse.error) throw new Error(classifyResponse.error.message);
      
      const classifyData = classifyResponse.data;
      if (classifyData.error) {
        if (classifyData.error.includes("Rate limit") || classifyData.error.includes("Payment required")) {
          toast({ title: "Rate Limited", description: "Stopping bulk operation.", variant: "destructive" });
          break;
        }
        throw new Error(classifyData.error);
      }

      successCount++;
    } catch (error) {
      console.error("Bulk find and classify error for lead:", lead.id, error);
      errorCount++;
    }
  }

  setIsBulkFindAndClassifying(false);
  setBulkFindClassifyProgress({ current: 0, total: 0, company: "" });

  toast({
    title: "Bulk Find & Classify Complete",
    description: `Successfully processed ${successCount} leads.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
  });

  onEnrichComplete();
};
```

#### 3. Add Button to UI (after "Classify All" button, around line 963)

```typescript
<Button
  variant="default"
  size="sm"
  onClick={handleBulkFindAndClassify}
  disabled={isBulkFindAndClassifying || leadsNeedingClassification.length === 0}
>
  {isBulkFindAndClassifying ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-1" />
      {bulkFindClassifyProgress.current}/{bulkFindClassifyProgress.total}: {bulkFindClassifyProgress.company}
    </>
  ) : (
    <>
      <Search className="h-4 w-4 mr-1" />
      Find & Classify All ({leadsNeedingClassification.length})
    </>
  )}
</Button>
```

## Button Layout After Change

| Button | Purpose |
|--------|---------|
| Clear Audits | Reset audit verdicts |
| Audit All (N) | Run MICS audits |
| Export CSV | Download data |
| **Classify All (N)** | NAICS classify only (uses existing snippets) |
| **Find & Classify All (N)** (NEW) | Search Google + NAICS classify (fresh snippets) |
| Filter dropdown | Filter by enrichment status |

## Result
Users can now run the complete industry enrichment workflow on all unclassified leads with a single click, showing real-time progress with the current company name being processed.

