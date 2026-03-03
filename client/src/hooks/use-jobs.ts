import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Job, type InsertJob } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const res = await fetch(api.jobs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return (await res.json()) as Job[];
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.jobs.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      return (await res.json()) as Job;
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertJob) => {
      const res = await fetch(api.jobs.create.path, {
        method: api.jobs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create job");
      return (await res.json()) as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      toast({ title: "Job Created", description: "Job profile has been added successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useParseJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.jobs.parse.path, { id });
      const res = await fetch(url, { method: api.jobs.parse.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to parse job requirements");
      return (await res.json()) as Job;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.get.path, id] });
      toast({ title: "AI Analysis Complete", description: "Job requirements parsed and boolean strings generated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
