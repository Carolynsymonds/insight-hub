import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Sparkles, Newspaper, Loader2, ExternalLink, RefreshCw, Pencil, Search, Download, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { EditLeadDialog } from "./EditLeadDialog";

type Lead = Tables<"leads">;

interface NewsResult {
  news_found: boolean;
  event_type?: string;
  headline?: string;
  event_summary?: string;
  source_url?: string;
  estimated_recency?: string;
  confidence_score: number;
  reason?: string;
  searched_at?: string;
  search_query?: string;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  location_type: string;
  formatted_address: string;
}

interface AdvancedCompanySignalsProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}

function parseNewsData(lead: Lead): NewsResult | null {
  if (!lead.news) return null;
  try {
    return typeof lead.news === "string" ? JSON.parse(lead.news) : lead.news as unknown as NewsResult;
  } catch {
    return null;
  }
}

const eventTypeColors: Record<string, string> = {
  funding: "bg-green-100 text-green-800 border-green-200",
  expansion: "bg-blue-100 text-blue-800 border-blue-200",
  partnership: "bg-purple-100 text-purple-800 border-purple-200",
  launch: "bg-orange-100 text-orange-800 border-orange-200",
  acquisition: "bg-red-100 text-red-800 border-red-200",
  contract: "bg-yellow-100 text-yellow-800 border-yellow-200",
  other: "bg-muted text-muted-foreground",
};

const recencyLabels: Record<string, string> = {
  recent: "< 6 months",
  "6-12 months": "6–12 months",
  old: "> 12 months",
  unknown: "Unknown",
};

