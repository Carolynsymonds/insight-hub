import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Sparkles, Loader2, Trash2, ExternalLink, Link2, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface EnrichmentLog {
  timestamp: string;
  action: string;
  searchParams: {
    company: string;
    city?: string;
    state?: string;
    micsSector?: string;
  };
  organizationsFound: number;
  selectedOrganization?: {
    name: string;
    domain: string;
    revenue?: string;
    foundedYear?: number;
  };
  domain: string | null;
  confidence: number;
  source: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  searchInformation?: {
    query_displayed: string;
    total_results: number;
    time_taken_displayed: number;
    organic_results_state: string;
    results_for: string;
  };
  searchSteps?: {
    step: number;
    query: string;
    resultFound: boolean;
    source?: string;
  }[];
}

interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  dma: string | null;
  zipcode: string | null;
  domain: string | null;
  enrichment_status: string | null;
  enrichment_source: string | null;
  enrichment_confidence: number | null;
  enriched_at: string | null;
  enrichment_logs: EnrichmentLog[] | null;
  mics_sector: string | null;
  mics_subsector: string | null;
  mics_segment: string | null;
}
interface LeadsTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}
const LeadsTable = ({ leads, onEnrichComplete }: LeadsTableProps) => {
  const { toast } = useToast();
  const [enrichingSource, setEnrichingSource] = useState<{ leadId: string; source: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showLogsForSource, setShowLogsForSource] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  
  const getConfidenceExplanation = (source: string, confidence: number) => {
    if (source === "apollo_api" || source === "apollo_api_error") {
      if (confidence === 95) return "95% - When primary_domain field exists (most reliable)";
      if (confidence === 90) return "90% - When website_url exists and can be parsed as valid URL";
      if (confidence === 85) return "85% - When website_url exists but URL parsing fails (used as-is)";
      return "0% - No domain found";
    }
    if (source === "google_knowledge_graph" || source === "google_knowledge_graph_error" || source === "google_local_results") {
      if (confidence === 100) return "100% - Step 1: knowledge_graph.website found";
      if (confidence === 50) return "50% - Step 1: local_results fallback";
      if (confidence === 25) return "25% - Step 2: Industry search knowledge_graph";
      if (confidence === 15) return "15% - Step 2: Industry search local_results";
      if (confidence === 10) return "10% - Step 3: Simple search knowledge_graph";
      if (confidence === 5) return "5% - Step 3: Simple search local_results";
      if (confidence === 8) return "8% - Step 4: Vehicle Tracking search knowledge_graph";
      if (confidence === 4) return "4% - Step 4: Vehicle Tracking search local_results";
      return "0% - No domain found after all search steps";
    }
    return "Confidence score indicates data quality";
  };
  
  const handleEnrich = async (lead: Lead, source: "apollo" | "google") => {
    setEnrichingSource({ leadId: lead.id, source });
    try {
    const { data, error } = await supabase.functions.invoke("enrich-lead", {
      body: {
        leadId: lead.id,
        company: lead.company,
        city: lead.city,
        state: lead.state,
        mics_sector: lead.mics_sector,
        source,
      },
    });
      if (error) throw error;
      
      toast({
        title: "Enrichment Complete!",
        description: data.domain 
          ? `Found domain: ${data.domain} (${data.confidence}% confidence)` 
          : "No domain found for this company",
      });
      
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingSource(null);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Lead deleted successfully.",
      });
      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  const showLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetails(true);
  };
  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>MICS Sector</TableHead>
              <TableHead>Zipcode</TableHead>
              <TableHead>DMA</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Company Domain
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No leads yet. Add your first lead above.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => showLeadDetails(lead)}
                >
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.company || "—"}</TableCell>
                  <TableCell>{lead.mics_sector || "—"}</TableCell>
                  <TableCell>{lead.zipcode || "—"}</TableCell>
                  <TableCell>{lead.dma || "—"}</TableCell>
                  <TableCell>
                    {lead.domain ? (
                      <a
                        href={`https://${lead.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Drawer 
                        direction="right" 
                        open={openDrawer === lead.id}
                        onOpenChange={(open) => setOpenDrawer(open ? lead.id : null)}
                      >
                        <DrawerTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Search className="h-4 w-4" />
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent direction="right" className="bg-background [&_*]:select-text [&_button]:select-none [&_[role=button]]:select-none">
                          <DrawerHeader className="flex flex-row items-center justify-between select-none">
                            <DrawerTitle className="select-none">Enrichments</DrawerTitle>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setOpenDrawer(null)}
                              className="select-none"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </DrawerHeader>
                          <div className="px-4 pb-8 select-text overflow-y-auto" style={{ userSelect: 'text' }}>
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="company-domain" className="border-border">
                                <AccordionTrigger className="text-sm hover:no-underline select-none cursor-pointer">
                                  Company Domain
                                </AccordionTrigger>
                                <AccordionContent className="select-text" style={{ userSelect: 'text' }}>
                                  <div className="space-y-3 pt-2">
                                    {lead.enrichment_logs && lead.enrichment_logs.length > 0 ? (
                                      <>
                                        {/* Group logs by source */}
                                        {(() => {
                                          const logsBySource = lead.enrichment_logs.reduce((acc, log) => {
                                            if (!acc[log.source]) {
                                              acc[log.source] = [];
                                            }
                                            acc[log.source].push(log);
                                            return acc;
                                          }, {} as Record<string, EnrichmentLog[]>);

                                          return Object.entries(logsBySource).map(([source, logs]) => {
                                            const mostRecentLog = logs[logs.length - 1]; // Get the most recent log (last in array)
                                            const sourceLabel = source === "apollo_api" 
                                              ? "Apollo" 
                                              : source === "google_knowledge_graph" || source === "google_local_results"
                                              ? "Google" 
                                              : source;
                                            
                                            return (
                                              <div key={source} className="border rounded-lg p-3 space-y-3" style={{ userSelect: 'text' }}>
                                                {/* Source Header */}
                                                <div className="flex items-center justify-between select-none">
                                                  <h4 className="font-semibold text-sm select-none">{sourceLabel}</h4>
                                                  {mostRecentLog.domain && (
                                                    <div className="flex items-center gap-1">
                                                      <Badge variant="outline" className="text-xs">
                                                        {mostRecentLog.confidence}% confidence
                                                      </Badge>
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                          </TooltipTrigger>
                                                          <TooltipContent className="max-w-xs">
                                                            <p className="text-xs">{getConfidenceExplanation(source, mostRecentLog.confidence)}</p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Domain Display */}
                                                <div style={{ userSelect: 'text' }}>
                                                  <p className="text-xs text-muted-foreground mb-1 select-text">Domain:</p>
                                                  {mostRecentLog.domain ? (
                                                    <a
                                                      href={`https://${mostRecentLog.domain}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-sm text-primary hover:underline flex items-center gap-1 select-text"
                                                      onClick={(e) => e.stopPropagation()}
                                                      style={{ userSelect: 'text' }}
                                                    >
                                                      {mostRecentLog.domain}
                                                      <ExternalLink className="h-3 w-3 select-none" />
                                                    </a>
                                                  ) : (
                                                    <p className="text-sm text-muted-foreground select-text">No domain found</p>
                                                  )}
                                                </div>

                                                {/* View Logs Button */}
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => setShowLogsForSource(showLogsForSource === source ? null : source)}
                                                  className="w-full select-none"
                                                >
                                                  {showLogsForSource === source ? "Hide Logs" : "View Logs"}
                                                </Button>

                                                {/* Collapsible Logs Section */}
                                                {showLogsForSource === source && (
                                                  <div className="space-y-2 max-h-96 overflow-y-auto pt-2 border-t" style={{ userSelect: 'text' }}>
                                                    {/* Show only the most recent log */}
                                                    {(() => {
                                                      const latestLog = logs[logs.length - 1];
                                                      return (
                                                        <div className="bg-muted/30 rounded-md p-2 text-xs space-y-1" style={{ userSelect: 'text' }}>
                                                          <div className="flex items-center justify-between">
                                                            <span className="font-medium text-muted-foreground">
                                                              {new Date(latestLog.timestamp).toLocaleString()}
                                                            </span>
                                                          </div>
                                                          
                                                          {/* Search Steps */}
                                                          {latestLog.searchSteps && latestLog.searchSteps.length > 0 && (
                                                            <div className="border rounded p-2 mb-2 bg-background/50">
                                                              <p className="font-medium mb-2">Search Path:</p>
                                                              <div className="space-y-2">
                                                                 {latestLog.searchSteps.map((step, idx) => (
                                                                  <div key={idx} className="border-l-2 border-primary/30 pl-2">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                      <Badge 
                                                                        variant={
                                                                          step.query.startsWith("Skipped") 
                                                                            ? "outline" 
                                                                            : step.resultFound 
                                                                              ? "default" 
                                                                              : "secondary"
                                                                        } 
                                                                        className="text-xs h-5"
                                                                      >
                                                                        Step {step.step}
                                                                      </Badge>
                                                                      {step.resultFound && step.source && (
                                                                        <span className="text-muted-foreground text-xs">via {step.source}</span>
                                                                      )}
                                                                      {step.query.startsWith("Skipped") && (
                                                                        <span className="text-muted-foreground text-xs italic">Skipped</span>
                                                                      )}
                                                                    </div>
                                                                    <p className="text-muted-foreground break-all font-mono text-xs mt-1 bg-muted/50 p-1 rounded">
                                                                      {step.query}
                                                                    </p>
                                                                    <p className="mt-1 font-medium text-xs">
                                                                      {step.query.startsWith("Skipped") 
                                                                        ? '⊘ Skipped' 
                                                                        : step.resultFound 
                                                                          ? '✓ Found results' 
                                                                          : '✗ No results'}
                                                                    </p>
                                                                  </div>
                                                                ))}
                                                               </div>
                                                             </div>
                                                           )}
                                                          
                                                          <div className="text-muted-foreground space-y-0.5">
                                                            <p><span className="font-medium">Company:</span> {latestLog.searchParams.company}</p>
                                                            {latestLog.searchParams.city && <p><span className="font-medium">City:</span> {latestLog.searchParams.city}</p>}
                                                            {latestLog.searchParams.state && <p><span className="font-medium">State:</span> {latestLog.searchParams.state}</p>}
                                                            {latestLog.searchParams.micsSector && <p><span className="font-medium">MICS Sector:</span> {latestLog.searchParams.micsSector}</p>}
                                                            <p><span className="font-medium">Organizations found:</span> {latestLog.organizationsFound}</p>
                                                          </div>
                                                          {latestLog.selectedOrganization && (
                                                            <div className="border-t pt-1 mt-1 space-y-0.5">
                                                              <p className="font-medium">{latestLog.selectedOrganization.name}</p>
                                                              <p>Domain: {latestLog.selectedOrganization.domain}</p>
                                                              {latestLog.selectedOrganization.revenue && (
                                                                <p>Revenue: {latestLog.selectedOrganization.revenue}</p>
                                                              )}
                                                              {latestLog.selectedOrganization.foundedYear && (
                                                                <p>Founded: {latestLog.selectedOrganization.foundedYear}</p>
                                                              )}
                                                            </div>
                                                          )}
                                                          {latestLog.gpsCoordinates && (
                                                            <div className="border-t pt-1 mt-1 space-y-0.5">
                                                              <p className="font-medium">GPS Coordinates</p>
                                                              <p>Latitude: {latestLog.gpsCoordinates.latitude}</p>
                                                              <p>Longitude: {latestLog.gpsCoordinates.longitude}</p>
                                                            </div>
                                                          )}
                                                          {latestLog.searchInformation && (
                                                            <div className="border-t pt-1 mt-1 space-y-0.5">
                                                              <p className="font-medium">Search Info</p>
                                                              <p>Query: {latestLog.searchInformation.query_displayed}</p>
                                                              <p>Results for: {latestLog.searchInformation.results_for}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No enrichment data yet</p>
                                    )}
                                    
                                    {/* Enrich Buttons */}
                                    <div className="space-y-2 mt-4">
                                      <Button
                                        size="sm"
                                        onClick={() => handleEnrich(lead, "apollo")}
                                        disabled={enrichingSource?.leadId === lead.id || !lead.company}
                                        className="w-full"
                                        variant="outline"
                                      >
                                        {enrichingSource?.leadId === lead.id && enrichingSource?.source === "apollo" ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enriching with Apollo...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Enrich with Apollo
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleEnrich(lead, "google")}
                                        disabled={enrichingSource?.leadId === lead.id || !lead.company}
                                        className="w-full"
                                        variant="outline"
                                      >
                                        {enrichingSource?.leadId === lead.id && enrichingSource?.source === "google" ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enriching with Google...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Enrich with Google
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>Complete information for this lead</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-sm">{selectedLead.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedLead.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p className="text-sm">{selectedLead.company || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">City</p>
                  <p className="text-sm">{selectedLead.city || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">State</p>
                  <p className="text-sm">{selectedLead.state || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">DMA</p>
                  <p className="text-sm">{selectedLead.dma || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zipcode</p>
                  <p className="text-sm">{selectedLead.zipcode || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MICS Sector</p>
                  <p className="text-sm">{selectedLead.mics_sector || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MICS Subsector</p>
                  <p className="text-sm">{selectedLead.mics_subsector || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MICS Segment</p>
                  <p className="text-sm">{selectedLead.mics_segment || "—"}</p>
                </div>
              </div>
              {selectedLead.domain && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Enrichment Data</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Domain</p>
                      <p className="text-sm">{selectedLead.domain}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Source</p>
                      <p className="text-sm">{selectedLead.enrichment_source || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Confidence</p>
                      <p className="text-sm">
                        {selectedLead.enrichment_confidence ? `${selectedLead.enrichment_confidence}%` : "—"}
                      </p>
                    </div>
                    {selectedLead.enriched_at && (
                      <div>
                        <p className="text-sm font-medium">Enriched At</p>
                        <p className="text-sm">{new Date(selectedLead.enriched_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
export default LeadsTable;
