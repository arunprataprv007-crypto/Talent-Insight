import { useState } from "react";
import { BrainCircuit, Mail, Lock, ArrowRight, Sparkles, Target, Users, Zap } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Decorative Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-3/4 left-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[100px] -z-10" />

      {/* Left Panel — Branding & Features */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-1/2 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-card p-2.5 rounded-xl flex items-center justify-center shadow-xl border border-white/10">
              <BrainCircuit className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display text-xl font-bold">
              Talent<span className="text-primary">Intel</span>
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-5xl font-bold leading-tight mb-6">
              Hire smarter with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI-powered intelligence
              </span>
            </h1>
            <p className="text-muted-foreground text-lg mb-10 max-w-md">
              Parse JDs, match candidates, and generate personalized outreach in seconds. Built for modern recruitment teams.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {[
              { icon: Sparkles, title: "AI CV Parsing", desc: "Extract structured data from any resume instantly" },
              { icon: Target, title: "Smart Matching", desc: "Score candidate-job fit with explainable AI" },
              { icon: Zap, title: "Personalized Outreach", desc: "Generate InMails tailored to each candidate" },
              { icon: Users, title: "Talent Pool", desc: "Centralized database of every candidate you meet" },
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-4" data-testid={`feature-${feat.title.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 mt-0.5">
                  <feat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{feat.title}</p>
                  <p className="text-xs text-muted-foreground">{feat.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 TalentIntel. Powered by Replit Auth.
        </p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel p-8 sm:p-10 rounded-3xl max-w-md w-full border border-white/5 shadow-2xl"
        >
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="bg-card p-2 rounded-xl flex items-center justify-center border border-white/10">
              <BrainCircuit className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-lg font-bold">
              Talent<span className="text-primary">Intel</span>
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2 text-center lg:text-left" data-testid="text-auth-title">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground text-sm mb-8 text-center lg:text-left">
            {mode === "signin" ? "Sign in to continue to your workspace" : "Start hiring smarter in under a minute"}
          </p>

          {/* Social Logins */}
          <div className="space-y-3 mb-6">
            <Button
              onClick={handleLogin}
              variant="outline"
              size="lg"
              className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 py-6 text-sm font-medium rounded-xl"
              data-testid="button-login-google"
            >
              <SiGoogle className="w-4 h-4 mr-3" />
              Continue with Google
            </Button>
            <Button
              onClick={handleLogin}
              variant="outline"
              size="lg"
              className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 py-6 text-sm font-medium rounded-xl"
              data-testid="button-login-apple"
            >
              <SiApple className="w-4 h-4 mr-3" />
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground tracking-wider">Or with email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border-white/10 pl-10 py-5 rounded-xl focus:border-primary/40"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-white/10 pl-10 py-5 rounded-xl focus:border-primary/40"
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full ai-button-gradient py-6 text-base font-semibold rounded-xl group mt-2"
              data-testid="button-submit-auth"
            >
              <span className="mr-2">{mode === "signin" ? "Sign in" : "Create account"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          {/* Toggle Mode */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
              data-testid="button-toggle-mode"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Authentication is securely handled by Replit.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