export function AdvancedCompanySignals({ leads, onEnrichComplete }: AdvancedCompanySignalsProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newsResult, setNewsResult] = useState<NewsResult | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);

  const filteredLeads = leads.filter((lead) =>
    (lead.company || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const escapeCsvValue = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExportCSV = () => {
    const headers = ["Company Name", "Domain", "Address", "City", "State", "Zip", "Full Name", "Contact Phone"];
    const rows = filteredLeads.map((lead) =>
      [lead.company, lead.domain, (lead as any).first_line_address, lead.city, lead.state, lead.zipcode, lead.full_name, lead.phone]
        .map((v) => escapeCsvValue(v || ""))
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "advanced-signals-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEnrichClick = (lead: Lead) => {
    setSelectedLead(lead);
    setNewsResult(parseNewsData(lead));
    // Pre-populate geocode result if lead already has coordinates
    if (lead.latitude && lead.longitude) {
      setGeocodeResult({
        latitude: lead.latitude,
        longitude: lead.longitude,
        location_type: "",
        formatted_address: "",
      });
    } else {
      setGeocodeResult(null);
    }
    setDrawerOpen(true);
  };

  const handleGeocodeAddress = async () => {
    if (!selectedLead) return;
    setGeocodeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: {
          leadId: selectedLead.id,
          first_line_address: (selectedLead as any).first_line_address,
          state: selectedLead.state,
          zipcode: selectedLead.zipcode,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success) {
        setGeocodeResult(data as GeocodeResult);
        onEnrichComplete();
      }
    } catch (err: any) {
      toast({ title: "Geocoding failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setGeocodeLoading(false);
    }
  };

  const locationTypeColors: Record<string, string> = {
    ROOFTOP: "bg-green-100 text-green-800 border-green-200",
    RANGE_INTERPOLATED: "bg-blue-100 text-blue-800 border-blue-200",
    GEOMETRIC_CENTER: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROXIMATE: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const hasAddress = !!(selectedLead && ((selectedLead as any).first_line_address || selectedLead.zipcode));

  const handleFindNews = async () => {
    if (!selectedLead) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("find-commercial-news", {
        body: {
          leadId: selectedLead.id,
          company: selectedLead.company,
          domain: selectedLead.domain,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNewsResult(data as NewsResult);
      onEnrichComplete();
    } catch (err: any) {
      toast({ title: "News search failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Advanced Company Signals</h2>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-1 h-3 w-3" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={6} className="text-center border-b-2 font-bold text-xs uppercase tracking-wider">Company</TableHead>
              <TableHead colSpan={2} className="text-center border-b-2 border-l font-bold text-xs uppercase tracking-wider">Contact</TableHead>
              <TableHead className="border-b-2 border-l" />
            </TableRow>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Zip</TableHead>
              <TableHead className="border-l">Full Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="border-l text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  {searchQuery ? "No leads match your search" : "No leads uploaded yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.company || "—"}</TableCell>
                  <TableCell>{lead.domain || "—"}</TableCell>
                  <TableCell>{(lead as any).first_line_address || "—"}</TableCell>
                  <TableCell>{lead.city || "—"}</TableCell>
                  <TableCell>{lead.state || "—"}</TableCell>
                  <TableCell>{lead.zipcode || "—"}</TableCell>
                  <TableCell className="border-l">{lead.full_name}</TableCell>
                  <TableCell>{lead.phone || "—"}</TableCell>
                  <TableCell className="border-l text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEnrichClick(lead)}>
                        <Sparkles className="mr-1 h-3 w-3" />
                        Enrich
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingLead(lead); setShowEditDialog(true); }}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent direction="right" className="sm:max-w-lg">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>{selectedLead?.company || "Unknown Company"}</DrawerTitle>
                <DrawerDescription>{selectedLead?.full_name}</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Find News Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Commercial News</h3>
                {newsResult && (
                  <Button size="sm" variant="ghost" onClick={handleFindNews} disabled={loading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                    Re-run
                  </Button>
                )}
              </div>

              {!newsResult && !loading && (
                <Button onClick={handleFindNews} variant="outline" className="w-full">
                  <Newspaper className="mr-2 h-4 w-4" />
                  Find News
                </Button>
              )}

              {loading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Searching for commercial news...</span>
                </div>
              )}

              {newsResult && !loading && (
                <div className="space-y-3">
                  {newsResult.news_found ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        {newsResult.event_type && (
                          <Badge className={eventTypeColors[newsResult.event_type] || eventTypeColors.other}>
                            {newsResult.event_type}
                          </Badge>
                        )}
                        {newsResult.estimated_recency && (
                          <Badge variant="outline" className="text-xs">
                            {recencyLabels[newsResult.estimated_recency] || newsResult.estimated_recency}
                          </Badge>
                        )}
                      </div>

                      {newsResult.headline && (
                        <p className="font-medium text-sm text-foreground">{newsResult.headline}</p>
                      )}

                      {newsResult.event_summary && (
                        <p className="text-sm text-muted-foreground">{newsResult.event_summary}</p>
                      )}

                      {newsResult.source_url && (
                        <a
                          href={newsResult.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-primary hover:underline"
                        >
                          View source <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Confidence</span>
                          <span>{newsResult.confidence_score}%</span>
                        </div>
                        <Progress value={newsResult.confidence_score} className="h-2" />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">No commercially relevant news found</p>
                      {newsResult.reason && (
                        <p className="text-xs text-muted-foreground/70">{newsResult.reason}</p>
                      )}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Confidence</span>
                          <span>{newsResult.confidence_score}%</span>
                        </div>
                        <Progress value={newsResult.confidence_score} className="h-2" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Classify Address Type Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Classify Address Type</h3>
                {geocodeResult && geocodeResult.location_type && (
                  <Button size="sm" variant="ghost" onClick={handleGeocodeAddress} disabled={geocodeLoading}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${geocodeLoading ? "animate-spin" : ""}`} />
                    Re-run
                  </Button>
                )}
              </div>

              {!geocodeResult?.location_type && !geocodeLoading && (
                <Button onClick={handleGeocodeAddress} variant="outline" className="w-full" disabled={!hasAddress}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Geocode Address
                </Button>
              )}

              {geocodeLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Geocoding address...</span>
                </div>
              )}

              {geocodeResult && geocodeResult.location_type && !geocodeLoading && (
                <div className="space-y-3">
                  <Badge className={locationTypeColors[geocodeResult.location_type] || "bg-muted text-muted-foreground"}>
                    {geocodeResult.location_type}
                  </Badge>

                  {geocodeResult.formatted_address && (
                    <p className="text-sm text-muted-foreground">{geocodeResult.formatted_address}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Latitude</span>
                      <p className="font-medium">{geocodeResult.latitude}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Longitude</span>
                      <p className="font-medium">{geocodeResult.longitude}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <EditLeadDialog
        lead={editingLead}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={onEnrichComplete}
      />
    </div>
  );
}
