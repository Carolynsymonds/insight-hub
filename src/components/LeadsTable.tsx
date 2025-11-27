import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
}

interface LeadsTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}

const LeadsTable = ({ leads, onEnrichComplete }: LeadsTableProps) => {
  const { toast } = useToast();
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleEnrich = async (lead: Lead) => {
    setEnrichingId(lead.id);

    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: {
          leadId: lead.id,
          company: lead.company,
          email: lead.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Enrichment Complete!",
        description: `Found domain: ${data.domain}`,
      });

      onEnrichComplete();
    } catch (error: any) {
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrichingId(null);
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
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No leads yet. Add your first lead above.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => showLeadDetails(lead)}>
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.company || "—"}</TableCell>
                  <TableCell>
                    {lead.domain ? (
                      <a
                        href={`https://${lead.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.domain}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lead.enrichment_status === "enriched"
                          ? "default"
                          : lead.enrichment_status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {lead.enrichment_status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEnrich(lead)}
                        disabled={enrichingId === lead.id || !lead.company}
                        variant="outline"
                      >
                        {enrichingId === lead.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Enrich
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                      <p className="text-sm">{selectedLead.enrichment_confidence ? `${selectedLead.enrichment_confidence}%` : "—"}</p>
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
