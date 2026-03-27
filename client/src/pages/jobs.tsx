import { useState } from "react";
import { Link } from "wouter";
import { useJobs, useCreateJob, useUpdateJobStatus } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, ChevronRight, Sparkles, Loader2, ToggleLeft, ToggleRight, PauseCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, type InsertJob } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  active: { label: "Active", badge: "bg-green-500/20 text-green-400 border-green-500/30", icon: ToggleRight },
  closed: { label: "Closed", badge: "bg-red-500/20 text-red-400 border-red-500/30", icon: ToggleLeft },
  on_hold: { label: "On Hold", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: PauseCircle },
};

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const createJob = useCreateJob();
  const updateStatus = useUpdateJobStatus();
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

  const handleStatusChange = (jobId: number, status: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateStatus.mutate({ id: jobId, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Job Requisitions</h1>
          <p className="text-muted-foreground mt-1">Manage your open roles and track hiring status.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="ai-button-gradient" data-testid="btn-add-job">
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
                    <FormControl><Input placeholder="e.g. Senior Frontend Engineer" {...field} className="bg-background" data-testid="input-job-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl><Input placeholder="e.g. Acme Corp" {...field} className="bg-background" data-testid="input-job-company" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl><Textarea placeholder="Paste full JD here..." className="h-32 bg-background resize-none" {...field} data-testid="input-job-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background" data-testid="select-job-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full ai-button-gradient" disabled={createJob.isPending} data-testid="btn-save-job">
                  {createJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Job"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Summary */}
      {jobs && jobs.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = jobs.filter(j => j.status === key).length;
            return (
              <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
                <cfg.icon className="w-3.5 h-3.5" />
                {cfg.label}: {count}
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobs?.map((job) => {
            const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.active;
            return (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                <Card className="p-6 glass-panel border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col" data-testid={`card-job-${job.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-white/5 p-3 rounded-xl text-primary group-hover:bg-primary/20 transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      {job.parsedRequirements ? (
                        <span className="flex items-center text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-full">
                          <Sparkles className="w-3 h-3 mr-1" /> AI Parsed
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-1 rounded-full">Raw</span>
                      )}
                      <Badge className={`text-xs border ${statusCfg.badge}`}>{statusCfg.label}</Badge>
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{job.company}</p>

                  {/* Status toggle buttons */}
                  <div className="flex gap-1.5 mb-4" onClick={e => e.preventDefault()}>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={(e) => handleStatusChange(job.id, key, e)}
                        disabled={job.status === key || updateStatus.isPending}
                        data-testid={`status-${key}-${job.id}`}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs border transition-all duration-150 ${
                          job.status === key
                            ? `${cfg.badge} font-semibold`
                            : "border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground"
                        }`}
                      >
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between text-sm pt-4 border-t border-white/5">
                    <span className="text-muted-foreground text-xs">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
                      View <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
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
