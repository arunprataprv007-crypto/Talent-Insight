import { useJobs } from "@/hooks/use-jobs";
import { useCandidates } from "@/hooks/use-candidates";
import { useMatches } from "@/hooks/use-matches";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, GitMerge, Zap, BrainCircuit, CheckCircle2, CircleDashed, ShieldCheck, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: candidates } = useCandidates();
  const { data: matches } = useMatches();
  const { data: aiStatus } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/ai/status"],
  });

  const stats = [
    { title: "Active Jobs", value: jobs?.length || 0, icon: Briefcase, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Total Candidates", value: candidates?.length || 0, icon: Users, color: "text-green-400", bg: "bg-green-400/10" },
    { title: "AI Matches", value: matches?.length || 0, icon: GitMerge, color: "text-purple-400", bg: "bg-purple-400/10" },
    { title: "High Scores (>85)", value: matches?.filter(m => m.score && m.score > 85).length || 0, icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your recruitment pipeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-6 glass-panel border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-display font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-4">Recent Jobs</h3>
          <div className="space-y-4">
            {jobs?.slice(0, 5).map(job => (
              <div key={job.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                  {job.status}
                </div>
              </div>
            ))}
            {!jobs?.length && <p className="text-muted-foreground text-sm">No jobs added yet.</p>}
          </div>
        </Card>

        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-4">Top Matches</h3>
          <div className="space-y-4">
            {matches?.filter(m => m.score).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5).map(match => (
              <div key={match.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium text-sm">Job #{match.jobId} ↔ Candidate #{match.candidateId}</p>
                  <p className="text-xs text-muted-foreground capitalize">{match.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-accent">{match.score}%</span>
                </div>
              </div>
            ))}
            {!matches?.length && <p className="text-muted-foreground text-sm">No matches analyzed yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-6 glass-panel border-white/5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BrainCircuit className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg">Talent Insight Engine</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Every CV and job description can be routed through multiple models, then returned with a verified fit score and supporting evidence.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Result verification enabled
          </div>
        </div>

        <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
          <EngineStep title="JD / CV" detail="Input" icon="document" />
          <ArrowDown className="w-4 h-4 text-muted-foreground self-center lg:-rotate-90" />
          <EngineStep title="AI Orchestrator" detail="Routes requests" icon="brain" />
          <ArrowDown className="w-4 h-4 text-muted-foreground self-center lg:-rotate-90" />
          <div className="grid grid-cols-3 gap-2 flex-1">
            {[
              ["OpenAI", "openai"],
              ["Gemini", "gemini"],
              ["Claude", "claude"],
            ].map(([label, key]) => {
              const enabled = aiStatus?.[key];
              return (
                <div key={key} className="rounded-xl border border-border/60 bg-white/[.03] p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium">{label}</span>
                    {enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <CircleDashed className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <p className={`text-[11px] mt-1 ${enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {enabled ? "Connected" : "Not configured"}
                  </p>
                </div>
              );
            })}
          </div>
          <ArrowDown className="w-4 h-4 text-muted-foreground self-center lg:-rotate-90" />
          <EngineStep title="Verified answer" detail="Fit score + evidence" icon="check" />
        </div>
      </Card>
    </div>
  );
}

function EngineStep({ title, detail, icon }: { title: string; detail: string; icon: string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[.06] p-3 min-w-[150px]">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}
