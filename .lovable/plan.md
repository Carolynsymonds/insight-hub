
# Add Combined "Find Industry + Classify" Button

## Overview
Add a new button in the Enrich Industry drawer that sequentially executes:
1. **Find Industry** - Search Google for company information and save the snippet
2. **Classify NAICS** - Automatically trigger NAICS classification once search completes

This provides a one-click workflow for complete industry enrichment.

## Changes Required

### File: `src/components/IndustryEnrichmentTable.tsx`

#### 1. Add New State Variable (around line 114)
```typescript
const [isFindAndClassifying, setIsFindAndClassifying] = useState(false);
```

#### 2. Create New Combined Handler Function (after `handleSearchIndustry` around line 795)
```typescript
const handleFindAndClassify = async () => {
  if (!selectedLeadForEnrich) return;

  setIsFindAndClassifying(true);
  setSearchResults([]);
  setSearchLogs([]);

  const logs: string[] = [];
  const addLog = (message: string) => {
    logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    setSearchLogs([...logs]);
  };

  try {
    // Step 1: Find Industry
    addLog(`=== Step 1: Find Industry ===`);
    addLog(`Starting industry search for: ${selectedLeadForEnrich.company}`);
    addLog(`DMA: ${selectedLeadForEnrich.dma || "N/A"}`);
    
    const queryParts = [`"${selectedLeadForEnrich.company}"`];
    if (selectedLeadForEnrich.dma) {
      queryParts.push(`"${selectedLeadForEnrich.dma}"`);
    }
    queryParts.push("what does this company do");
    addLog(`Query: ${queryParts.join(" ")}`);
    addLog(`Calling SerpAPI...`);

    const searchResponse = await supabase.functions.invoke("search-industry-serper", {
      body: {
        leadId: selectedLeadForEnrich.id,
        company: selectedLeadForEnrich.company,
        dma: selectedLeadForEnrich.dma,
      },
    });

    if (searchResponse.error) {
      addLog(`❌ API Error: ${searchResponse.error.message}`);
      throw new Error(searchResponse.error.message);
    }

    const searchData = searchResponse.data;

    if (searchData.error) {
      addLog(`❌ Search Error: ${searchData.error}`);
      throw new Error(searchData.error);
    }

    addLog(`✓ Search complete`);
    addLog(`Results found: ${searchData.topResults?.length || 0}`);
    
    setSearchQuery(searchData.query);
    setSearchResults(searchData.topResults || []);
    setLogsOpen(true);

    const snippet = searchData.snippet;
    if (snippet) {
      addLog(`✓ Main snippet extracted and saved`);
    } else {
      addLog(`⚠ No snippet found, continuing with classification anyway`);
    }

    // Step 2: Classify NAICS
    addLog(``);
    addLog(`=== Step 2: Classify NAICS ===`);
    addLog(`Starting NAICS classification...`);

    const classifyResponse = await supabase.functions.invoke("classify-naics", {
      body: {
        leadId: selectedLeadForEnrich.id,
        company: selectedLeadForEnrich.company,
        industry: selectedLeadForEnrich.company_industry,
        description: selectedLeadForEnrich.description,
        googleSnippet: snippet || selectedLeadForEnrich.industry_google_snippet,
      },
    });

    if (classifyResponse.error) {
      addLog(`❌ Classification API Error: ${classifyResponse.error.message}`);
      throw new Error(classifyResponse.error.message);
    }

    const classifyData = classifyResponse.data;

    if (classifyData.error) {
      addLog(`❌ Classification Error: ${classifyData.error}`);
      throw new Error(classifyData.error);
    }

    addLog(`✓ NAICS Classification complete`);
    addLog(`Code: ${classifyData.naics_code}`);
    addLog(`Title: ${classifyData.naics_title || "N/A"}`);
    addLog(`Confidence: ${classifyData.naics_confidence}%`);

    toast({
      title: "Find & Classify Complete",
      description: `Classified as ${classifyData.naics_code} with ${classifyData.naics_confidence}% confidence`,
    });

    onEnrichComplete();
  } catch (error) {
    console.error("Find and classify error:", error);
    addLog(`❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    toast({
      title: "Operation Failed",
      description: error instanceof Error ? error.message : "An error occurred",
      variant: "destructive",
    });
  } finally {
    setIsFindAndClassifying(false);
  }
};
```

#### 3. Add New Button in Drawer UI (around line 1108, after the two existing buttons)
```typescript
<Button
  onClick={handleFindAndClassify}
  disabled={isFindAndClassifying || !selectedLeadForEnrich.company}
  variant="secondary"
  className="w-full"
>
  {isFindAndClassifying ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      Finding & Classifying...
    </>
  ) : (
    <>
      <Search className="h-4 w-4 mr-2" />
      Find Industry + Classify
    </>
  )}
</Button>
```

## Button Layout in Drawer

| Button | Behavior |
|--------|----------|
| **Find Industry** | Searches Google only |
| **Classify NAICS** | Classifies only (uses existing snippet if available) |
| **Find Industry + Classify** (NEW) | Searches Google, then auto-classifies with fresh snippet |

## Result
Users can now perform the complete industry enrichment workflow with a single click. The logs will show both steps with clear section headers, making it easy to trace what happened.
