import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadUpload from "@/components/LeadUpload";
import LeadsTable from "@/components/LeadsTable";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShoppingCart, Globe, TrendingUp, CreditCard, Settings as SettingsIcon, DollarSign, Zap, Building2, Car, Shield, Download, Settings2 } from "lucide-react";
import { CategoryRolesDialog } from "@/components/CategoryRolesDialog";

const CATEGORIES = [{
  name: "Marketing",
  icon: TrendingUp
}, {
  name: "Ecommerce",
  icon: ShoppingCart
}, {
  name: "Website",
  icon: Globe
}, {
  name: "Sales",
  icon: Briefcase
}, {
  name: "Taking Payments",
  icon: CreditCard
}, {
  name: "Operations",
  icon: SettingsIcon
}, {
  name: "Finance",
  icon: DollarSign
}, {
  name: "Utilities",
  icon: Zap
}, {
  name: "Offices",
  icon: Building2
}, {
  name: "Vehicles",
  icon: Car
}, {
  name: "Security",
  icon: Shield
}] as const;
export type ViewMode = 'all' | 'company' | 'contact';

const Index = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [domainFilter, setDomainFilter] = useState<'all' | 'valid' | 'invalid' | 'not_enriched'>('valid');
  const [batchFilter, setBatchFilter] = useState<'all' | number>('all');
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [rolesDialogCategory, setRolesDialogCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>('company');
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchLeads();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  };
  const fetchLeads = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("leads").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setLeads(data || []);

      // Calculate category counts
      const counts: Record<string, number> = {};
      CATEGORIES.forEach(cat => counts[cat.name] = 0);
      (data || []).forEach((lead: any) => {
        if (lead.category && counts[lead.category] !== undefined) {
          counts[lead.category]++;
        }
      });
      setCategoryCounts(counts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleUploadComplete = () => {
    fetchLeads();
    setActiveView("home");
  };
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };
  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleOpenRolesDialog = (e: React.MouseEvent, categoryName: string) => {
    e.stopPropagation();
    setRolesDialogCategory(categoryName);
    setRolesDialogOpen(true);
  };
  const categoryFilteredLeads = selectedCategory ? leads.filter(lead => lead.category === selectedCategory) : leads;
  
  // Get unique batches from category leads
  const uniqueBatches = [...new Set(
    categoryFilteredLeads
      .filter(lead => lead.upload_batch !== null)
      .map(lead => lead.upload_batch as number)
  )].sort((a, b) => a - b);

  const filteredLeads = categoryFilteredLeads.filter((lead) => {
    // Batch filter
    if (batchFilter !== 'all' && lead.upload_batch !== batchFilter) return false;
    
    // Domain filter
    if (domainFilter === 'all') return true;
    if (domainFilter === 'valid') return lead.match_score !== null && lead.match_score >= 50;
    if (domainFilter === 'invalid') return lead.match_score === null || lead.match_score < 50;
    if (domainFilter === 'not_enriched') return lead.enriched_at === null;
    return true;
  });

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      toast({
        title: "No leads to export",
        description: "There are no leads matching the current filter.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Full Name", "Email", "Phone", "Company", "City", "State", "Domain", "Match Score", "Category"];
    const csvContent = [
      headers.join(","),
      ...filteredLeads.map((lead) => [
        `"${lead.full_name || ''}"`,
        `"${lead.email_address || ''}"`,
        `"${lead.phone_number || ''}"`,
        `"${lead.company || ''}"`,
        `"${lead.city || ''}"`,
        `"${lead.state || ''}"`,
        `"${lead.domain || ''}"`,
        lead.match_score !== null ? lead.match_score : '',
        `"${lead.category || ''}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedCategory || 'leads'}_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Export successful",
      description: `Exported ${filteredLeads.length} leads to CSV.`,
    });
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  return <DashboardLayout activeView={activeView} onViewChange={setActiveView}>
      {activeView === "home" ? selectedCategory ? <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold">{selectedCategory}</h2>
                <span className="text-muted-foreground">({filteredLeads.length} leads)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filter by:</span>
                  <Select value={domainFilter} onValueChange={(value: 'all' | 'valid' | 'invalid' | 'not_enriched') => setDomainFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Domain Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Domains</SelectItem>
                      <SelectItem value="valid">Valid (≥50% Match)</SelectItem>
                      <SelectItem value="invalid">Invalid (&lt;50% Match)</SelectItem>
                      <SelectItem value="not_enriched">Not Enriched</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={batchFilter === 'all' ? 'all' : String(batchFilter)} 
                    onValueChange={(value) => setBatchFilter(value === 'all' ? 'all' : Number(value))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {uniqueBatches.map((batch) => (
                        <SelectItem key={batch} value={String(batch)}>
                          Batch {batch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredLeads.length} of {categoryFilteredLeads.length} leads
                </span>
              </div>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'company' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0"
                  onClick={() => setViewMode('company')}
                >
                  Company
                </Button>
                <Button
                  variant={viewMode === 'contact' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0 border-x"
                  onClick={() => setViewMode('contact')}
                >
                  Contact
                </Button>
                <Button
                  variant={viewMode === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0"
                  onClick={() => setViewMode('all')}
                >
                  View All
                </Button>
              </div>
            </div>
            <LeadsTable leads={filteredLeads} onEnrichComplete={fetchLeads} hideFilterBar domainFilter={domainFilter} onDomainFilterChange={setDomainFilter} viewMode={viewMode} />
          </div> : <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Select a Category</h2>
              <p className="text-muted-foreground">Choose a category to view and manage leads</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {CATEGORIES.map(category => {
          const Icon = category.icon;
          const count = categoryCounts[category.name] || 0;
          return <div key={category.name} className="relative group">
                    <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 hover:bg-accent hover:border-primary transition-all" onClick={() => handleCategorySelect(category.name)}>
                      <Icon className="h-8 w-8 text-primary" />
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm text-muted-foreground">{count} leads</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleOpenRolesDialog(e, category.name)}
                    >
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>;
        })}
            </div>
          </div> : <LeadUpload onUploadComplete={handleUploadComplete} />}

      <CategoryRolesDialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        category={rolesDialogCategory}
      />
    </DashboardLayout>;
};
export default Index;