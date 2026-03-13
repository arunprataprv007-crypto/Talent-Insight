import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Users, Briefcase, GitMerge, TrendingUp, Star,
  ChevronRight, BarChart3, Zap, CheckCircle2, XCircle, Clock,
  MessageSquare, ArrowRight
} from "lucide-react";

const SCREENING_STAGES = [
  { key: "new", label: "New", color: "bg-slate-500", textColor: "text-slate-400" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-blue-500", textColor: "text-blue-400" },
  { key: "screening", label: "Screening", color: "bg-yellow-500", textColor: "text-yellow-400" },
  { key: "interviewing", label: "Interviewing", color: "bg-purple-500", textColor: "text-purple-400" },
  { key: "offered", label: "Offered", color: "bg-green-500", textColor: "text-green-400" },
  { key: "rejected", label: "Rejected", color: "bg-red-500", textColor: "text-red-400" },
];

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30"
    : score >= 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  return <Badge className={`font-display font-bold text-sm px-2.5 ${color}`}>{score}</Badge>;
}

export default function ScreeningDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/screening/stats"],
    queryFn: async () => {
      const res = await fetch("/api/screening/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json() as Promise<{
        totals: { jobs: number; candidates: number; matches: number; analyzed: number; avgScore: number; highScorers: number };
        stages: Record<string, number>;
        scoreDistribution: { range: string; count: number }[];
        topMatches: any[];
      }>;
    },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, screeningStatus }: { id: number; screeningStatus: string }) =>
      apiRequest("PATCH", `/api/matches/${id}/screening-status`, { screeningStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screening/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({ title: "Stage updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { totals, stages, scoreDistribution, topMatches } = stats || {
    totals: { jobs: 0, candidates: 0, matches: 0, analyzed: 0, avgScore: 0, highScorers: 0 },
    stages: {},
    scoreDistribution: [],
    topMatches: [],
  };

  const maxDist = Math.max(...(scoreDistribution?.map(d => d.count) || [1]), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" /> AI Screening Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Full pipeline visibility across CV parsing, scoring, and interview stages.</p>
      </div>

      {/* ── Headline Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Active Jobs", value: totals.jobs, icon: Briefcase, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Candidates", value: totals.candidates, icon: Users, color: "text-green-400", bg: "bg-green-400/10" },
          { label: "Total Matches", value: totals.matches, icon: GitMerge, color: "text-purple-400", bg: "bg-purple-400/10" },
          { label: "AI Scored", value: totals.analyzed, icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-400/10" },
          { label: "Avg Score", value: totals.avgScore, icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-400/10" },
          { label: "High Scorers", value: totals.highScorers, icon: Star, color: "text-yellow-400", bg: "bg-yellow-400/10" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-4 glass-panel border-white/5">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Pipeline Funnel ── */}
        <Card className="p-6 glass-panel border-white/5 lg:col-span-1">
          <h3 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Pipeline Funnel
          </h3>
          <div className="space-y-3">
            {SCREENING_STAGES.map((stage, i) => {
              const count = stages?.[stage.key] || 0;
              const total = totals.matches || 1;
              return (
                <div key={stage.key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${stage.textColor}`}>{stage.label}</span>
                    <span className="text-sm font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${stage.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / total) * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Score Distribution ── */}
        <Card className="p-6 glass-panel border-white/5 lg:col-span-1">
          <h3 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Score Distribution
          </h3>
          {scoreDistribution?.length === 0 || totals.analyzed === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              No scored matches yet.
            </div>
          ) : (
            <div className="space-y-3">
              {scoreDistribution?.map((band, i) => (
                <div key={band.range}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground font-mono">{band.range}</span>
                    <span className="text-sm font-bold">{band.count}</span>
                  </div>
                  <ScoreBar value={band.count} max={maxDist} color={
                    i === 0 ? "bg-green-500" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-yellow-500" : i === 3 ? "bg-orange-500" : "bg-red-500"
                  } />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Quick Actions ── */}
        <Card className="p-6 glass-panel border-white/5 lg:col-span-1">
          <h3 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" /> Quick Actions
          </h3>
          <div className="space-y-3">
            {[
              { href: "/candidates", label: "Parse a CV", sub: "Upload & extract candidate data", icon: Users, color: "text-green-400" },
              { href: "/jobs", label: "Parse a JD", sub: "Extract requirements & boolean strings", icon: Briefcase, color: "text-blue-400" },
              { href: "/matches", label: "Score Candidates", sub: "Run AI fit analysis", icon: BarChart3, color: "text-purple-400" },
              { href: "/sourcing", label: "Source Candidates", sub: "Search 7 job platforms", icon: GitMerge, color: "text-orange-400" },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                  <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Top Scored Matches ── */}
      <Card className="p-6 glass-panel border-white/5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" /> Top Scored Matches
          </h3>
          <Link href="/matches">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {topMatches?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No scored matches yet. Go to Matches to run AI analysis.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topMatches?.map((match: any) => {
              const currentStage = SCREENING_STAGES.find(s => s.key === (match.screeningStatus || "new"));
              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                  data-testid={`match-row-${match.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{match.candidate?.name || `Candidate #${match.candidateId}`}</p>
                      <span className="text-muted-foreground text-xs">→</span>
                      <p className="text-sm text-muted-foreground">{match.job?.title || `Job #${match.jobId}`}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{match.job?.company}</p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {match.score !== null && <ScoreBadge score={match.score} />}

                    {match.screeningQuestions && Array.isArray(match.screeningQuestions) && match.screeningQuestions.length > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <MessageSquare className="w-3 h-3" />{match.screeningQuestions.length} Qs
                      </Badge>
                    )}

                    <select
                      className="text-xs bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-foreground focus:outline-none focus:border-primary/50"
                      value={match.screeningStatus || "new"}
                      onChange={e => updateStage.mutate({ id: match.id, screeningStatus: e.target.value })}
                      data-testid={`select-stage-${match.id}`}
                    >
                      {SCREENING_STAGES.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>

                    <Link href={`/matches/${match.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2" data-testid={`btn-view-match-${match.id}`}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
