import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Phone, Layers, ShieldCheck, BookOpen, User, ArrowLeft, Facebook, Instagram, CheckCircle } from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  company: string | null;
  domain: string | null;
  company_industry: string | null;
  size: string | null;
  annual_revenue: string | null;
  description: string | null;
  short_summary: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  founded_date: string | null;
  enrichment_confidence: number | null;
  facebook: string | null;
  facebook_confidence: number | null;
  instagram: string | null;
  instagram_confidence: number | null;
  contact_details: {
    location?: string;
    phone?: string;
    latest_experience?: string;
    title?: string;
    company?: string;
  } | null;
}

function Field({ label, value, underline = false }: { label: string; value: string | React.ReactNode | null; underline?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div
        className={`text-sm font-medium ${underline ? "underline underline-offset-4" : ""}`}
      >
        {value || <span className="text-neutral-400">—</span>}
      </div>
    </div>
  );
}

type TabType = "Summary" | "News" | "Socials" | "Training";

function Tabs({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }) {
  const tabs = [
    { label: "Summary" as TabType, icon: User },
    { label: "News" as TabType, icon: Layers, badge: 9 },
    { label: "Socials" as TabType, icon: ShieldCheck, badge: "7 left" },
  ];

  return (
    <div className="flex items-center gap-8">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.label;
        return (
          <button
            key={tab.label}
            onClick={() => onTabChange(tab.label)}
            className={`relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-[#0F0F4B]"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}

          

            {isActive && (
              <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-[#0F0F4B]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function SummaryTabContent({ lead }: { lead: Lead }) {
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-semibold text-[#0F0F4B]">Short Summary</h3>
      {lead.short_summary ? (
        <div 
          className="text-base text-[#0F0F4B] leading-relaxed [&_a]:text-[#0F0F4B] [&_a]:hover:underline [&_strong]:font-bold [&_br]:block [&_br]:mt-4"
          dangerouslySetInnerHTML={{ __html: lead.short_summary }}
        />
      ) : (
        <p className="text-base text-[#0F0F4B] leading-relaxed">
          {lead.description || <span className="text-neutral-400">No summary available</span>}
        </p>
      )}
    </div>
  );
}

function CompanyProfileCard({ lead }: { lead: Lead }) {
  const [activeTab, setActiveTab] = useState<TabType>("Summary");

  // Calculate company age from founded_date if available
  const getCompanyAge = () => {
    if (!lead.founded_date) return null;
    try {
      const founded = new Date(lead.founded_date);
      const now = new Date();
      const years = now.getFullYear() - founded.getFullYear();
      return years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : null;
    } catch {
      return null;
    }
  };


  // Format location
  const getLocation = () => {
    if (lead.city && lead.state) {
      return `${lead.city}, ${lead.state}`;
    }
    if (lead.city) return lead.city;
    if (lead.state) return lead.state;
    if (lead.contact_details?.location) return lead.contact_details.location;
    return null;
  };

  // Get job title from contact_details or use a default
  const getJobTitle = () => {
    return lead.contact_details?.title || null;
  };

  return (
    <div className="w-full max-w-5xl rounded-xl border border-neutral-200 bg-neutral-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{lead.company || lead.full_name || "Company"}</h2>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-y-6 gap-x-8 md:grid-cols-4">
        <Field label="Email" value={lead.email} />
        <Field label="Job Title" value={getJobTitle()} />
        <Field label="Company" value={lead.company || lead.full_name} underline />
        <Field label="Location" value={getLocation()} />

        <Field
          label="Phone"
          value={
            lead.phone || lead.contact_details?.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-500" />
                {lead.phone || lead.contact_details?.phone}
              </div>
            ) : null
          }
        />

        <Field label="Industry" value={lead.company_industry} />
        <Field label="Company Rev" value={lead.annual_revenue} />
        <Field label="Company Size" value={lead.size} />
        <Field label="Age of Company" value={getCompanyAge()} />
      </div>

      {/* Tabs (rendered once, under the whole component) */}
      <div className="mt-8 border-t border-neutral-200 pt-4">
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "Summary" && <SummaryTabContent lead={lead} />}
        {activeTab === "News" && (
          <div className="text-sm text-neutral-500">News content coming soon...</div>
        )}
        {activeTab === "Socials" && (
          <div className="text-sm text-neutral-500">Socials content coming soon...</div>
        )}
        {activeTab === "Training" && (
          <div className="text-sm text-neutral-500">Training content coming soon...</div>
        )}
      </div>
    </div>
  );
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
        .select("id, full_name, company, domain, company_industry, size, annual_revenue, description, short_summary, logo_url, city, state, phone, email, founded_date, enrichment_confidence, facebook, facebook_confidence, instagram, instagram_confidence, contact_details")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching lead:", error);
      } else if (data) {
        setLead({
          ...data,
          contact_details: data.contact_details as Lead['contact_details'],
          enrichment_confidence: data.enrichment_confidence ?? null,
          facebook: data.facebook ?? null,
          facebook_confidence: data.facebook_confidence ?? null,
          instagram: data.instagram ?? null,
          instagram_confidence: data.instagram_confidence ?? null,
        });
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

  return (
    <DashboardLayout activeView="home" onViewChange={handleViewChange}>
      <div className="min-h-screen bg-white p-10">
        <CompanyProfileCard lead={lead} />
      </div>
    </DashboardLayout>
  );
};

export default CompanyDetail;
