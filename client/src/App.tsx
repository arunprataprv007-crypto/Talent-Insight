import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import CandidatesPage from "@/pages/candidates";
import CandidateDetailPage from "@/pages/candidate-detail";
import MatchesPage from "@/pages/matches";
import MatchDetailPage from "@/pages/match-detail";
import SourcingPage from "@/pages/sourcing";
import ScreeningDashboard from "@/pages/screening";
import BooleanGeneratorPage from "@/pages/boolean-generator";
import { Layout } from "@/components/layout";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <AuthPage />;
  }
  
  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/jobs" component={() => <ProtectedRoute component={JobsPage} />} />
      <Route path="/jobs/:id" component={() => <ProtectedRoute component={JobDetailPage} />} />
      <Route path="/candidates" component={() => <ProtectedRoute component={CandidatesPage} />} />
      <Route path="/candidates/:id" component={() => <ProtectedRoute component={CandidateDetailPage} />} />
      <Route path="/matches" component={() => <ProtectedRoute component={MatchesPage} />} />
      <Route path="/matches/:id" component={() => <ProtectedRoute component={MatchDetailPage} />} />
      <Route path="/sourcing" component={() => <ProtectedRoute component={SourcingPage} />} />
      <Route path="/screening" component={() => <ProtectedRoute component={ScreeningDashboard} />} />
      <Route path="/boolean" component={() => <ProtectedRoute component={BooleanGeneratorPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
