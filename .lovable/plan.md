

# Monitor Performance of "Find & Classify All"

## Overview
Add performance tracking to the "Find & Classify All" button that captures timing metrics for each step (search and classify) and displays a summary when the operation completes. This will help you understand how long each API call takes and identify any bottlenecks.

## What Will Be Tracked

| Metric | Description |
|--------|-------------|
| Total Duration | Overall time from start to finish |
| Search Time (per lead) | Time for each `search-industry-serper` call |
| Classify Time (per lead) | Time for each `classify-naics` call |
| Average Times | Mean duration for each step type |
| Success/Failure Rate | Count of successful vs failed operations |

## Implementation Approach

### 1. Track Timing in Handler Function

Update `handleBulkFindAndClassify` in `IndustryEnrichmentTable.tsx` to:

- Record start time for the entire operation
- Time each individual API call (search and classify)
- Store per-lead timing data in an array
- Calculate averages and totals at the end

### 2. Display Performance Summary

Show a detailed toast or modal at completion with:

- Total processing time
- Average time per lead
- Breakdown: search vs classify time
- Fastest/slowest lead processing

### 3. Console Logging for Debugging

Add structured console logs that output:
```
[Find & Classify] Lead 1/10: Company Name
  ├─ Search: 1.2s
  ├─ Classify: 2.3s
  └─ Total: 3.5s
```

## Technical Changes

### File: `src/components/IndustryEnrichmentTable.tsx`

#### Add Performance State (around line 117)
```typescript
const [performanceMetrics, setPerformanceMetrics] = useState<{
  totalDuration: number;
  searchTimes: number[];
  classifyTimes: number[];
  leadTimes: { company: string; search: number; classify: number; total: number }[];
} | null>(null);
```

#### Update Handler Function
Wrap each API call with timing:

```typescript
const handleBulkFindAndClassify = async () => {
  // ... existing validation ...

  const operationStart = Date.now();
  const searchTimes: number[] = [];
  const classifyTimes: number[] = [];
  const leadTimes: { company: string; search: number; classify: number; total: number }[] = [];

  for (let i = 0; i < leadsNeedingClassification.length; i++) {
    const lead = leadsNeedingClassification[i];
    const leadStart = Date.now();
    
    // Step 1: Find Industry - with timing
    const searchStart = Date.now();
    const searchResponse = await supabase.functions.invoke("search-industry-serper", { ... });
    const searchDuration = (Date.now() - searchStart) / 1000;
    searchTimes.push(searchDuration);
    
    // Step 2: Classify - with timing
    const classifyStart = Date.now();
    const classifyResponse = await supabase.functions.invoke("classify-naics", { ... });
    const classifyDuration = (Date.now() - classifyStart) / 1000;
    classifyTimes.push(classifyDuration);
    
    const leadTotal = (Date.now() - leadStart) / 1000;
    leadTimes.push({ company: lead.company || "Unknown", search: searchDuration, classify: classifyDuration, total: leadTotal });
    
    console.log(`[Find & Classify] ${i + 1}/${total}: ${lead.company} - Search: ${searchDuration.toFixed(2)}s, Classify: ${classifyDuration.toFixed(2)}s`);
  }

  const totalDuration = (Date.now() - operationStart) / 1000;
  
  // Calculate averages
  const avgSearch = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
  const avgClassify = classifyTimes.reduce((a, b) => a + b, 0) / classifyTimes.length;
  
  // Show detailed summary
  toast({
    title: "Bulk Find & Classify Complete",
    description: `Processed ${successCount} leads in ${totalDuration.toFixed(1)}s. Avg: ${avgSearch.toFixed(1)}s search + ${avgClassify.toFixed(1)}s classify per lead.`,
  });
  
  // Log full metrics to console
  console.table(leadTimes);
};
```

## Result

After clicking "Find & Classify All", you'll see:

1. **Real-time progress** in the button (already exists)
2. **Console logs** for each lead with timing breakdown
3. **Summary toast** showing total time and averages
4. **Console table** with full per-lead metrics for analysis

This gives you visibility into API performance without requiring a database table, making it easy to identify if the search or classify step is the bottleneck.

