import { Badge } from "@/components/ui/badge";
import { Check, Circle, Loader2, Search, AlertCircle, SkipForward, Linkedin, Facebook, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface StepResult {
  status: string;
  message?: string;
  data?: Record<string, any>;
}

interface EnrichmentSteps {
  check_existing: StepResult;
  apollo_search: StepResult;
  google_socials: StepResult;
}

interface EnrichContactStepperProps {
  steps: EnrichmentSteps | null;
  isLoading: boolean;
}

const stepConfig = [
  { key: 'check_existing', label: 'Check Existing', description: 'Look for contact in company contacts' },
  { key: 'apollo_search', label: 'Apollo Search', description: 'Search Apollo People Match API' },
  { key: 'google_socials', label: 'Google Socials', description: 'Search Google for missing social profiles' },
];

const getStepIcon = (status: StepResult['status'], isActive: boolean) => {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'completed':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'not_found':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-muted-foreground" />;
    default:
      return isActive ? (
        <Circle className="h-4 w-4 text-primary" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/40" />
      );
  }
};

const getStatusBadge = (status: StepResult['status']) => {
  switch (status) {
    case 'running':
      return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Running</Badge>;
    case 'completed':
      return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Found</Badge>;
    case 'not_found':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Not Found</Badge>;
    case 'skipped':
      return <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Skipped</Badge>;
    default:
      return <Badge className="bg-muted/50 text-muted-foreground/60 border-border text-[10px]">Pending</Badge>;
  }
};

