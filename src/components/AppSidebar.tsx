import { Home, UserPlus, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
const menuItems = [{
  title: "Home",
  icon: Home,
  view: "home"
}, {
  title: "Add Leads",
  icon: UserPlus,
  view: "add-leads"
}];
interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}
export function AppSidebar({
  activeView,
  onViewChange
}: AppSidebarProps) {
  const {
    open
  } = useSidebar();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  return <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <img src={logo} alt="LeadFlow" className={open ? "h-10" : "h-8"} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={() => onViewChange(item.view)} isActive={activeView === item.view} className="cursor-pointer">
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
          <LogOut className="mr-2 h-4 w-4" />
          {open && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>;
}