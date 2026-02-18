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
import { X, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

interface AdvancedCompanySignalsProps {
  leads: Lead[];
  onEnrichComplete: () => void;
}

export function AdvancedCompanySignals({ leads, onEnrichComplete }: AdvancedCompanySignalsProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleEnrichClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Advanced Company Signals</h2>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={5} className="text-center border-b-2 font-bold text-xs uppercase tracking-wider">Company</TableHead>
              <TableHead colSpan={2} className="text-center border-b-2 border-l font-bold text-xs uppercase tracking-wider">Contact</TableHead>
              <TableHead className="border-b-2 border-l" />
            </TableRow>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Zip</TableHead>
              <TableHead className="border-l">Full Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="border-l text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  No leads uploaded yet
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.company || "—"}</TableCell>
                  <TableCell>{lead.phone || "—"}</TableCell>
                  <TableCell>{lead.city || "—"}</TableCell>
                  <TableCell>{lead.state || "—"}</TableCell>
                  <TableCell>{lead.zipcode || "—"}</TableCell>
                  <TableCell className="border-l">{lead.full_name}</TableCell>
                  <TableCell>{lead.phone || "—"}</TableCell>
                  <TableCell className="border-l text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnrichClick(lead)}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Enrich
                    </Button>
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
          <div className="flex-1 p-6 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Enrichments will be configured here</p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
