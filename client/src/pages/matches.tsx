import { useState } from "react";
import { Link } from "wouter";
import { useMatches, useCreateMatch } from "@/hooks/use-matches";
import { useJobs } from "@/hooks/use-jobs";
import { useCandidates } from "@/hooks/use-candidates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GitMerge, Plus, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMatchSchema, type InsertMatch } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MatchesPage() {
  const { data: matches, isLoading } = useMatches();
  const { data: jobs } = useJobs();
  const { data: candidates } = useCandidates();
  const createMatch = useCreateMatch();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<InsertMatch>({
    resolver: zodResolver(insertMatchSchema),
    defaultValues: { jobId: undefined, candidateId: undefined, status: "new" }
  });

  const onSubmit = (data: InsertMatch) => {
    createMatch.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Match Control Center</h1>
          <p className="text-muted-foreground mt-1">Evaluate candidates against job requirements.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="ai-button-gradient">
              <Plus className="w-4 h-4 mr-2" /> Create Match
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] glass-panel border-white/10">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Pair Candidate & Job</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="jobId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Job</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Choose a job" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobs?.map(j => <SelectItem key={j.id} value={j.id.toString()}>{j.title} ({j.company})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="candidateId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Candidate</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Choose a candidate" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {candidates?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full ai-button-gradient" disabled={createMatch.isPending}>
                  {createMatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Match"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {matches?.map((match) => {
            const job = jobs?.find(j => j.id === match.jobId);
            const candidate = candidates?.find(c => c.id === match.candidateId);
            
            return (
              <Link key={match.id} href={`/matches/${match.id}`} className="block group">
                <Card className="p-6 glass-panel border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col relative overflow-hidden">
                  {match.score && match.score > 80 && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[40px] pointer-events-none" />
                  )}
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><GitMerge className="w-4 h-4 text-muted-foreground" /></div>
                    </div>
                    {match.score ? (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg ${match.score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {match.score}% Match
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-1 rounded-full">Unscored</span>
                    )}
                  </div>
                  
                  <div className="mb-4 relative z-10">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Candidate</p>
                    <p className="font-display font-bold text-lg">{candidate?.name || 'Unknown'}</p>
                  </div>
                  
                  <div className="mb-6 relative z-10">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Target Role</p>
                    <p className="font-medium text-sm">{job?.title || 'Unknown'}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between text-sm pt-4 border-t border-white/5 relative z-10">
                    <span className="text-muted-foreground">Status: <span className="text-foreground capitalize">{match.status}</span></span>
                    <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                      {match.score ? "View Analysis" : "Run Analysis"} <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
          {matches?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No matches created yet. Pair a job and candidate to start analysis.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
