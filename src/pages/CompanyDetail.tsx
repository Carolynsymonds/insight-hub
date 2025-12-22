import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Globe, Building2, Users, DollarSign, FileText } from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  company: string | null;
  domain: string | null;
  company_industry: string | null;
  size: string | null;
  annual_revenue: string | null;
  description: string | null;
  logo_url: string | null;
}

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, company, domain, company_industry, size, annual_revenue, description, logo_url")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching lead:", error);
      } else {
        setLead(data);
      }
      setLoading(false);
    };

    fetchLead();
  }, [id]);

  const handleViewChange = (view: string) => {
    navigate(`/?view=${view}`);
  };

  if (loading) {
    return (
      <DashboardLayout activeView="home" onViewChange={handleViewChange}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout activeView="home" onViewChange={handleViewChange}>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Company not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const details = [
    { icon: Globe, label: "Domain", value: lead.domain },
    { icon: Building2, label: "Industry", value: lead.company_industry },
    { icon: Users, label: "Size", value: lead.size },
    { icon: DollarSign, label: "Annual Revenue", value: lead.annual_revenue },
  ];

  return (
    <DashboardLayout activeView="home" onViewChange={handleViewChange}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Button>
        
        <div className="flex items-center gap-4">
          {lead.logo_url && (
            <img 
              src={lead.logo_url} 
              alt={lead.company || lead.full_name} 
              className="h-16 w-16 rounded-lg object-contain bg-muted p-2"
            />
          )}
          <h1 className="text-3xl font-bold">{lead.company || lead.full_name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {details.map((detail) => (
            <Card key={detail.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {detail.label}
                </CardTitle>
                <detail.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {detail.value || <span className="text-muted-foreground">—</span>}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {lead.description && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{lead.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanyDetail;
