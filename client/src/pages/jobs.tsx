import { useState } from "react";
import { Link } from "wouter";
import { useJobs, useCreateJob } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, type InsertJob } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const createJob = useCreateJob();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<InsertJob>({
    resolver: zodResolver(insertJobSchema),
    defaultValues: { title: "", company: "", description: "", status: "active" }
  });

  const onSubmit = (data: InsertJob) => {
    createJob.mutate(data, {
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
          <h1 className="text-3xl font-display font-bold">Job Requisitions</h1>
          <p className="text-muted-foreground mt-1">Manage and parse your open roles.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="ai-button-gradient">
              <Plus className="w-4 h-4 mr-2" /> Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] glass-panel border-white/10">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create New Job</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Senior Frontend Engineer" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl><Input placeholder="e.g. Acme Corp" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl><Textarea placeholder="Paste full JD here..." className="h-32 bg-background resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full ai-button-gradient" disabled={createJob.isPending}>
                  {createJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Job"}
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
          {jobs?.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
              <Card className="p-6 glass-panel border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-white/5 p-3 rounded-xl text-primary group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  {job.parsedRequirements ? (
                    <span className="flex items-center text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-full">
                      <Sparkles className="w-3 h-3 mr-1" /> AI Parsed
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-1 rounded-full">Raw</span>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg mb-1">{job.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{job.company}</p>
                <div className="mt-auto flex items-center justify-between text-sm pt-4 border-t border-white/5">
                  <span className="text-muted-foreground">Status: <span className="text-foreground capitalize">{job.status}</span></span>
                  <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                    View <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {jobs?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No jobs found. Add your first job description to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
