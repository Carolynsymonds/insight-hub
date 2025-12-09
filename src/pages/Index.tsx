import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadUpload from "@/components/LeadUpload";
import LeadsTable from "@/components/LeadsTable";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShoppingCart, Globe, TrendingUp, CreditCard, Settings, DollarSign, Zap, Building2, Car, Shield, Download } from "lucide-react";
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
  icon: Settings
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
  const [domainFilter, setDomainFilter] = useState<'all' | 'valid' | 'invalid'>('all');
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
  const categoryFilteredLeads = selectedCategory ? leads.filter(lead => lead.category === selectedCategory) : leads;
  const filteredLeads = categoryFilteredLeads.filter((lead) => {
    if (domainFilter === 'all') return true;
    if (domainFilter === 'valid') return lead.match_score !== null && lead.match_score >= 50;
    if (domainFilter === 'invalid') return lead.match_score === null || lead.match_score < 50;
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
                  <Select value={domainFilter} onValueChange={(value: 'all' | 'valid' | 'invalid') => setDomainFilter(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Domain Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Domains</SelectItem>
                      <SelectItem value="valid">Valid (≥50% Match)</SelectItem>
                      <SelectItem value="invalid">Invalid (&lt;50% Match)</SelectItem>
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
            <LeadsTable leads={categoryFilteredLeads} onEnrichComplete={fetchLeads} hideFilterBar domainFilter={domainFilter} onDomainFilterChange={setDomainFilter} />
          </div> : <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Select a Category</h2>
              <p className="text-muted-foreground">Choose a category to view and manage leads</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {CATEGORIES.map(category => {
          const Icon = category.icon;
          const count = categoryCounts[category.name] || 0;
          return <Button key={category.name} variant="outline" className="h-auto py-6 flex flex-col gap-3 hover:bg-accent hover:border-primary transition-all" onClick={() => handleCategorySelect(category.name)}>
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-muted-foreground">{count} leads</span>
                  </Button>;
        })}
            </div>
          </div> : <LeadUpload onUploadComplete={handleUploadComplete} />}
    </DashboardLayout>;
};
export default Index;