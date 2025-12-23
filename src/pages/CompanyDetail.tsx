import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { ChevronUp, ChevronDown } from "lucide-react";

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
  long_summary: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  founded_date: string | null;
  linkedin: string | null;
  facebook: string | null;
  instagram: string | null;
  contact_linkedin: string | null;
  contact_facebook: string | null;
  contact_instagram: string | null;
  contact_youtube: string | null;
  news: string | null;
  company_contacts: Array<{
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    email?: string | null;
    email_status?: string | null;
    linkedin_url?: string;
    facebook_url?: string;
    twitter_url?: string;
    github_url?: string;
    youtube_url?: string;
    source: string;
    is_personal?: boolean;
    found_without_role_filter?: boolean;
  }> | null;
  contact_details: {
    location?: string;
    phone?: string;
    latest_experience?: string;
    title?: string;
    company?: string;
  } | null;
}

export default function PatientOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyInsightsOpen, setKeyInsightsOpen] = useState(false);
  const [productsServicesOpen, setProductsServicesOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, company, domain, company_industry, size, annual_revenue, description, short_summary, long_summary, logo_url, city, state, phone, email, founded_date, linkedin, facebook, instagram, contact_linkedin, contact_facebook, contact_youtube, news, company_contacts, contact_details")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching lead:", error);
      } else if (data) {
        setLead({
          ...data,
          contact_details: data.contact_details as Lead['contact_details'],
          company_contacts: data.company_contacts as Lead['company_contacts'],
          contact_instagram: null, // Will be available once column is added to database
        });
      }
      setLoading(false);
    };

    fetchLead();
  }, [id]);

  const handleViewChange = (view: string) => {
    navigate(`/?view=${view}`);
  };

  // Helper functions
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getCompanyAge = () => {
    if (!lead?.founded_date) return null;
    try {
      const founded = new Date(lead.founded_date);
      const now = new Date();
      const years = now.getFullYear() - founded.getFullYear();
      return years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : null;
    } catch {
      return null;
    }
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      // US format: (123) 456-7890
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      // US with country code: +1 (123) 456-7890
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length > 10) {
      // International format: keep as is or format differently
      return phone; // Return original if it doesn't match standard formats
    }
    
    // If it doesn't match standard formats, return original
    return phone;
  };

  const formatDomain = (domain: string | null) => {
    if (!domain) return null;
    return domain.startsWith('http') ? domain : `www.${domain}`;
  };

  const getLocation = () => {
    // Try contact_details.location first
    if (lead?.contact_details?.location) {
      return lead.contact_details.location;
    }
    // Then try city and state
    if (lead?.city && lead?.state) {
      return `${lead.city}, ${lead.state}`;
    }
    if (lead?.city) return lead.city;
    if (lead?.state) return lead.state;
    return null;
  };

  const formatSocialUrl = (url: string | null, platform: 'facebook' | 'linkedin' | 'instagram' | 'youtube') => {
    if (!url) return null;
    
    let path = '';
    
    // If it's already a full URL, extract just the path
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        path = urlObj.pathname;
      } catch {
        // If URL parsing fails, try to extract path manually
        const match = url.match(/https?:\/\/[^\/]+(\/.*)/);
        if (match && match[1]) {
          path = match[1];
        } else {
          path = url;
        }
      }
    } else {
      // Handle paths starting with /
      if (url.startsWith('/')) {
        path = url;
      } else {
        // Add leading slash if not present
        path = `/${url}`;
      }
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    
    return path;
  };

  const getSocialFullUrl = (url: string | null, platform: 'facebook' | 'linkedin' | 'instagram' | 'youtube') => {
    if (!url) return null;
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Build full URL from path
    const cleanPath = url.startsWith('/') ? url.replace(/^\/+/, '') : url;
    switch (platform) {
      case 'facebook':
        return `https://facebook.com/${cleanPath}`;
      case 'linkedin':
        return `https://linkedin.com/${cleanPath}`;
      case 'instagram':
        return `https://instagram.com/${cleanPath}`;
      case 'youtube':
        return `https://youtube.com/${cleanPath}`;
    }
    
    return url;
  };

  const parseNews = () => {
    if (!lead?.news) return [];
    
    try {
      // Handle if news is already an object (not a string)
      let parsed = typeof lead.news === 'string' ? JSON.parse(lead.news) : lead.news;
      
      // News data structure from get-company-news stores as: { items: [...], news_count: number, ... }
      // Check for 'items' property first (this is what get-company-news uses)
      if (parsed && parsed.items && Array.isArray(parsed.items)) {
        return parsed.items;
      }
      // Also check for 'news_results' property (alternative structure)
      if (parsed && parsed.news_results && Array.isArray(parsed.news_results)) {
        return parsed.news_results;
      }
      // Fallback: if it's already an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.error("Error parsing news:", error);
      return [];
    }
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
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Company not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeView="home" onViewChange={handleViewChange}>
      <div>
        <div className="mx-auto max-w-7xl mb-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4 mb-6">
            <div className="text-left">
              <h1 className="text-xl font-semibold">{lead.company || "—"}</h1>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold">{lead.full_name || "—"}</h1>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-semibold">{formatPhoneNumber(lead.phone || lead.contact_details?.phone) || "—"}</h1>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT PANEL */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
       


          {/* GENERAL INFO */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">General Info</h3>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </div>
            <div className="divide-y text-sm">
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Job Title</span>
                <span className="text-[#0F0F4B]">{lead.contact_details?.title || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Location</span>
                <span className="text-[#0F0F4B]">{getLocation() || "—"}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Website</span>
                {lead.domain ? (
                  <a 
                    href={lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F0F4B] hover:text-blue-600 hover:underline"
                  >
                    {formatDomain(lead.domain)}
                  </a>
                ) : (
                  <span className="text-[#0F0F4B]">—</span>
                )}
              </div>
            </div>
      </div>

          {/* FIRMOGRAPHIC DATA */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Firmographic Data</h3>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </div>
            <div className="divide-y text-sm">
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Industry</span>
                <span className="text-[#0F0F4B]">{lead.company_industry || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Company Revenue</span>
                <span className="text-[#0F0F4B]">{lead.annual_revenue || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Company Size</span>
                <span className="text-[#0F0F4B]">{lead.size || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Age of Company</span>
                <span className="text-[#0F0F4B]">{getCompanyAge() || "—"}</span>
              </div>
            </div>
      </div>

          {/* CONTACT SOCIALS */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Contact Socials</h3>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </div>
            <div className="divide-y text-sm">
              {lead.contact_linkedin && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">LinkedIn</span>
                  <a
                    href={getSocialFullUrl(lead.contact_linkedin, 'linkedin') || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F0F4B] hover:text-blue-600 hover:underline"
                  >
                    {formatSocialUrl(lead.contact_linkedin, 'linkedin')}
                  </a>
                </div>
              )}
              {lead.contact_facebook && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Facebook</span>
                  <a
                    href={getSocialFullUrl(lead.contact_facebook, 'facebook') || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F0F4B] hover:text-blue-600 hover:underline"
                  >
                    {formatSocialUrl(lead.contact_facebook, 'facebook')}
                  </a>
                </div>
              )}
              {lead.contact_instagram && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Instagram</span>
                  <a
                    href={getSocialFullUrl(lead.contact_instagram, 'instagram') || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F0F4B] hover:text-blue-600 hover:underline"
                  >
                    {formatSocialUrl(lead.contact_instagram, 'instagram')}
                  </a>
                </div>
              )}
              {lead.contact_youtube && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">YouTube</span>
                  <a
                    href={getSocialFullUrl(lead.contact_youtube, 'youtube') || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F0F4B] hover:text-blue-600 hover:underline"
                  >
                    {formatSocialUrl(lead.contact_youtube, 'youtube')}
                  </a>
                </div>
              )}
              {!lead.contact_linkedin && !lead.contact_facebook && !lead.contact_instagram && !lead.contact_youtube && (
                <div className="py-2 text-sm text-gray-400">No contact socials available</div>
              )}
            </div>
          </div>
    </div>

        {/* RIGHT PANEL */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-md font-semibold mb-4">Company Summary</h3>
            {lead.short_summary ? (
              <div 
                className="text-sm text-[#0F0F4B] leading-relaxed [&_strong]:font-semibold [&_span]:font-medium mb-6"
                dangerouslySetInnerHTML={{ __html: lead.short_summary }}
              />
            ) : lead.long_summary ? (
              <p className="text-sm text-[#0F0F4B] leading-relaxed mb-6">{lead.long_summary}</p>
            ) : lead.description ? (
              <p className="text-sm text-[#0F0F4B] leading-relaxed mb-6">{lead.description}</p>
            ) : (
              <p className="text-sm text-gray-500 mb-6">No summary available</p>
            )}
            
            {/* Key Insights */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setKeyInsightsOpen(!keyInsightsOpen)}
              >
                <h4 className="text-base font-semibold text-[#0F0F4B]">Key Insights</h4>
                {keyInsightsOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#0F0F4B]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#0F0F4B]" />
                )}
              </div>
              {keyInsightsOpen && (
                <ul className="space-y-2 text-sm text-[#0F0F4B]">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Divine is a small business selling clothing.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>They are located in the Austin, TX DMA.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>The owner, Cheryl Lynne, seems to operate the business, as Divine has a Facebook account under her name.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Divine promotes their products via Instagram on the "dailytribnews" account.</span>
                  </li>
                </ul>
              )}
            </div>
            
            {/* Products & Services */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setProductsServicesOpen(!productsServicesOpen)}
              >
                <h4 className="text-base font-semibold text-[#0F0F4B]">Products & Services</h4>
                {productsServicesOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#0F0F4B]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#0F0F4B]" />
                )}
              </div>
              {productsServicesOpen && (
                <ul className="space-y-2 text-sm text-[#0F0F4B]">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Core Offerings:</strong> Floral arrangements, gifts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Customer Segment:</strong> Local customers in La Junta, CO</span>
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Call Openers */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-md font-semibold mb-4">Call Openers</h3>
            <p className="text-sm text-gray-500">—</p>
          </div>

          {(() => {
            const newsArticles = parseNews();
            
            if (newsArticles.length > 0) {
              return (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div 
                    className="flex items-center justify-between mb-6 cursor-pointer"
                    onClick={() => setNewsOpen(!newsOpen)}
                  >
                    <h3 className="text-md font-semibold text-[#0F0F4B]">Relevant Company News</h3>
                    {newsOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#0F0F4B]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#0F0F4B]" />
                    )}
                  </div>
                  {newsOpen && (
                    <div className="space-y-6">
                      {newsArticles.slice(0, 5).map((article: any, index: number) => (
                        <div key={index} className="border rounded-2xl p-5">
                          <h4 className="font-semibold text-sm mb-1">{article.title || article.headline || "News Article"}</h4>
                          {(article.source || article.date) && (
                            <p className="text-sm text-gray-500 mb-2">
                              {article.source || ""} {article.source && article.date ? "·" : ""} {article.date || ""}
                            </p>
                          )}
                          {article.snippet && (
                            <p className="text-sm mb-3">{article.snippet}</p>
                          )}
                          {article.link && (
                            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium cursor-pointer hover:underline">
                              Read full article ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return null;
          })()}

          {/* Relevant Contacts */}
          {lead.company_contacts && lead.company_contacts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div 
                className="flex items-center justify-between mb-6 cursor-pointer"
                onClick={() => setContactsOpen(!contactsOpen)}
              >
                <h3 className="text-md font-semibold text-[#0F0F4B]">Relevant Contacts</h3>
                {contactsOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#0F0F4B]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#0F0F4B]" />
                )}
              </div>
              {contactsOpen && (
                <div className="space-y-4">
                  {lead.company_contacts.slice(0, 10).map((contact: any, index: number) => {
                    const contactName = contact.name || 
                      (contact.first_name && contact.last_name ? `${contact.first_name} ${contact.last_name}` : 
                      contact.first_name || contact.last_name || "Unknown");
                    
                    return (
                      <div key={index} className="border rounded-2xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1 text-[#0F0F4B]">{contactName}</h4>
                            {contact.title && (
                              <p className="text-sm text-[#0F0F4B] mb-2">{contact.title}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              {contact.email && (
                                <span>{contact.email}</span>
                              )}
                              {contact.linkedin_url && (
                                <a 
                                  href={contact.linkedin_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  LinkedIn
                                </a>
                              )}
                              {contact.source && (
                                <span className="text-gray-400">Source: {contact.source}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
