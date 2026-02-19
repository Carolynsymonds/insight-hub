import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, UserPlus, Eye, Check, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LeadUploadProps {
  onUploadComplete: (category: string) => void;
  defaultCategory?: string;
}

const CATEGORIES = [
  "Marketing",
  "Ecommerce",
  "Website",
  "Sales",
  "Taking Payments",
  "Operations",
  "Finance",
  "Utilities",
  "Offices",
  "Vehicles",
  "Security",
] as const;

const VEHICLES_COUNT_OPTIONS = ["5-20", "21-50", "More than 50"] as const;
const CONFIRM_VEHICLES_OPTIONS = ["50-99", "100+"] as const;
const TRUCK_TYPE_OPTIONS = [
  "Cars / Automobiles",
  "Vans / Trucks",
  "Heavy duty trucks / Semis",
  "Construction Machinery",
] as const;
const FEATURES_OPTIONS = [
  "Real-time GPS Tracking",
  "Fuel efficiency monitoring",
  "Route optimization",
  "Electronic logging device (ELD)",
] as const;

// Column mapping configuration
const COLUMN_MAPPINGS: Record<string, { dbField: string; label: string }> = {
  "full_name": { dbField: "full_name", label: "Full Name" },
  "name": { dbField: "full_name", label: "Full Name" },
  "phone": { dbField: "phone", label: "Phone" },
  "email": { dbField: "email", label: "Email" },
  "company": { dbField: "company", label: "Company" },
  "city": { dbField: "city", label: "City" },
  "state": { dbField: "state", label: "State" },
  "dma": { dbField: "dma", label: "DMA" },
  "zipcode": { dbField: "zipcode", label: "Zipcode" },
  "zip": { dbField: "zipcode", label: "Zipcode" },
  "mics sector (harmonised)": { dbField: "mics_sector", label: "MICS Sector" },
  "mics_sector": { dbField: "mics_sector", label: "MICS Sector" },
  "mics subsector (harmonised)": { dbField: "mics_subsector", label: "MICS Subsector" },
  "mics_subsector": { dbField: "mics_subsector", label: "MICS Subsector" },
  "mics segment (harmonised)": { dbField: "mics_segment", label: "MICS Segment" },
  "mics_segment": { dbField: "mics_segment", label: "MICS Segment" },
  "vehicles_count": { dbField: "vehicles_count", label: "Vehicles Count" },
  "vehicles count": { dbField: "vehicles_count", label: "Vehicles Count" },
  "confirm_vehicles_50_plus": { dbField: "confirm_vehicles_50_plus", label: "Confirm Vehicles +50" },
  "confirm vehicles +50": { dbField: "confirm_vehicles_50_plus", label: "Confirm Vehicles +50" },
  "confirm_vehicles_+50": { dbField: "confirm_vehicles_50_plus", label: "Confirm Vehicles +50" },
  "confirm_vehicles_50plus": { dbField: "confirm_vehicles_50_plus", label: "Confirm Vehicles +50" },
  "truck_types": { dbField: "truck_types", label: "Truck Types" },
  "truck": { dbField: "truck_types", label: "Truck Types" },
  "features": { dbField: "features", label: "Features" },
  "domain": { dbField: "domain", label: "Domain" },
  "first_line_address": { dbField: "first_line_address", label: "First Line Address" },
  "address": { dbField: "first_line_address", label: "First Line Address" },
  "street_address": { dbField: "first_line_address", label: "First Line Address" },
  "address_line_1": { dbField: "first_line_address", label: "First Line Address" },
};

interface PreviewData {
  headers: string[];
  mappedHeaders: { original: string; mapped: string | null; label: string | null }[];
  rows: string[][];
  leads: any[];
}

