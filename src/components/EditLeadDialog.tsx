import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditLeadDialogProps {
  lead: {
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
    category: string;
    mics_sector: string | null;
    mics_subsector: string | null;
    mics_segment: string | null;
    vehicles_count: string | null;
    confirm_vehicles_50_plus: string | null;
    truck_types: string | null;
    features: string | null;
    description: string | null;
    size: string | null;
    annual_revenue: string | null;
    company_industry: string | null;
    linkedin: string | null;
    facebook: string | null;
    instagram: string | null;
    contact_email: string | null;
    contact_linkedin: string | null;
    contact_facebook: string | null;
    contact_youtube: string | null;
    founded_date: string | null;
    products_services: string | null;
    short_summary: string | null;
    long_summary: string | null;
    news: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const FIELD_CONFIG: { key: string; label: string; type: "text" | "textarea" }[] = [
  { key: "full_name", label: "Full Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "domain", label: "Company Domain", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "zipcode", label: "Zipcode", type: "text" },
  { key: "dma", label: "DMA", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "mics_sector", label: "MICS Sector", type: "text" },
  { key: "mics_subsector", label: "MICS Subsector", type: "text" },
  { key: "mics_segment", label: "MICS Segment", type: "text" },
  { key: "company_industry", label: "Industry", type: "text" },
  { key: "size", label: "Company Size", type: "text" },
  { key: "annual_revenue", label: "Annual Revenue", type: "text" },
  { key: "founded_date", label: "Founded Date", type: "text" },
  { key: "linkedin", label: "LinkedIn URL", type: "text" },
  { key: "facebook", label: "Facebook URL", type: "text" },
  { key: "instagram", label: "Instagram URL", type: "text" },
  { key: "contact_email", label: "Contact Email", type: "text" },
  { key: "contact_linkedin", label: "Contact LinkedIn", type: "text" },
  { key: "contact_facebook", label: "Contact Facebook", type: "text" },
  { key: "contact_youtube", label: "Contact YouTube", type: "text" },
  { key: "vehicles_count", label: "Vehicles Count", type: "text" },
  { key: "confirm_vehicles_50_plus", label: "Confirm Vehicles 50+", type: "text" },
  { key: "truck_types", label: "Truck Types", type: "text" },
  { key: "features", label: "Features", type: "text" },
  { key: "products_services", label: "Products/Services", type: "textarea" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "short_summary", label: "Short Summary", type: "textarea" },
  { key: "long_summary", label: "Long Summary", type: "textarea" },
  { key: "news", label: "News", type: "textarea" },
];

export const EditLeadDialog = ({ lead, open, onOpenChange, onSave }: EditLeadDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lead && open) {
      const data: Record<string, string> = {};
      FIELD_CONFIG.forEach(({ key }) => {
        data[key] = (lead as any)[key] ?? "";
      });
      setFormData(data);
    }
  }, [lead, open]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {};
      FIELD_CONFIG.forEach(({ key }) => {
        const value = formData[key]?.trim();
        updates[key] = value || null;
      });
      // full_name is required
      if (!updates.full_name) {
        toast({ title: "Error", description: "Full Name is required", variant: "destructive" });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("leads").update(updates).eq("id", lead.id);
      if (error) throw error;

      toast({ title: "Saved", description: "Lead updated successfully." });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-2" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {FIELD_CONFIG.map(({ key, label, type }) => (
              <div key={key} className={type === "textarea" ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label htmlFor={`edit-${key}`} className="text-xs font-medium text-muted-foreground">
                  {label}
                </Label>
                {type === "textarea" ? (
                  <Textarea
                    id={`edit-${key}`}
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    id={`edit-${key}`}
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
