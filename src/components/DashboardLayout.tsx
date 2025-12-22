import { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  selectedCategory?: string | null;
  categoryLeadCount?: number;
}

export function DashboardLayout({ children, activeView, onViewChange, selectedCategory, categoryLeadCount }: DashboardLayoutProps) {
  const getHeaderText = () => {
    if (activeView === "statistics") return "Statistics";
    if (activeView === "admin") return "Admin dashboard";
    if (activeView === "home") {
      return null; // We'll show category info next to the sidebar trigger
    }
    return "Add Leads";
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeView={activeView} onViewChange={onViewChange} />
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            {getHeaderText() && (
              <h1 className="text-xl font-semibold">
                {getHeaderText()}
              </h1>
            )}
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
