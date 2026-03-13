import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useJob, useParseJob } from "@/hooks/use-jobs";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "@shared/routes";
import {
  BrainCircuit, Loader2, FileText, Search, Copy, ExternalLink,
  CheckCircle2, BarChart3, UserCircle, ChevronRight, Star, Zap
} from "lucide-react";
import { motion } from "framer-motion";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80
    ? "bg-green-500/20 text-green-400 border-green-500/30"
    : score >= 60
    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  return <Badge className={`font-bold ${color}`}>{score}/100</Badge>;
}

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = parseInt(params?.id || "0");
  const { toast } = useToast();

  const { data: job, isLoading } = useJob(jobId);
  const parseJob = useParseJob();

  const [rankings, setRankings] = useState<any[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const rankCandidates = useMutation({
    mutationFn: async () => {
      setIsRanking(true);
      const res = await fetch(buildUrl("/api/jobs/:id/rank-candidates", { id: jobId }), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ranking failed");
      return res.json();
    },
    onSuccess: (data) => {
      setRankings(data.rankings || []);
      setIsRanking(false);
      toast({ title: "Semantic ranking complete", description: `${data.rankings?.length || 0} candidates ranked.` });
    },
    onError: (err: any) => {
      setIsRanking(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyBooleanString = (str: string, idx: number) => {
    navigator.clipboard.writeText(str);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!job) return <div className="text-center p-12">Job not found</div>;

  const parsed = job.parsedRequirements as any;
  const booleans = job.booleanStrings as string[] | null;
  const hasParsed = !!parsed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 p-6 rounded-2xl border border-white/5">
        <div>
          <p className="text-primary font-medium mb-1">{job.company}</p>
          <h1 className="text-3xl font-display font-bold">{job.title}</h1>
          {hasParsed && parsed.experienceLevel && (
            <Badge variant="secondary" className="mt-2">{parsed.experienceLevel}</Badge>
          )}
        </div>
        <Button
          onClick={() => parseJob.mutate(job.id)}
          disabled={parseJob.isPending}
          className="ai-button-gradient whitespace-nowrap"
          data-testid="btn-parse"
        >
          {parseJob.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing JD…</>
            : <><BrainCircuit className="w-4 h-4 mr-2" />{hasParsed ? "Re-parse JD" : "Parse JD"}</>}
        </Button>
      </div>

      <Tabs defaultValue="jd">
        <TabsList className="bg-card border border-white/5">
          <TabsTrigger value="jd" data-testid="tab-jd"><FileText className="w-4 h-4 mr-2" />Job Description</TabsTrigger>
          <TabsTrigger value="requirements" data-testid="tab-requirements" disabled={!hasParsed}>
            <BrainCircuit className="w-4 h-4 mr-2" />AI Requirements
          </TabsTrigger>
          <TabsTrigger value="boolean" data-testid="tab-boolean" disabled={!booleans?.length}>
            <Search className="w-4 h-4 mr-2" />Boolean Search
          </TabsTrigger>
          <TabsTrigger value="ranking" data-testid="tab-ranking">
            <BarChart3 className="w-4 h-4 mr-2" />Semantic Ranking
          </TabsTrigger>
        </TabsList>

        {/* ── JD Tab ── */}
        <TabsContent value="jd" className="mt-4">
          <Card className="p-6 glass-panel border-white/5">
            <h3 className="font-display font-semibold text-lg flex items-center mb-4 border-b border-white/5 pb-4">
              <FileText className="w-5 h-5 mr-2 text-muted-foreground" /> Raw Description
            </h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed max-h-[600px] overflow-y-auto pr-2">
              {job.description}
            </div>
          </Card>
        </TabsContent>

        {/* ── AI Requirements Tab — Feature #2 ── */}
        <TabsContent value="requirements" className="mt-4">
          {hasParsed && (
            <div className="grid md:grid-cols-2 gap-6">
              {parsed.summary && (
                <Card className="p-5 glass-panel border-primary/20 bg-primary/5 md:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Role Summary</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{parsed.summary}</p>
                </Card>
              )}
              <Card className="p-5 glass-panel border-white/5">
                <p className="text-xs uppercase tracking-wider text-red-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Must Have
                </p>
                <div className="space-y-2">
                  {(parsed.mustHave || parsed.requirements || []).map((req: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{req}</span>
                    </div>
                  ))}
                </div>
              </Card>
              {parsed.niceToHave?.length > 0 && (
                <Card className="p-5 glass-panel border-white/5">
                  <p className="text-xs uppercase tracking-wider text-yellow-400 font-semibold mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Nice to Have
                  </p>
                  <div className="space-y-2">
                    {parsed.niceToHave.map((req: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{req}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Boolean Search Tab — Feature #6 ── */}
        <TabsContent value="boolean" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg">Boolean Search Strings</h3>
                <p className="text-sm text-muted-foreground mt-1">Use these in LinkedIn Recruiter, Indeed, or any job board.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => parseJob.mutate(job.id)} disabled={parseJob.isPending} data-testid="btn-regenerate-boolean">
                {parseJob.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <BrainCircuit className="w-3.5 h-3.5 mr-2" />}
                Regenerate
              </Button>
            </div>

            {booleans?.map((str, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                <Card className="p-4 glass-panel border-white/5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium mb-2">String {idx + 1}</p>
                      <p className="text-sm font-mono text-blue-300 leading-relaxed break-all">{str}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => copyBooleanString(str, idx)} data-testid={`btn-copy-boolean-${idx}`}>
                        {copiedIdx === idx ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                        <a href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(str)}`} target="_blank" rel="noopener noreferrer" data-testid={`btn-linkedin-boolean-${idx}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {[
                      { label: "LinkedIn", url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(str)}` },
                      { label: "Indeed", url: `https://uk.indeed.com/jobs?q=${encodeURIComponent(str)}` },
                      { label: "Reed", url: `https://www.reed.co.uk/jobs/${encodeURIComponent(str.split(" ")[0]?.toLowerCase() || "")}` },
                    ].map(platform => (
                      <a key={platform.label} href={platform.url} target="_blank" rel="noopener noreferrer">
                        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 text-xs transition-colors">
                          {platform.label} <ExternalLink className="w-2.5 h-2.5 ml-1" />
                        </Badge>
                      </a>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Semantic Ranking Tab — Feature #7 ── */}
        <TabsContent value="ranking" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg">Semantic Candidate Ranking</h3>
                <p className="text-sm text-muted-foreground mt-1">AI ranks all candidates in your pool by their fit for this role.</p>
              </div>
              <Button
                className="ai-button-gradient"
                onClick={() => rankCandidates.mutate()}
                disabled={isRanking}
                data-testid="btn-rank-candidates"
              >
                {isRanking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ranking…</> : <><BarChart3 className="w-4 h-4 mr-2" />Rank Candidates</>}
              </Button>
            </div>

            {!rankings.length && !isRanking && (
              <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                <p className="text-muted-foreground text-sm">Click Rank Candidates to semantically score all candidates in your pool against this role.</p>
                {!hasParsed && <p className="text-xs text-muted-foreground mt-2">Tip: Parse the JD first for more accurate rankings.</p>}
              </div>
            )}

            {isRanking && (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> AI is ranking your candidates…
              </div>
            )}

            {rankings.length > 0 && !isRanking && (
              <div className="space-y-3">
                {rankings.map((r: any, i: number) => (
                  <motion.div
                    key={r.candidateId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-white/5 hover:border-white/10 transition-colors"
                    data-testid={`rank-row-${r.candidateId}`}
                  >
                    <div className="text-2xl font-display font-bold text-muted-foreground/40 w-8 text-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{r.candidate?.name || `Candidate #${r.candidateId}`}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{r.reason}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreBadge score={r.score} />
                      <Link href={`/candidates/${r.candidateId}`}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" data-testid={`btn-view-candidate-${r.candidateId}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
