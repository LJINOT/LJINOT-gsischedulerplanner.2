import {
  LayoutDashboard, ListTodo, PlusCircle, CalendarDays, Clock, Target,
  Sun, CalendarRange, CheckCircle2, LogOut, Brain, Lightbulb, RefreshCw,
  Focus, AlertTriangle, BarChart3, User, Settings, Palette, HelpCircle,
  ChevronDown
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const managementItems = [
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Add Task", url: "/add-task", icon: PlusCircle },
  { title: "Calendar Workspace", url: "/calendar", icon: CalendarDays },
  { title: "Auto Schedule", url: "/auto-schedule", icon: Clock },
];

const referentialItems = [
  { title: "Priorities", url: "/priorities", icon: Target },
  { title: "Today", url: "/today", icon: Sun },
  { title: "This Week", url: "/this-week", icon: CalendarRange },
  { title: "Completed", url: "/completed", icon: CheckCircle2 },
];

const smartFeatureItems = [
  { title: "Smart Suggestions", url: "/smart-suggestions", icon: Lightbulb },
  { title: "Adaptive Scheduling", url: "/adaptive-scheduling", icon: RefreshCw },
  { title: "Focus Mode", url: "/focus-mode", icon: Focus },
  { title: "Deadline Risk Detector", url: "/deadline-risk", icon: AlertTriangle },
  { title: "Productivity Insights", url: "/productivity-insights", icon: BarChart3 },
];

const settingsItems = [
  { title: "Profile", url: "/settings/profile", icon: User },
  { title: "General", url: "/settings/general", icon: Settings },
  { title: "Personalization", url: "/settings/personalization", icon: Palette },
  { title: "Help / About", url: "/settings/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const [smartOpen, setSmartOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const renderGroup = (label: string, items: typeof managementItems) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const renderCollapsibleGroup = (label: string, items: typeof smartFeatureItems, open: boolean, setOpen: (v: boolean) => void, accentColor: string) => (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className={`flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${open ? `bg-primary/10 text-primary` : `text-sidebar-foreground/70 hover:bg-accent/50 hover:text-sidebar-foreground`}`}>
          {!collapsed && <span>{label}</span>}
          {!collapsed && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/favicon.ico" alt="GSI Logo" className="h-6 w-6 rounded-full" />
          {!collapsed && <span className="font-display text-lg font-bold">GSI Schedule Planner</span>}
        </NavLink>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {renderGroup("Management", managementItems)}
        {renderGroup("Referential / Overview", referentialItems)}
        {renderCollapsibleGroup("Intelligent System Modules", smartFeatureItems, smartOpen, setSmartOpen, "primary")}
        {renderCollapsibleGroup("Settings", settingsItems, settingsOpen, setSettingsOpen, "primary")}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="mb-3" />
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">U</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-auto gap-2">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