const LeadUpload = ({ onUploadComplete, defaultCategory }: LeadUploadProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [csvCategory, setCsvCategory] = useState(defaultCategory || "");
  const [selectedTruckTypes, setSelectedTruckTypes] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    company: "",
    city: "",
    state: "",
    dma: "",
    zipcode: "",
    mics_sector: "",
    mics_subsector: "",
    mics_segment: "",
    category: defaultCategory || "",
    vehicles_count: "",
    confirm_vehicles_50_plus: "",
    domain: "",
    first_line_address: "",
  });

  const handleTruckTypeChange = (truckType: string, checked: boolean) => {
    setSelectedTruckTypes(prev =>
      checked ? [...prev, truckType] : prev.filter(t => t !== truckType)
    );
  };

  const handleFeatureChange = (feature: string, checked: boolean) => {
    setSelectedFeatures(prev =>
      checked ? [...prev, feature] : prev.filter(f => f !== feature)
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      // Check for duplicate (same full_name AND company within the same category)
      if (formData.full_name && formData.company) {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("user_id", user.id)
          .eq("category", formData.category)
          .ilike("full_name", formData.full_name)
          .ilike("company", formData.company)
          .maybeSingle();

        if (existingLead) {
          toast({
            title: "Duplicate Lead",
            description: `A lead with name "${formData.full_name}" at company "${formData.company}" already exists in the "${formData.category}" category.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("leads").insert({
        ...formData,
        truck_types: selectedTruckTypes.length > 0 ? selectedTruckTypes.join(",") : null,
        features: selectedFeatures.length > 0 ? selectedFeatures.join(",") : null,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Lead added successfully.",
      });

      setFormData({
        full_name: "",
        phone: "",
        email: "",
        company: "",
        city: "",
        state: "",
        dma: "",
        zipcode: "",
        mics_sector: "",
        mics_subsector: "",
        mics_segment: "",
        category: defaultCategory || "",
        vehicles_count: "",
        confirm_vehicles_50_plus: "",
        domain: "",
        first_line_address: "",
      });
      setSelectedTruckTypes([]);
      setSelectedFeatures([]);

      onUploadComplete(formData.category);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split("\n").filter(line => line.trim());
    
    // Normalize whitespace: replace tabs and multiple spaces with single space
    const normalizeWhitespace = (str: string): string => {
      return str.replace(/\s+/g, ' ').trim();
    };
    
    // Parse a single CSV line handling quoted fields with commas
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote inside quoted field
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote mode
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field - normalize whitespace
          result.push(normalizeWhitespace(current));
          current = '';
        } else {
          current += char;
        }
      }
      
      // Don't forget the last field - normalize whitespace
      result.push(normalizeWhitespace(current));
      
      return result;
    };
    
    const headers = parseLine(lines[0]).map(h => h.toLowerCase());
    const rows = lines.slice(1).map(line => parseLine(line));
    
    return { headers, rows };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!csvCategory) {
      toast({
        title: "Error",
        description: "Please select a category before uploading",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      // Map headers to database fields
      const mappedHeaders = headers.map(header => {
        const mapping = COLUMN_MAPPINGS[header];
        return {
          original: header,
          mapped: mapping?.dbField || null,
          label: mapping?.label || null,
        };
      });

      // Parse leads for preview
      const leads = rows.map(values => {
        const lead: any = { category: csvCategory };
        headers.forEach((header, index) => {
          const value = values[index];
          const mapping = COLUMN_MAPPINGS[header];
          if (mapping) {
            lead[mapping.dbField] = value;
          }
        });
        return lead;
      });

      setPreviewData({
        headers,
        mappedHeaders,
        rows,
        leads,
      });
      setShowPreview(true);
    } catch (error: any) {
      toast({
        title: "Error parsing CSV",
        description: error.message,
        variant: "destructive",
      });
    }
    
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!previewData) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      // Get the next batch number (ignore manual leads where upload_batch is null)
      const { data: maxBatchResult, error: maxBatchError } = await supabase
        .from("leads")
        .select("upload_batch")
        .eq("user_id", user.id)
        .not("upload_batch", "is", null)
        .order("upload_batch", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxBatchError) throw maxBatchError;

      const nextBatch = (maxBatchResult?.upload_batch ?? 0) + 1;

      const leads = previewData.leads.map(lead => ({
        ...lead,
        user_id: user.id,
        upload_batch: nextBatch,
      }));

      // Query existing leads to check for duplicates (only within the same category)
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("full_name, company")
        .eq("user_id", user.id)
        .eq("category", csvCategory);

      // Filter out duplicates
      const duplicates: string[] = [];
      const seenInCsv = new Set<string>();
      
      const uniqueLeads = leads.filter(lead => {
        const key = `${(lead.full_name || '').toLowerCase()}|${(lead.company || '').toLowerCase()}`;
        
        if (seenInCsv.has(key)) {
          duplicates.push(`${lead.full_name} (${lead.company || 'No company'})`);
          return false;
        }
        seenInCsv.add(key);
        
        const isDuplicate = existingLeads?.some(
          existing => 
            (existing.full_name || '').toLowerCase() === (lead.full_name || '').toLowerCase() &&
            (existing.company || '').toLowerCase() === (lead.company || '').toLowerCase()
        );
        
        if (isDuplicate) {
          duplicates.push(`${lead.full_name} (${lead.company || 'No company'})`);
        }
        return !isDuplicate;
      });

      if (uniqueLeads.length === 0) {
        toast({
          title: "No New Leads",
          description: `All ${leads.length} leads already exist in the "${csvCategory}" category.`,
          variant: "destructive",
        });
        setLoading(false);
        setShowPreview(false);
        setPreviewData(null);
        return;
      }

      const { error } = await supabase.from("leads").insert(uniqueLeads);

      if (error) throw error;

      const duplicateMessage = duplicates.length > 0 
        ? ` ${duplicates.length} duplicate(s) skipped.`
        : '';

      toast({
        title: "Success!",
        description: `${uniqueLeads.length} leads uploaded.${duplicateMessage}`,
      });

      setShowPreview(false);
      setPreviewData(null);
      onUploadComplete(csvCategory);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unmappedCount = previewData?.mappedHeaders.filter(h => !h.mapped).length || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>Upload a CSV file or manually enter a lead</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">
                <UserPlus className="mr-2 h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="csv">
                <Upload className="mr-2 h-4 w-4" />
                CSV Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Company Domain (optional)</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      placeholder="e.g. acmecorp.com"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_line_address">First Line Address</Label>
                    <Input
                      id="first_line_address"
                      value={formData.first_line_address}
                      onChange={(e) => setFormData({ ...formData, first_line_address: e.target.value })}
                      placeholder="e.g. 123 Main St"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dma">DMA</Label>
                    <Input
                      id="dma"
                      value={formData.dma}
                      onChange={(e) => setFormData({ ...formData, dma: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">Zipcode</Label>
                    <Input
                      id="zipcode"
                      value={formData.zipcode}
                      onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mics_sector">MICS Sector</Label>
                    <Input
                      id="mics_sector"
                      value={formData.mics_sector}
                      onChange={(e) => setFormData({ ...formData, mics_sector: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mics_subsector">MICS Subsector</Label>
                    <Input
                      id="mics_subsector"
                      value={formData.mics_subsector}
                      onChange={(e) => setFormData({ ...formData, mics_subsector: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mics_segment">MICS Segment</Label>
                    <Input
                      id="mics_segment"
                      value={formData.mics_segment}
                      onChange={(e) => setFormData({ ...formData, mics_segment: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Vehicle-specific fields - only show for Vehicles category */}
                {formData.category === "Vehicles" && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium mb-4">Vehicle Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vehicles Count</Label>
                        <Select
                          value={formData.vehicles_count}
                          onValueChange={(value) => setFormData({ ...formData, vehicles_count: value })}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select count" />
                          </SelectTrigger>
                          <SelectContent>
                            {VEHICLES_COUNT_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm Vehicles +50</Label>
                        <Select
                          value={formData.confirm_vehicles_50_plus}
                          onValueChange={(value) => setFormData({ ...formData, confirm_vehicles_50_plus: value })}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONFIRM_VEHICLES_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-3">
                        <Label>Truck Types</Label>
                        <div className="space-y-2">
                          {TRUCK_TYPE_OPTIONS.map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`truck-${type}`}
                                checked={selectedTruckTypes.includes(type)}
                                onChange={(e) => handleTruckTypeChange(type, e.target.checked)}
                                disabled={loading}
                                className="h-4 w-4 rounded-none border-primary text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`truck-${type}`} className="text-sm font-normal cursor-pointer">
                                {type}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Features</Label>
                        <div className="space-y-2">
                          {FEATURES_OPTIONS.map((feature) => (
                            <div key={feature} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`feature-${feature}`}
                                checked={selectedFeatures.includes(feature)}
                                onChange={(e) => handleFeatureChange(feature, e.target.checked)}
                                disabled={loading}
                                className="h-4 w-4 rounded-none border-primary text-primary focus:ring-primary"
                              />
                              <Label htmlFor={`feature-${feature}`} className="text-sm font-normal cursor-pointer">
                                {feature}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  Add Lead
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={csvCategory}
                    onValueChange={setCsvCategory}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category for all leads" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">
                      Click to upload CSV file
                    </span>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={loading}
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">
                    CSV columns: full_name, phone, email, company, city, state, dma, zipcode, mics_sector, mics_subsector, mics_segment, vehicles_count, confirm_vehicles_+50, truck, features
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* CSV Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              CSV Preview
            </DialogTitle>
            <DialogDescription>
              Review how your CSV columns are mapped before importing
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Column Mapping Summary */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Column Mapping</h4>
                <div className="flex flex-wrap gap-2">
                  {previewData.mappedHeaders.map((header, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        header.mapped
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {header.mapped ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span className="font-mono">{header.original}</span>
                      {header.mapped && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span>{header.label}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {unmappedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{unmappedCount} column(s) will be ignored (not recognized)</span>
                  </div>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="flex-1 overflow-hidden border rounded-lg">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        {previewData.mappedHeaders.map((header, idx) => (
                          <TableHead
                            key={idx}
                            className={header.mapped ? "" : "text-muted-foreground line-through"}
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-xs">{header.original}</span>
                              {header.mapped && (
                                <span className="text-[10px] text-muted-foreground">
                                  → {header.label}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.slice(0, 10).map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className="text-center text-muted-foreground text-xs">
                            {rowIdx + 1}
                          </TableCell>
                          {row.map((cell, cellIdx) => (
                            <TableCell
                              key={cellIdx}
                              className={`text-xs ${
                                !previewData.mappedHeaders[cellIdx]?.mapped
                                  ? "text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {cell || <span className="text-muted-foreground italic">empty</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {previewData.rows.length > 10 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
                    Showing first 10 of {previewData.rows.length} rows
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    {previewData.rows.length} leads
                  </Badge>
                  <Badge variant="outline">
                    Category: {csvCategory}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setPreviewData(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={loading}>
              {loading ? "Uploading..." : `Import ${previewData?.rows.length || 0} Leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadUpload;
