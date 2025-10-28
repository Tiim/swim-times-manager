import { Home, Users, Clock, Plus, Download, UserCog, FileUp, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Athletes",
    url: "/athletes",
    icon: Users,
  },
  {
    title: "Manage Athletes",
    url: "/manage-athletes",
    icon: UserCog,
  },
  {
    title: "All Times",
    url: "/all-times",
    icon: Clock,
  },
  {
    title: "Add Time",
    url: "/add-time",
    icon: Plus,
  },
  {
    title: "Import/Export",
    url: "/import-export",
    icon: Download,
  },
  {
    title: "Import from AI",
    url: "/import-json",
    icon: Sparkles,
  },
  {
    title: "Import LENEX",
    url: "/lenex-import",
    icon: FileUp,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">SwimTimes</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
