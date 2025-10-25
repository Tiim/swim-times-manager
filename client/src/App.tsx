import { Router, Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Athletes from "@/pages/Athletes";
import AllTimes from "@/pages/AllTimes";
import AddTime from "@/pages/AddTime";
import AthleteProfile from "@/pages/AthleteProfile";
import ImportExport from "@/pages/ImportExport";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Router base="/swim-times-manager">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/athletes" component={Athletes} />
        <Route path="/all-times" component={AllTimes} />
        <Route path="/add-time" component={AddTime} />
        <Route path="/import-export" component={ImportExport} />
        <Route path="/athlete/:id" component={AthleteProfile} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <TooltipProvider>
      <ThemeProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-3 border-b border-border bg-background sticky top-0 z-10">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-6">
                <AppRouter />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </ThemeProvider>
    </TooltipProvider>
  );
}
