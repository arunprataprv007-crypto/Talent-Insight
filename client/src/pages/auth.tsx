import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AuthPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Decorative Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-10 rounded-3xl max-w-md w-full text-center relative z-10 border border-white/5"
      >
        <div className="mx-auto bg-card p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 shadow-xl border border-white/10">
          <BrainCircuit className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Talent<span className="text-primary">Intel</span>
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          SaaS Recruitment Intelligence Platform powered by AI. Parse JDs, match candidates, and generate personalized outreach instantly.
        </p>

        <Button 
          onClick={handleLogin} 
          size="lg" 
          className="w-full ai-button-gradient py-6 text-lg font-semibold rounded-xl group"
        >
          <span className="mr-2">Sign in with Replit</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Button>
      </motion.div>
    </div>
  );
}
