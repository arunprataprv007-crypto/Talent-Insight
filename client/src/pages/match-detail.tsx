import { useRoute } from "wouter";
import { useMatch, useAnalyzeMatch, useUpdateMatchStatus } from "@/hooks/use-matches";
import { useJob } from "@/hooks/use-jobs";
import { useCandidate } from "@/hooks/use-candidates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrainCircuit, Loader2, Mail, BarChart3, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MatchDetailPage() {
  const [, params] = useRoute("/matches/:id");
  const matchId = parseInt(params?.id || "0");
  
  const { data: match, isLoading: isLoadingMatch } = useMatch(matchId);
  const { data: job, isLoading: isLoadingJob } = useJob(match?.jobId || 0);
  const { data: candidate, isLoading: isLoadingCandidate } = useCandidate(match?.candidateId || 0);
  
  const analyzeMatch = useAnalyzeMatch();
  const updateStatus = useUpdateMatchStatus();

  if (isLoadingMatch || isLoadingJob || isLoadingCandidate) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  
  if (!match || !job || !candidate) {
    return <div className="text-center p-12">Data not found</div>;
  }

  const handleAnalyze = () => analyzeMatch.mutate(match.id);
  const handleStatus = (status: string) => updateStatus.mutate({ id: match.id, status });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card/50 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Candidate</p>
            <p className="font-display font-bold text-lg">{candidate.name}</p>
          </div>
          <div className="px-4 text-muted-foreground">↔</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Job</p>
            <p className="font-display font-bold text-lg">{job.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {match.score ? (
             <div className="flex gap-2">
               <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleStatus('approved')}>
                 <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
               </Button>
               <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleStatus('rejected')}>
                 <XCircle className="w-4 h-4 mr-2" /> Reject
               </Button>
             </div>
          ) : (
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzeMatch.isPending}
              className="ai-button-gradient w-full md:w-auto"
            >
              {analyzeMatch.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Synthesizing...</>
              ) : (
                <><BrainCircuit className="w-4 h-4 mr-2" /> Generate Analysis & InMail</>
              )}
            </Button>
          )}
        </div>
      </div>

      {!match.score && !analyzeMatch.isPending && (
         <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
           <BrainCircuit className="w-12 h-12 text-primary/50 mx-auto mb-4" />
           <h2 className="text-xl font-display font-semibold mb-2">Ready for AI Evaluation</h2>
           <p className="text-muted-foreground max-w-md mx-auto">Click generate to cross-reference candidate experience with extracted job requirements and draft outreach messaging.</p>
         </div>
      )}

      {match.score && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 glass-panel border-white/5 md:col-span-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className={`absolute inset-0 opacity-20 ${match.score >= 80 ? 'bg-green-500' : 'bg-yellow-500'} blur-[50px] -z-10`} />
            <h3 className="font-display text-muted-foreground mb-4 uppercase tracking-widest text-sm">Match Score</h3>
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                  strokeDasharray={377} 
                  strokeDashoffset={377 - (377 * match.score) / 100} 
                  className={match.score >= 80 ? 'text-green-400' : 'text-yellow-400'} 
                  strokeLinecap="round" 
                />
              </svg>
              <span className="absolute text-4xl font-display font-bold">{match.score}</span>
            </div>
            <p className="mt-4 text-sm font-medium capitalize px-3 py-1 bg-white/10 rounded-full border border-white/5">
              Status: {match.status}
            </p>
          </Card>

          <Card className="p-6 glass-panel border-white/5 md:col-span-2">
            <h3 className="font-display font-semibold text-lg flex items-center mb-4 border-b border-white/5 pb-4">
              <BarChart3 className="w-5 h-5 mr-2 text-primary" /> Technical Analysis
            </h3>
            <div className="prose prose-invert max-w-none text-sm text-muted-foreground leading-relaxed">
              {match.analysis ? (
                <div dangerouslySetInnerHTML={{ __html: match.analysis.replace(/\n/g, '<br/>') }} />
              ) : (
                <p className="italic">Analysis details unavailable.</p>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {match.inMailDraft && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 glass-panel border-primary/30 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">AI Generated</div>
            <h3 className="font-display font-semibold text-lg flex items-center mb-4">
              <Mail className="w-5 h-5 mr-2 text-primary" /> Personalized InMail Draft
            </h3>
            <div className="bg-black/40 p-5 rounded-xl border border-white/5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {match.inMailDraft}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(match.inMailDraft!)}>
                Copy to Clipboard
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
