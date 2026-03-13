import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMatch, useAnalyzeMatch, useUpdateMatchStatus } from "@/hooks/use-matches";
import { useJob } from "@/hooks/use-jobs";
import { useCandidate } from "@/hooks/use-candidates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "@shared/routes";
import {
  BrainCircuit, Loader2, Mail, BarChart3, CheckCircle2, XCircle,
  MessageSquare, HelpCircle, ChevronDown, ChevronUp, ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SCREENING_STAGES = [
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "screening", label: "Screening Call" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offered", label: "Offered" },
  { key: "rejected", label: "Rejected" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Technical": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Behavioral": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Role-Specific": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Culture Fit": "bg-green-500/10 text-green-400 border-green-500/20",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  "Screening": "text-slate-400",
  "Intermediate": "text-yellow-400",
  "Deep Dive": "text-red-400",
};

function CriteriaScore({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{score}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ q, index }: { q: any; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
        data-testid={`question-${index}`}
      >
        <span className="text-xs font-mono text-muted-foreground pt-0.5 shrink-0">{String(index + 1).padStart(2, "0")}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className={`text-xs border ${CATEGORY_COLORS[q.category] || "bg-white/10 text-muted-foreground"}`}>{q.category}</Badge>
            <span className={`text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty] || "text-muted-foreground"}`}>{q.difficulty}</span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{q.question}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      <AnimatePresence>
        {open && q.rationale && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 ml-8 text-xs text-muted-foreground border-t border-white/5 pt-3">
              <span className="font-semibold text-foreground/60">Why ask this: </span>{q.rationale}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MatchDetailPage() {
  const [, params] = useRoute("/matches/:id");
  const matchId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: match, isLoading: isLoadingMatch } = useMatch(matchId);
  const { data: job, isLoading: isLoadingJob } = useJob(match?.jobId || 0);
  const { data: candidate, isLoading: isLoadingCandidate } = useCandidate(match?.candidateId || 0);

  const analyzeMatch = useAnalyzeMatch();
  const updateStatus = useUpdateMatchStatus();

  const generateQuestions = useMutation({
    mutationFn: (id: number) => apiRequest("POST", buildUrl("/api/matches/:id/questions", { id })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/:id", matchId] });
      toast({ title: "Interview questions generated", description: "AI tailored 10–12 screening questions for this match." });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate questions.", variant: "destructive" }),
  });

  const updateScreeningStatus = useMutation({
    mutationFn: ({ id, screeningStatus }: { id: number; screeningStatus: string }) =>
      apiRequest("PATCH", buildUrl("/api/matches/:id/screening-status", { id }), { screeningStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/:id", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/screening/stats"] });
      toast({ title: "Stage updated" });
    },
  });

  if (isLoadingMatch || isLoadingJob || isLoadingCandidate) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!match || !job || !candidate) {
    return <div className="text-center p-12">Data not found</div>;
  }

  const criteriaScores = match.criteriaScores as any;
  const screeningQuestions = match.screeningQuestions as any[];
  const hasAnalysis = !!match.score;
  const hasQuestions = screeningQuestions?.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Candidate</p>
            <p className="font-display font-bold text-lg">{candidate.name}</p>
          </div>
          <div className="px-3 text-muted-foreground">↔</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Role</p>
            <p className="font-display font-bold text-lg">{job.title}</p>
          </div>
          {match.score && (
            <div className={`px-3 py-1 rounded-full text-sm font-bold border ${match.score >= 80 ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
              {match.score}/100
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={match.screeningStatus || "new"}
            onValueChange={v => updateScreeningStatus.mutate({ id: match.id, screeningStatus: v })}
          >
            <SelectTrigger className="h-8 text-xs w-40 bg-white/5 border-white/10" data-testid="select-screening-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCREENING_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasAnalysis ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-8" onClick={() => updateStatus.mutate({ id: match.id, status: "approved" })} data-testid="btn-approve">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8" onClick={() => updateStatus.mutate({ id: match.id, status: "rejected" })} data-testid="btn-reject">
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          ) : (
            <Button onClick={() => analyzeMatch.mutate(match.id)} disabled={analyzeMatch.isPending} className="ai-button-gradient h-8 text-sm" data-testid="btn-analyze">
              {analyzeMatch.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analysing…</> : <><BrainCircuit className="w-3.5 h-3.5 mr-2" />Generate Analysis</>}
            </Button>
          )}
        </div>
      </div>

      {!hasAnalysis && !analyzeMatch.isPending && (
        <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
          <BrainCircuit className="w-12 h-12 text-primary/50 mx-auto mb-4" />
          <h2 className="text-xl font-display font-semibold mb-2">Ready for AI Evaluation</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Click Generate Analysis to score the fit, get a detailed breakdown, and draft outreach messaging.</p>
        </div>
      )}

      {hasAnalysis && (
        <Tabs defaultValue="scoring">
          <TabsList className="bg-card border border-white/5">
            <TabsTrigger value="scoring" data-testid="tab-scoring"><BarChart3 className="w-4 h-4 mr-2" />Scoring</TabsTrigger>
            <TabsTrigger value="questions" data-testid="tab-questions">
              <MessageSquare className="w-4 h-4 mr-2" />Interview Questions
              {hasQuestions && <Badge className="ml-2 text-xs h-4 px-1">{screeningQuestions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="inmail" data-testid="tab-inmail"><Mail className="w-4 h-4 mr-2" />InMail Draft</TabsTrigger>
          </TabsList>

          {/* ── Scoring Tab ── */}
          <TabsContent value="scoring" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 glass-panel border-white/5 md:col-span-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className={`absolute inset-0 opacity-20 ${match.score! >= 80 ? "bg-green-500" : "bg-yellow-500"} blur-[50px] -z-10`} />
                <h3 className="font-display text-muted-foreground mb-4 uppercase tracking-widest text-sm">Overall Score</h3>
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * (match.score || 0)) / 100}
                      className={match.score! >= 80 ? "text-green-400" : "text-yellow-400"}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-4xl font-display font-bold">{match.score}</span>
                </div>
                <Badge className="mt-4 capitalize">{match.status}</Badge>

                {criteriaScores && (
                  <div className="w-full mt-6 space-y-3 text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-center mb-3">Breakdown</p>
                    {[
                      { label: "Technical", key: "technical", color: "bg-blue-500" },
                      { label: "Experience", key: "experience", color: "bg-purple-500" },
                      { label: "Domain Fit", key: "domain", color: "bg-orange-500" },
                      { label: "Culture Fit", key: "culture", color: "bg-green-500" },
                    ].map(c => (
                      <CriteriaScore key={c.key} label={c.label} score={criteriaScores[c.key] || 0} color={c.color} />
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 glass-panel border-white/5 md:col-span-2">
                <h3 className="font-display font-semibold text-lg flex items-center mb-4 border-b border-white/5 pb-4">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary" /> Technical Analysis
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {match.analysis || "No analysis available."}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Interview Questions Tab ── */}
          <TabsContent value="questions" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" /> AI-Generated Interview Questions
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Tailored for {candidate.name} applying to {job.title} at {job.company}.</p>
                </div>
                <Button
                  onClick={() => generateQuestions.mutate(match.id)}
                  disabled={generateQuestions.isPending}
                  className="ai-button-gradient"
                  data-testid="btn-generate-questions"
                >
                  {generateQuestions.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                    : <><BrainCircuit className="w-4 h-4 mr-2" />{hasQuestions ? "Regenerate" : "Generate"} Questions</>}
                </Button>
              </div>

              {!hasQuestions && !generateQuestions.isPending && (
                <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                  <p className="text-muted-foreground text-sm">Click Generate to create AI-tailored screening questions for this candidate-role pairing.</p>
                </div>
              )}

              {generateQuestions.isPending && (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> Crafting personalised questions…
                </div>
              )}

              {hasQuestions && !generateQuestions.isPending && (
                <div className="space-y-2">
                  {(["Technical", "Role-Specific", "Behavioral", "Culture Fit"] as const).map(cat => {
                    const qs = screeningQuestions.filter(q => q.category === cat);
                    if (!qs.length) return null;
                    return (
                      <div key={cat} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">{cat}</p>
                        {qs.map((q, i) => <QuestionCard key={i} q={q} index={screeningQuestions.indexOf(q)} />)}
                      </div>
                    );
                  })}
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = screeningQuestions.map((q, i) => `${i + 1}. [${q.category} – ${q.difficulty}]\n${q.question}`).join("\n\n");
                        navigator.clipboard.writeText(text);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      <ClipboardList className="w-4 h-4 mr-2" /> Copy All Questions
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── InMail Tab ── */}
          <TabsContent value="inmail" className="mt-4">
            <Card className="p-6 glass-panel border-primary/30 bg-primary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">AI Generated</div>
              <h3 className="font-display font-semibold text-lg flex items-center mb-4">
                <Mail className="w-5 h-5 mr-2 text-primary" /> Personalised InMail Draft
              </h3>
              <div className="bg-black/40 p-5 rounded-xl border border-white/5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {match.inMailDraft}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(match.inMailDraft!); toast({ title: "Copied to clipboard" }); }} data-testid="btn-copy-inmail">
                  Copy to Clipboard
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
