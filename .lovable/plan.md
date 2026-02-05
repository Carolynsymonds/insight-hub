

# Add Performance Monitoring to Individual "Find Industry + Classify" Button

## Overview
Add timing metrics to the individual "Find Industry + Classify" button in the Enrich Industry drawer. This will track how long each step (search and classify) takes and display the results both in the existing search logs area and in a summary toast.

## What Will Be Tracked

| Metric | Description |
|--------|-------------|
| Total Duration | Overall time from button click to completion |
| Search Time | Time for the `search-industry-serper` call |
| Classify Time | Time for the `classify-naics` call |

## Implementation Approach

### Update `handleFindAndClassify` Function

Wrap each API call with timing using `Date.now()` and add performance logs to the existing drawer logs panel.

## Technical Changes

### File: `src/components/IndustryEnrichmentTable.tsx`

#### Modify `handleFindAndClassify` (lines 800-910)

Add timing instrumentation:

```text
const handleFindAndClassify = async () => {
  if (!selectedLeadForEnrich) return;

  setIsFindAndClassifying(true);
  setSearchResults([]);
  setSearchLogs([]);

  // NEW: Performance tracking
  const operationStart = Date.now();
  let searchDuration = 0;
  let classifyDuration = 0;

  const logs: string[] = [];
  const addLog = (message: string) => {
    logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    setSearchLogs([...logs]);
  };

  try {
    // Step 1: Find Industry
    addLog(`=== Step 1: Find Industry ===`);
    addLog(`Starting industry search for: ${selectedLeadForEnrich.company}`);
    // ... existing query building code ...
    
    // NEW: Start timing for search
    const searchStart = Date.now();
    
    const searchResponse = await supabase.functions.invoke("search-industry-serper", { ... });
    
    // NEW: Calculate search duration
    searchDuration = (Date.now() - searchStart) / 1000;
    addLog(`⏱ Search completed in ${searchDuration.toFixed(2)}s`);
    
    // ... existing error handling and result processing ...

    // Step 2: Classify NAICS
    addLog(`=== Step 2: Classify NAICS ===`);
    
    // NEW: Start timing for classify
    const classifyStart = Date.now();
    
    const classifyResponse = await supabase.functions.invoke("classify-naics", { ... });
    
    // NEW: Calculate classify duration
    classifyDuration = (Date.now() - classifyStart) / 1000;
    addLog(`⏱ Classification completed in ${classifyDuration.toFixed(2)}s`);
    
    // ... existing result processing ...

    // NEW: Calculate total duration and log summary
    const totalDuration = (Date.now() - operationStart) / 1000;
    addLog(``);
    addLog(`=== Performance Summary ===`);
    addLog(`Search: ${searchDuration.toFixed(2)}s`);
    addLog(`Classify: ${classifyDuration.toFixed(2)}s`);
    addLog(`Total: ${totalDuration.toFixed(2)}s`);

    // NEW: Console log for debugging
    console.log(`[Find & Classify] ${selectedLeadForEnrich.company} - Search: ${searchDuration.toFixed(2)}s, Classify: ${classifyDuration.toFixed(2)}s, Total: ${totalDuration.toFixed(2)}s`);

    // NEW: Enhanced toast with timing
    toast({
      title: "Find & Classify Complete",
      description: `Classified as ${classifyData.naics_code} (${classifyData.naics_confidence}%) in ${totalDuration.toFixed(1)}s`,
    });
    
    // ... rest of function ...
  }
};
```

## Result

After clicking "Find Industry + Classify" in the drawer, you'll see:

1. **Real-time timing in drawer logs** - Each step shows duration (e.g., "Search completed in 1.23s")
2. **Performance summary section** - At the end of the logs showing breakdown
3. **Enhanced toast** - Shows total time alongside classification result
4. **Console log** - Single line with all timing metrics for debugging

This matches the bulk operation's monitoring approach while leveraging the drawer's existing log display for immediate visibility.

