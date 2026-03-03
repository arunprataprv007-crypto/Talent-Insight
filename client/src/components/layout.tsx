import { Link, useLocation } from "wouter";
import { BrainCircuit, Briefcase, Users, LayoutDashboard, GitMerge, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: Users, label: "Candidates", href: "/candidates" },
  { icon: GitMerge, label: "Matches", href: "/matches" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-panel border-r border-border/50 flex flex-col h-auto md:h-screen sticky top-0 z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">Talent<span className="text-primary">Intel</span></h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">AI Recruitment</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                  ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}
                `}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-border/50 mt-auto">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center border border-border shrink-0">
                <span className="font-bold text-sm">{user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-2" 
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              Sign Out
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 md:p-10 max-w-7xl mx-auto z-10"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
