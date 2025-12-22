import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  company: string | null;
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
        .select("id, full_name, company")
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Company not found</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Leads
      </Button>
      
      <h1 className="text-3xl font-bold">{lead.company || lead.full_name}</h1>
    </div>
  );
};

export default CompanyDetail;
