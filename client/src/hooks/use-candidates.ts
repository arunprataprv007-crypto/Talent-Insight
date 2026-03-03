import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Candidate, type InsertCandidate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCandidates(search?: string) {
  return useQuery({
    queryKey: [api.candidates.list.path, search],
    queryFn: async () => {
      const url = search 
        ? `${api.candidates.list.path}?search=${encodeURIComponent(search)}`
        : api.candidates.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return (await res.json()) as Candidate[];
    },
  });
}

export function useCandidate(id: number) {
  return useQuery({
    queryKey: [api.candidates.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.candidates.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch candidate");
      return (await res.json()) as Candidate;
    },
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCandidate) => {
      const res = await fetch(api.candidates.create.path, {
        method: api.candidates.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add candidate");
      return (await res.json()) as Candidate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.candidates.list.path] });
      toast({ title: "Candidate Added", description: "Candidate profile imported successfully." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
