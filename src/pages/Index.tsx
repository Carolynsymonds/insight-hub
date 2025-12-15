import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadUpload from "@/components/LeadUpload";
import LeadsTable from "@/components/LeadsTable";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShoppingCart, Globe, TrendingUp, CreditCard, Settings as SettingsIcon, DollarSign, Zap, Building2, Car, Shield, Download, Settings2, Search, Loader2, Target } from "lucide-react";
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
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentCompany: '' });
  const [bulkScoring, setBulkScoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState({ current: 0, total: 0, currentCompany: '' });
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    notEnriched: 0,
    diagnosisCounts: {} as Record<string, number>
  });
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
      } = await supabase.from("leads").select("*")
        .order("upload_batch", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true });
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

      // Calculate statistics
      const valid = (data || []).filter(lead => 
        lead.enrichment_confidence !== null && lead.enrichment_confidence >= 50
      ).length;
      const invalid = (data || []).filter(lead => 
        lead.enrichment_confidence !== null && lead.enrichment_confidence < 50
      ).length;
      const notEnriched = (data || []).filter(lead => 
        lead.enrichment_confidence === null && !lead.domain
      ).length;

      // Count diagnosis categories for invalid/not enriched leads
      const diagnosisCounts: Record<string, number> = {};
      (data || []).filter(lead => 
        lead.enrichment_confidence === null || lead.enrichment_confidence < 50
      ).forEach(lead => {
        const category = lead.diagnosis_category || 'Not diagnosed';
        diagnosisCounts[category] = (diagnosisCounts[category] || 0) + 1;
      });

      setStats({ total: (data || []).length, valid, invalid, notEnriched, diagnosisCounts });
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

  const handleBulkFindDomains = async () => {
    const leadsToEnrich = filteredLeads.filter(lead => !lead.domain && lead.company);
    
    if (leadsToEnrich.length === 0) {
      toast({
        title: "No leads to enrich",
        description: "All displayed leads already have domains or no company name.",
      });
      return;
    }

    setBulkEnriching(true);
    setBulkProgress({ current: 0, total: leadsToEnrich.length, currentCompany: '' });

    try {
      for (let i = 0; i < leadsToEnrich.length; i++) {
        const lead = leadsToEnrich[i];
        setBulkProgress({ current: i + 1, total: leadsToEnrich.length, currentCompany: lead.company || '' });

        // Run all 3 sources sequentially
        await supabase.functions.invoke("enrich-lead", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
            mics_sector: lead.mics_sector,
            email: lead.email,
            source: "apollo"
          }
        });

        await supabase.functions.invoke("enrich-lead", {
          body: {
            leadId: lead.id,
            company: lead.company,
            city: lead.city,
            state: lead.state,
            mics_sector: lead.mics_sector,
            email: lead.email,
            source: "google"
          }
        });

        if (lead.email) {
          await supabase.functions.invoke("enrich-lead", {
            body: {
              leadId: lead.id,
              company: lead.company,
              city: lead.city,
              state: lead.state,
              mics_sector: lead.mics_sector,
              email: lead.email,
              source: "email"
            }
          });
        }

        // Check if domain found, validate it or run diagnosis
        const { data: updated } = await supabase.from("leads").select("domain, enrichment_logs").eq("id", lead.id).maybeSingle();
        if (updated?.domain) {
          // Validate the found domain
          const { data: validationResult } = await supabase.functions.invoke("validate-domain", {
            body: { domain: updated.domain }
          });
          
          if (validationResult) {
            await supabase.from("leads")
              .update({ email_domain_validated: validationResult.is_valid_domain })
              .eq("id", lead.id);
          }
        } else {
          // No domain found, run diagnosis
          await supabase.functions.invoke("diagnose-enrichment", {
            body: {
              leadId: lead.id,
              leadData: lead,
              enrichmentLogs: updated?.enrichment_logs || []
            }
          });
        }
      }

      toast({
        title: "Bulk enrichment complete",
        description: `Processed ${leadsToEnrich.length} leads.`,
      });
    } catch (error: any) {
      toast({
        title: "Error during bulk enrichment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkEnriching(false);
      setBulkProgress({ current: 0, total: 0, currentCompany: '' });
      fetchLeads();
    }
  };

  const handleBulkCalculateMatchScore = async () => {
    const leadsToScore = filteredLeads.filter(lead => lead.domain && lead.match_score === null);
    
    if (leadsToScore.length === 0) {
      toast({
        title: "No leads to score",
        description: "All displayed leads with domains already have match scores.",
      });
      return;
    }

    setBulkScoring(true);
    setScoreProgress({ current: 0, total: leadsToScore.length, currentCompany: '' });

    try {
      for (let i = 0; i < leadsToScore.length; i++) {
        const lead = leadsToScore[i];
        setScoreProgress({ current: i + 1, total: leadsToScore.length, currentCompany: lead.company || '' });

        // Step 1: Find coordinates
        await supabase.functions.invoke("find-company-coordinates", {
          body: {
            leadId: lead.id,
            domain: lead.domain,
            sourceUrl: lead.source_url
          }
        });

        // Step 2: Calculate distance (need to refetch lead to get coordinates)
        const { data: leadWithCoords } = await supabase.from("leads").select("latitude, longitude").eq("id", lead.id).maybeSingle();
        
        if (leadWithCoords && leadWithCoords.latitude && leadWithCoords.longitude) {
          await supabase.functions.invoke("calculate-distance", {
            body: {
              leadId: lead.id,
              city: lead.city,
              state: lead.state,
              zipcode: lead.zipcode,
              latitude: Number(leadWithCoords.latitude),
              longitude: Number(leadWithCoords.longitude)
            }
          });
        } else {
          console.log(`Skipping distance calculation for ${lead.company} - no coordinates found`);
        }

        // Step 3: Score domain relevance
        await supabase.functions.invoke("score-domain-relevance", {
          body: {
            leadId: lead.id,
            companyName: lead.company,
            domain: lead.domain,
            city: lead.city,
            state: lead.state,
            dma: lead.dma
          }
        });

        // Step 4: Calculate final match score
        await supabase.functions.invoke("calculate-match-score", {
          body: { leadId: lead.id }
        });
      }

      toast({
        title: "Match scoring complete",
        description: `Processed ${leadsToScore.length} leads.`,
      });
    } catch (error: any) {
      toast({
        title: "Error during scoring",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBulkScoring(false);
      setScoreProgress({ current: 0, total: 0, currentCompany: '' });
      fetchLeads();
    }
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

    const headers = ["Full Name", "Email", "Phone", "Company", "City", "State", "Domain", "Match Score", "Category", "Socials Found", "Diagnosis Category", "Diagnosis Explanation", "Diagnosis Recommendation"];
    const csvContent = [
      headers.join(","),
      ...filteredLeads.map((lead) => {
        const showSocials = lead.enrichment_confidence === null || lead.enrichment_confidence < 50;
        const socialsFound = showSocials ? [
          lead.facebook ? 'Facebook' : '',
          lead.linkedin ? 'LinkedIn' : '',
          lead.instagram ? 'Instagram' : ''
        ].filter(Boolean).join(', ') : '';
        
        return [
          `"${lead.full_name || ''}"`,
          `"${lead.email_address || ''}"`,
          `"${lead.phone_number || ''}"`,
          `"${lead.company || ''}"`,
          `"${lead.city || ''}"`,
          `"${lead.state || ''}"`,
          `"${lead.domain || ''}"`,
          lead.match_score !== null ? lead.match_score : '',
          `"${lead.category || ''}"`,
          `"${socialsFound}"`,
          `"${!lead.domain ? (lead.diagnosis_category || '') : ''}"`,
          `"${!lead.domain ? (lead.diagnosis_explanation || '').replace(/"/g, '""') : ''}"`,
          `"${!lead.domain ? (lead.diagnosis_recommendation || '').replace(/"/g, '""') : ''}"`,
        ].join(",");
      })
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
      {activeView === "statistics" ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Lead Statistics</h2>
            <p className="text-muted-foreground">Overview of your lead enrichment status</p>
          </div>
          
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400">Valid Domains</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.valid}</p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">≥50% confidence</p>
            </div>
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">Invalid Domains</p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.invalid}</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">&lt;50% confidence</p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Not Enriched</p>
              <p className="text-3xl font-bold">{stats.notEnriched}</p>
              <p className="text-xs text-muted-foreground">Awaiting enrichment</p>
            </div>
          </div>

          {/* Diagnosis Breakdown */}
          {(stats.invalid + stats.notEnriched) > 0 && (
            <div className="p-6 border rounded-lg">
              <h3 className="font-medium mb-4">Invalid/Not Enriched Breakdown by Diagnosis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(stats.diagnosisCounts)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border">
                      <span className="text-sm">{category}</span>
                      <span className="font-semibold text-lg">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="p-6 border rounded-lg">
            <h3 className="font-medium mb-4">Leads by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {CATEGORIES.map(category => {
                const Icon = category.icon;
                return (
                  <div key={category.name} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="font-semibold">{categoryCounts[category.name] || 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeView === "home" ? selectedCategory ? <div className="space-y-4">
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
            <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkFindDomains}
                  disabled={bulkEnriching || bulkScoring || filteredLeads.length === 0}
                  className="gap-2"
                >
                  {bulkEnriching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finding... ({bulkProgress.current}/{bulkProgress.total})
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Find Domains
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkCalculateMatchScore}
                  disabled={bulkScoring || bulkEnriching || filteredLeads.length === 0}
                  className="gap-2"
                >
                  {bulkScoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scoring... ({scoreProgress.current}/{scoreProgress.total})
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4" />
                      Calculate Match Score
                    </>
                  )}
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