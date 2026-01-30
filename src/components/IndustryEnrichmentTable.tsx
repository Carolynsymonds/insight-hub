import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  dma: string | null;
  company_industry: string | null;
  domain: string | null;
  description: string | null;
}

interface IndustryEnrichmentTableProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}

export function IndustryEnrichmentTable({ leads, onEnrichComplete }: IndustryEnrichmentTableProps) {
  const { toast } = useToast();
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());

  const handleEnrichIndustry = async (lead: Lead) => {
    setEnrichingIds(prev => new Set(prev).add(lead.id));

    try {
      const { data, error } = await supabase.functions.invoke("enrich-industry", {
        body: {
          leadId: lead.id,
          company: lead.company,
          domain: lead.domain,
          dma: lead.dma,
          description: lead.description,
        },
      });

      if (error) throw error;

      toast({
        title: "Industry Enriched",
        description: `Industry set to: ${data.industry}`,
      });

      onEnrichComplete();
    } catch (error) {
      console.error("Error enriching industry:", error);
      toast({
        title: "Enrichment Failed",
        description: error instanceof Error ? error.message : "Failed to enrich industry",
        variant: "destructive",
      });
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0F0F4B]">Industry Enrichment</h2>
          <p className="text-sm text-muted-foreground">
            Enrich the industry classification for your leads using AI analysis
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {leads.filter(l => l.company_industry).length} / {leads.length} enriched
        </Badge>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">DMA</TableHead>
              <TableHead className="font-semibold">Industry</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isEnriching = enrichingIds.has(lead.id);
              const hasIndustry = !!lead.company_industry;

              return (
                <TableRow key={lead.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>{lead.company || "-"}</TableCell>
                  <TableCell>{lead.dma || "-"}</TableCell>
                  <TableCell>
                    {hasIndustry ? (
                      <span className="text-[#0e0f4d] font-medium">{lead.company_industry}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={hasIndustry ? "outline" : "default"}
                      onClick={() => handleEnrichIndustry(lead)}
                      disabled={isEnriching}
                    >
                      {isEnriching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Enriching...</span>
                        </>
                      ) : hasIndustry ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          <span>Re-enrich</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Enrich</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
