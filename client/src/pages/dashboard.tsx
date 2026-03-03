import { useJobs } from "@/hooks/use-jobs";
import { useCandidates } from "@/hooks/use-candidates";
import { useMatches } from "@/hooks/use-matches";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, GitMerge, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: candidates } = useCandidates();
  const { data: matches } = useMatches();

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
    </div>
  );
}
