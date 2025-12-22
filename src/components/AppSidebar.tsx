import { Home, UserPlus, LogOut, BarChart3, Shield, Settings } from "lucide-react";
import logo from "@/assets/smart-leads-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

type AppRole = "admin" | "client" | "user";

const menuItems: {
  title: string;
  icon: typeof Home;
  view: string;
  allowedRoles: AppRole[];
}[] = [
  {
    title: "Home",
    icon: Home,
    view: "home",
    allowedRoles: ["admin", "client", "user"],
  },
  {
    title: "Add Leads",
    icon: UserPlus,
    view: "add-leads",
    allowedRoles: ["admin", "client"],
  },
  {
    title: "Statistics",
    icon: BarChart3,
    view: "statistics",
    allowedRoles: ["admin", "client", "user"],
  },
  {
    title: "Admin",
    icon: Shield,
    view: "admin",
    allowedRoles: ["admin"],
  },
];

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { role, loading: adminLoading } = useAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => 
    role && item.allowedRoles.includes(role)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <img src={logo} alt="Smart Leads" className={open ? "w-full h-auto max-w-[100px] m-auto" : "w-10 h-auto"} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.view)}
                    isActive={activeView === item.view}
                    className="cursor-pointer"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onViewChange("settings")}
              isActive={activeView === "settings"}
              className="cursor-pointer"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
