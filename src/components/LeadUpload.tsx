import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LeadUploadProps {
  onUploadComplete: () => void;
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

const LeadUpload = ({ onUploadComplete, defaultCategory }: LeadUploadProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [csvCategory, setCsvCategory] = useState(defaultCategory || "");
  const [selectedTruckTypes, setSelectedTruckTypes] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
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
      });
      setSelectedTruckTypes([]);
      setSelectedFeatures([]);

      onUploadComplete();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

      const leads = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const lead: any = { user_id: user.id, category: csvCategory };

        headers.forEach((header, index) => {
          const value = values[index];
          if (header === "full_name" || header === "name") lead.full_name = value;
          else if (header === "phone") lead.phone = value;
          else if (header === "email") lead.email = value;
          else if (header === "company") lead.company = value;
          else if (header === "city") lead.city = value;
          else if (header === "state") lead.state = value;
          else if (header === "dma") lead.dma = value;
          else if (header === "zipcode" || header === "zip") lead.zipcode = value;
          else if (header === "mics sector (harmonised)" || header === "mics_sector") lead.mics_sector = value;
          else if (header === "mics subsector (harmonised)" || header === "mics_subsector") lead.mics_subsector = value;
          else if (header === "mics segment (harmonised)" || header === "mics_segment") lead.mics_segment = value;
          else if (header === "vehicles_count" || header === "vehicles count") lead.vehicles_count = value;
          else if (header === "confirm_vehicles_50_plus" || header === "confirm vehicles +50" || header === "confirm_vehicles_+50") lead.confirm_vehicles_50_plus = value;
          else if (header === "truck_types" || header === "truck") lead.truck_types = value;
          else if (header === "features") lead.features = value;
        });

        return lead;
      });

      const { error } = await supabase.from("leads").insert(leads);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${leads.length} leads uploaded successfully.`,
      });

      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Leads</CardTitle>
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

              {/* Vehicle-specific fields */}
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
                          <Checkbox
                            id={`truck-${type}`}
                            checked={selectedTruckTypes.includes(type)}
                            onCheckedChange={(checked) => handleTruckTypeChange(type, checked as boolean)}
                            disabled={loading}
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
                          <Checkbox
                            id={`feature-${feature}`}
                            checked={selectedFeatures.includes(feature)}
                            onCheckedChange={(checked) => handleFeatureChange(feature, checked as boolean)}
                            disabled={loading}
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
                    onChange={handleFileUpload}
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
  );
};

export default LeadUpload;
