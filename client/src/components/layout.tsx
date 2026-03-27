import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BrainCircuit, Briefcase, Users, LayoutDashboard, GitMerge, LogOut, Loader2, Search, Sparkles, X, Globe, ClipboardList, Code2, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: Users, label: "Candidates", href: "/candidates" },
  { icon: GitMerge, label: "Matches", href: "/matches" },
  { icon: Globe, label: "Sourcing", href: "/sourcing" },
  { icon: ClipboardList, label: "Screening", href: "/screening" },
  { icon: Code2, label: "Boolean Builder", href: "/boolean" },
  { icon: GraduationCap, label: "Training", href: "/training" },
];

function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = () => {
    if (!query.trim()) return;
    navigate(`/candidates?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-xl">
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
        <Input
          placeholder='AI search candidates, jobs, skills...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-10 pr-8 bg-white/5 border-white/10 focus:border-primary/50 h-9 text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Button size="sm" onClick={handleSearch} className="ai-button-gradient h-9 shrink-0">
        <Search className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-border/50 h-14 flex items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-base hidden sm:block">
            Talent<span className="text-primary">Intel</span>
          </span>
        </Link>

        {/* Global AI Search */}
        <div className="flex-1 flex justify-center">
          <GlobalSearchBar />
        </div>

        {/* User Info */}
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border text-sm font-bold">
              {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm font-medium hidden md:block">{user.firstName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              disabled={isLoggingOut}
              title="Sign Out"
              className="text-muted-foreground hover:text-destructive"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 md:w-56 glass-panel border-r border-border/50 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 shrink-0">
          <nav className="flex-1 px-2 md:px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group cursor-pointer
                    ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}
                  `}>
                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="hidden md:block text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="p-6 md:p-8 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
