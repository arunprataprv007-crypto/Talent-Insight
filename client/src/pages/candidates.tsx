import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { useCandidates, useCreateCandidate } from "@/hooks/use-candidates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, UserCircle, Linkedin, Loader2, ChevronRight, Search, Sparkles, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCandidateSchema, type InsertCandidate } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function CandidatesPage() {
  const searchString = useSearch();
  const urlQuery = new URLSearchParams(searchString).get("q") || "";

  const [search, setSearch] = useState(urlQuery);
  const [activeSearch, setActiveSearch] = useState(urlQuery);
  const { data: candidates, isLoading } = useCandidates(activeSearch);

  useEffect(() => {
    if (urlQuery) { setSearch(urlQuery); setActiveSearch(urlQuery); }
  }, [urlQuery]);
  const createCandidate = useCreateCandidate();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<InsertCandidate>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: { name: "", linkedinUrl: "", headline: "", summary: "" }
  });

  const onSubmit = (data: InsertCandidate) => {
    createCandidate.mutate(data, {
      onSuccess: () => { setIsOpen(false); form.reset(); }
    });
  };

  const handleSearch = () => setActiveSearch(search);
  const clearSearch = () => { setSearch(""); setActiveSearch(""); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Talent Pool</h1>
          <p className="text-muted-foreground mt-1">Manage and review your sourced candidates.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="ai-button-gradient shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] glass-panel border-white/10">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Add Candidate Profile</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Jane Doe" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl><Input placeholder="https://linkedin.com/in/..." {...field} className="bg-background" value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="headline" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline</FormLabel>
                    <FormControl><Input placeholder="Senior Software Engineer at Tech Corp" {...field} className="bg-background" value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="summary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Summary (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Paste summary..." className="h-24 bg-background resize-none" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full ai-button-gradient" disabled={createCandidate.isPending}>
                  {createCandidate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Candidate"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Search Bar */}
      <Card className="p-4 glass-panel border-white/10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">AI Semantic Search</span>
            <Badge variant="secondary" className="text-[10px]">GPT-powered</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder='e.g. "React engineers with fintech experience" or "ML engineers at FAANG"'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-background/50 border-white/10"
              />
              {search && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="ai-button-gradient">
              {isLoading && activeSearch ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI Search
            </Button>
            <Button
              variant="outline"
              className="border-[#0077B5]/40 text-[#0077B5] hover:bg-[#0077B5]/10 hover:text-[#0077B5]"
              onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(search || "")}`, "_blank")}
            >
              <Linkedin className="w-4 h-4 mr-2" />
              Search LinkedIn
            </Button>
          </div>
          {activeSearch && (
            <p className="text-xs text-muted-foreground">
              Showing AI-filtered results for: <span className="text-primary font-medium">"{activeSearch}"</span>
              <button onClick={clearSearch} className="ml-2 underline hover:text-foreground">Clear</button>
            </p>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {activeSearch && <p className="text-sm text-muted-foreground">AI is searching your talent pool...</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates?.map((candidate) => (
            <Link key={candidate.id} href={`/candidates/${candidate.id}`} className="block group">
              <Card className="p-6 glass-panel border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-lg truncate">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{candidate.headline || "No headline provided"}</p>
                  </div>
                </div>

                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-xs text-[#0077B5] bg-[#0077B5]/10 hover:bg-[#0077B5]/20 px-2 py-1 rounded-md mb-4 transition-colors"
                  >
                    <Linkedin className="w-3 h-3 mr-1" /> View LinkedIn Profile
                  </a>
                )}

                <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                  <span>View Full Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            </Link>
          ))}
          {candidates?.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">
                {activeSearch ? `No candidates matched "${activeSearch}"` : "No candidates added yet."}
              </p>
              {activeSearch && (
                <p className="text-sm text-muted-foreground mt-1">
                  Try a broader query or{" "}
                  <button className="underline text-[#0077B5]" onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(activeSearch)}`, "_blank")}>
                    search LinkedIn
                  </button>{" "}instead.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