export function EnrichContactStepper({ steps, isLoading }: EnrichContactStepperProps) {
  if (!steps && !isLoading) return null;

  // Generate mock pending state when loading
  const displaySteps: EnrichmentSteps = steps || {
    check_existing: { status: 'running', message: 'Checking existing contacts...' },
    apollo_search: { status: 'pending' },
    google_socials: { status: 'pending' }
  };

  return (
    <div className="space-y-3 mt-3">
      <p className="text-xs font-medium text-muted-foreground">Enrichment Progress</p>
      
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-[2px] bg-border" />
        
        <div className="space-y-3">
          {stepConfig.map((config, index) => {
            const stepData = displaySteps[config.key as keyof EnrichmentSteps];
            const isActive = stepData.status === 'running';
            const isComplete = stepData.status === 'completed' || stepData.status === 'not_found';
            
            return (
              <div key={config.key} className="relative">
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  isActive ? "bg-primary/5 border-primary/20" : 
                  isComplete ? "bg-muted/30 border-border" : 
                  "bg-background border-border"
                )}>
                  {/* Step number with icon */}
                  <div className={cn(
                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border-2 bg-background z-10",
                    stepData.status === 'running' ? "border-primary" :
                    stepData.status === 'completed' ? "border-green-500 bg-green-50" :
                    stepData.status === 'not_found' ? "border-amber-400 bg-amber-50" :
                    stepData.status === 'skipped' ? "border-muted-foreground/30 bg-muted/50" :
                    "border-muted-foreground/30"
                  )}>
                    {getStepIcon(stepData.status, isActive)}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">Step {index + 1}: {config.label}</span>
                      {getStatusBadge(stepData.status)}
                    </div>
                    
                    <p className="text-[11px] text-muted-foreground">
                      {stepData.message || config.description}
                    </p>
                    
                    {/* Step data details */}
                    {stepData.data && stepData.status !== 'pending' && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-[10px] space-y-1.5">
                        {/* Check Existing step data - enhanced */}
                        {config.key === 'check_existing' && (
                          <div className="space-y-1.5">
                            {stepData.data.lead_name && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span className="text-muted-foreground">Lead:</span>
                                <span>{stepData.data.lead_name}</span>
                                <span className="text-muted-foreground">Existing contacts:</span>
                                <span>{stepData.data.existing_contacts_count || 0}</span>
                              </div>
                            )}
                            {stepData.data.matching_contacts_count !== undefined && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span className="text-muted-foreground">Matching contacts:</span>
                                <span className="font-medium">{stepData.data.matching_contacts_count}</span>
                                {stepData.data.name && (
                                  <>
                                    <span className="text-muted-foreground">Name:</span>
                                    <span>{stepData.data.name}</span>
                                  </>
                                )}
                                {stepData.data.email && (
                                  <>
                                    <span className="text-muted-foreground">Email:</span>
                                    <span>{stepData.data.email}</span>
                                  </>
                                )}
                                {stepData.data.source && (
                                  <>
                                    <span className="text-muted-foreground">Source:</span>
                                    <span>{stepData.data.source}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Merged socials from existing contacts */}
                            {(stepData.data.has_linkedin !== undefined || stepData.data.has_facebook !== undefined) && (
                              <div className="pt-1 border-t border-border/50">
                                <span className="text-muted-foreground block mb-1">Merged socials from existing contacts:</span>
                                <div className="flex gap-1 flex-wrap">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.has_linkedin 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    LinkedIn {stepData.data.has_linkedin ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.has_facebook 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    Facebook {stepData.data.has_facebook ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.has_youtube 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    YouTube {stepData.data.has_youtube ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.has_twitter 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    Twitter {stepData.data.has_twitter ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.has_github 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    GitHub {stepData.data.has_github ? '✓' : '✗'}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Apollo step data - enhanced */}
                        {config.key === 'apollo_search' && (
                          <div className="space-y-1.5">
                            {stepData.status === 'completed' && stepData.data.name && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span className="text-muted-foreground">Name:</span>
                                <span>{stepData.data.name}</span>
                                {stepData.data.title && (
                                  <>
                                    <span className="text-muted-foreground">Title:</span>
                                    <span>{stepData.data.title}</span>
                                  </>
                                )}
                                {stepData.data.organization && (
                                  <>
                                    <span className="text-muted-foreground">Company:</span>
                                    <span>{stepData.data.organization}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Apollo socials found */}
                            {stepData.data.socials_found && (
                              <div className="pt-1 border-t border-border/50">
                                <span className="text-muted-foreground block mb-1">Socials found in Apollo:</span>
                                <div className="flex gap-1 flex-wrap">
                                  {stepData.data.socials_found.linkedin && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] py-0">LinkedIn ✓</Badge>
                                  )}
                                  {stepData.data.socials_found.facebook && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] py-0">Facebook ✓</Badge>
                                  )}
                                  {stepData.data.socials_found.twitter && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] py-0">Twitter ✓</Badge>
                                  )}
                                  {stepData.data.socials_found.github && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] py-0">GitHub ✓</Badge>
                                  )}
                                  {stepData.data.socials_found.youtube && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] py-0">YouTube ✓</Badge>
                                  )}
                                  {!stepData.data.socials_found.linkedin && !stepData.data.socials_found.facebook && 
                                   !stepData.data.socials_found.twitter && !stepData.data.socials_found.github && 
                                   !stepData.data.socials_found.youtube && (
                                    <span className="text-muted-foreground italic">None found</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* Apollo found socials (alternative format) */}
                            {(stepData.data.found_linkedin !== undefined || stepData.data.found_facebook !== undefined) && (
                              <div className="pt-1 border-t border-border/50">
                                <span className="text-muted-foreground block mb-1">Socials found in Apollo:</span>
                                <div className="flex gap-1 flex-wrap">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.found_linkedin 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    LinkedIn {stepData.data.found_linkedin ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.found_facebook 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    Facebook {stepData.data.found_facebook ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.found_twitter 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    Twitter {stepData.data.found_twitter ? '✓' : '✗'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] py-0",
                                      stepData.data.found_github 
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    GitHub {stepData.data.found_github ? '✓' : '✗'}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Google step data - enhanced */}
                        {config.key === 'google_socials' && stepData.data.results && (
                          <div className="space-y-1.5">
                            <div className="text-muted-foreground">
                              Search query: "<span className="text-foreground">{stepData.data.search_name}</span>" at "<span className="text-foreground">{stepData.data.search_company}</span>"
                            </div>
                            <div className="pt-1 border-t border-border/50">
                              <span className="text-muted-foreground block mb-1">Google search results:</span>
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(stepData.data.results as Record<string, any>).map(([platform, result]) => {
                                  if (!result.searched) return null;
                                  return (
                                    <Badge 
                                      key={platform}
                                      variant="outline" 
                                      className={cn(
                                        "text-[9px] py-0",
                                        result.found 
                                          ? "bg-green-50 text-green-700 border-green-200" 
                                          : "bg-muted text-muted-foreground border-border"
                                      )}
                                    >
                                      {platform.charAt(0).toUpperCase() + platform.slice(1)} {result.found ? '✓' : '✗'}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Show found URLs */}
                            {Object.entries(stepData.data.results as Record<string, any>).some(([, r]) => r.found && r.url) && (
                              <div className="pt-1 border-t border-border/50">
                                <span className="text-muted-foreground block mb-1">URLs found:</span>
                                <div className="space-y-0.5">
                                  {Object.entries(stepData.data.results as Record<string, any>).map(([platform, result]) => {
                                    if (!result.found || !result.url) return null;
                                    return (
                                      <div key={platform} className="flex items-center gap-1 text-[9px]">
                                        <span className="text-muted-foreground capitalize">{platform}:</span>
                                        <a 
                                          href={result.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline truncate max-w-[200px]"
                                        >
                                          {result.url.replace('https://', '').replace('http://', '')}
                                        </a>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Skip reason */}
                        {stepData.status === 'skipped' && stepData.data?.reason && (
                          <span className="text-muted-foreground italic">
                            {stepData.data.reason === 'all_socials_found_in_apollo' 
                              ? 'All social profiles found in Apollo' 
                              : stepData.data.reason === 'missing_company_name'
                              ? 'Company name not available for search'
                              : stepData.data.reason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
