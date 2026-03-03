import { useState } from "react";
import { Link } from "wouter";
import { useCandidates, useCreateCandidate } from "@/hooks/use-candidates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, UserCircle, Linkedin, Loader2, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCandidateSchema, type InsertCandidate } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function CandidatesPage() {
  const { data: candidates, isLoading } = useCandidates();
  const createCandidate = useCreateCandidate();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<InsertCandidate>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: { name: "", linkedinUrl: "", headline: "", summary: "" }
  });

  const onSubmit = (data: InsertCandidate) => {
    createCandidate.mutate(data, {
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
          <h1 className="text-3xl font-display font-bold">Talent Pool</h1>
          <p className="text-muted-foreground mt-1">Manage and review your sourced candidates.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="ai-button-gradient">
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

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
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
                  <div className="inline-flex items-center text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md mb-4">
                    <Linkedin className="w-3 h-3 mr-1" /> Profile Link
                  </div>
                )}

                <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                  <span>View Full Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            </Link>
          ))}
          {candidates?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No candidates added yet. Add a profile to start matching.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
