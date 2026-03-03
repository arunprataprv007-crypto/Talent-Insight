import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Match, type InsertMatch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMatches(jobId?: number, candidateId?: number) {
  return useQuery({
    queryKey: [api.matches.list.path, jobId, candidateId],
    queryFn: async () => {
      let url = api.matches.list.path;
      const params = new URLSearchParams();
      if (jobId) params.append("jobId", jobId.toString());
      if (candidateId) params.append("candidateId", candidateId.toString());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return (await res.json()) as Match[];
    },
  });
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: [api.matches.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.matches.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch match");
      return (await res.json()) as Match;
    },
    enabled: !!id,
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMatch) => {
      const res = await fetch(api.matches.create.path, {
        method: api.matches.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create match");
      return (await res.json()) as Match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Created", description: "Candidate linked to job successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useAnalyzeMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.matches.generateAnalysis.path, { id });
      const res = await fetch(url, { method: api.matches.generateAnalysis.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to run AI analysis");
      return (await res.json()) as Match;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, id] });
      toast({ title: "AI Analysis Complete", description: "Scoring and InMail draft generated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.matches.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.matches.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return (await res.json()) as Match;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Status Updated" });
    },
  });
}
