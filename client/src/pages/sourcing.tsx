import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobs } from "@/hooks/use-jobs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search, ExternalLink, Plus, CheckCircle2, XCircle, UserPlus,
  Loader2, Globe, Zap, Building2, MapPin, PoundSterling, RefreshCw
} from "lucide-react";
import { SiLinkedin, SiIndeed } from "react-icons/si";
import type { Job, SourcedLead } from "@shared/schema";

const PLATFORMS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    hasApi: false,
    icon: SiLinkedin,
    searchUrl: (q: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}&origin=GLOBAL_SEARCH_HEADER`,
    description: "Search LinkedIn's talent pool by skills and job title.",
  },
  {
    id: "indeed",
    name: "Indeed",
    color: "#003A9B",
    hasApi: false,
    icon: SiIndeed,
    searchUrl: (q: string) => `https://uk.indeed.com/resumes?q=${encodeURIComponent(q)}&l=United+Kingdom`,
    description: "Find CVs of active job seekers on Indeed.",
  },
  {
    id: "adzuna",
    name: "Adzuna",
    color: "#E84C3D",
    hasApi: true,
    icon: null,
    searchUrl: (q: string) => `https://www.adzuna.co.uk/search?q=${encodeURIComponent(q)}`,
    description: "Live job market search via Adzuna API.",
  },
  {
    id: "jobsite",
    name: "Jobsite",
    color: "#004B93",
    hasApi: false,
    icon: null,
    searchUrl: (q: string) => `https://www.jobsite.co.uk/jobs/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
    description: "Browse active candidates on Jobsite.",
  },
  {
    id: "totaljobs",
    name: "Totaljobs",
    color: "#FF6900",
    hasApi: false,
    icon: null,
    searchUrl: (q: string) => `https://www.totaljobs.com/jobs/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
    description: "Search the Totaljobs candidate database.",
  },
  {
    id: "cvlibrary",
    name: "CV-Library",
    color: "#00A651",
    hasApi: false,
    icon: null,
    searchUrl: (q: string) => `https://www.cv-library.co.uk/search-jobs?q=${encodeURIComponent(q)}&geo=United+Kingdom`,
    description: "Access millions of CVs on CV-Library.",
  },
  {
    id: "reed",
    name: "Reed.co.uk",
    color: "#CC0000",
    hasApi: true,
    icon: null,
    searchUrl: (q: string) => `https://www.reed.co.uk/jobs/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
    description: "Live search via Reed's job board API.",
  },
];

function PlatformIcon({ platform }: { platform: typeof PLATFORMS[0] }) {
  if (platform.icon) {
    const Icon = platform.icon;
    return <Icon style={{ color: platform.color }} className="w-6 h-6" />;
  }
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
      style={{ backgroundColor: platform.color }}
    >
      {platform.name[0]}
    </div>
  );
}

function LiveSearchResult({ result, platform, onSave }: { result: any; platform: string; onSave: (r: any) => void }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{result.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            {result.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{result.company}</span>}
            {result.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{result.location}</span>}
            {result.salary && <span className="flex items-center gap-1"><PoundSterling className="w-3 h-3" />{result.salary}</span>}
          </div>
          {result.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{result.description}</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => window.open(result.url, "_blank")}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" className="h-7 px-2 ai-button-gradient" onClick={() => onSave(result)} data-testid={`btn-save-lead-${result.id}`}>
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddLeadDialog({ defaultPlatform, onAdded }: { defaultPlatform?: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ platform: defaultPlatform || "linkedin", name: "", headline: "", profileUrl: "", summary: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/sourcing/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sourcing/leads"] });
      toast({ title: "Lead saved", description: "Candidate added to your sourcing pipeline." });
      setOpen(false);
      setForm({ platform: defaultPlatform || "linkedin", name: "", headline: "", profileUrl: "", summary: "" });
      onAdded();
    },
    onError: () => toast({ title: "Error", description: "Failed to save lead.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ai-button-gradient" data-testid="btn-add-lead">
          <Plus className="w-4 h-4 mr-2" /> Add Lead Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display">Save a Candidate Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
              <SelectTrigger data-testid="select-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-lead-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Headline / Job Title</Label>
            <Input placeholder="Senior React Developer" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} data-testid="input-lead-headline" />
          </div>
          <div className="space-y-1.5">
            <Label>Profile URL</Label>
            <Input placeholder="https://linkedin.com/in/..." value={form.profileUrl} onChange={e => setForm(f => ({ ...f, profileUrl: e.target.value }))} data-testid="input-lead-url" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes / Summary</Label>
            <Textarea placeholder="Brief notes about this candidate..." value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={3} data-testid="input-lead-summary" />
          </div>
          <Button
            className="w-full ai-button-gradient"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate(form)}
            data-testid="btn-submit-lead"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Save Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SourcingPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("platforms");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveSearchPlatform, setLiveSearchPlatform] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const selectedJob = jobs.find((j: Job) => String(j.id) === selectedJobId);

  const { data: config } = useQuery({
    queryKey: ["/api/sourcing/config"],
    queryFn: async () => {
      const res = await fetch("/api/sourcing/config", { credentials: "include" });
      return res.json() as Promise<{ adzunaConfigured: boolean; reedConfigured: boolean }>;
    },
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["/api/sourcing/leads"],
    queryFn: async () => {
      const res = await fetch("/api/sourcing/leads", { credentials: "include" });
      return res.json() as Promise<SourcedLead[]>;
    },
  });

  const importMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/sourcing/leads/${id}/import`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sourcing/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: "Candidate imported", description: "Lead has been added to your candidate pool." });
    },
    onError: () => toast({ title: "Error", description: "Failed to import candidate.", variant: "destructive" }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/sourcing/leads/${id}/dismiss`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sourcing/leads"] }),
    onError: () => toast({ title: "Error", description: "Failed to dismiss lead.", variant: "destructive" }),
  });

  const saveFromApiResult = useMutation({
    mutationFn: (data: { platform: string; name: string; headline: string; profileUrl: string; summary: string }) =>
      apiRequest("POST", "/api/sourcing/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sourcing/leads"] });
      toast({ title: "Lead saved", description: "Candidate added to your pipeline." });
    },
  });

  const getSearchQuery = () => {
    if (searchQuery) return searchQuery;
    if (selectedJob?.parsedRequirements && Array.isArray(selectedJob.parsedRequirements)) {
      return (selectedJob.parsedRequirements as string[]).slice(0, 5).join(" OR ");
    }
    return selectedJob?.title || "";
  };

  const handleLiveSearch = async (platformId: string) => {
    const q = getSearchQuery();
    if (!q) {
      toast({ title: "No search query", description: "Select a job or enter a keyword to search.", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    setLiveSearchPlatform(platformId);
    setLiveResults([]);
    try {
      const res = await fetch(`/api/sourcing/search?platform=${platformId}&query=${encodeURIComponent(q)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLiveResults(data.results || []);
      setLiveCount(data.count || 0);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenOnPlatform = (platform: typeof PLATFORMS[0]) => {
    const q = getSearchQuery();
    if (!q) {
      toast({ title: "No search query", description: "Select a job or enter a keyword first.", variant: "destructive" });
      return;
    }
    window.open(platform.searchUrl(q), "_blank");
  };

  const isApiConfigured = (platformId: string) => {
    if (platformId === "adzuna") return config?.adzunaConfigured;
    if (platformId === "reed") return config?.reedConfigured;
    return false;
  };

  const activePlatform = PLATFORMS.find(p => p.id === liveSearchPlatform);
  const newLeads = leads.filter(l => l.status === "new");
  const importedLeads = leads.filter(l => l.status === "imported");
  const dismissedLeads = leads.filter(l => l.status === "dismissed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" /> Candidate Sourcing
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Find and import candidates from 7 job platforms.</p>
        </div>
        <AddLeadDialog onAdded={() => setActiveTab("pipeline")} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="bg-card border-white/10" data-testid="select-job">
              <SelectValue placeholder={jobsLoading ? "Loading jobs…" : "Filter by job (optional)"} />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j: Job) => (
                <SelectItem key={j.id} value={String(j.id)}>{j.title} — {j.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-card border-white/10"
            placeholder="Override search keywords…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            data-testid="input-search-query"
          />
        </div>
      </div>

      {selectedJob?.parsedRequirements && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Auto-keywords from AI parse:</span>
          {(selectedJob.parsedRequirements as string[]).slice(0, 8).map((req, i) => (
            <Badge key={i} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/20" onClick={() => setSearchQuery(req)} data-testid={`badge-keyword-${i}`}>
              {req}
            </Badge>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-white/5">
          <TabsTrigger value="platforms" data-testid="tab-platforms">Platforms</TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-live">
            Live Search
            {liveResults.length > 0 && <Badge className="ml-1.5 text-xs h-4 px-1">{liveResults.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">
            Pipeline
            {newLeads.length > 0 && <Badge className="ml-1.5 text-xs h-4 px-1 bg-primary/80">{newLeads.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── PLATFORMS TAB ── */}
        <TabsContent value="platforms" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PLATFORMS.map(platform => {
              const apiOk = isApiConfigured(platform.id);
              return (
                <Card key={platform.id} className="p-4 glass-panel border-white/5 flex flex-col gap-3" data-testid={`card-platform-${platform.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PlatformIcon platform={platform} />
                      <span className="font-semibold text-sm">{platform.name}</span>
                    </div>
                    {platform.hasApi && (
                      <Badge variant={apiOk ? "default" : "secondary"} className={`text-xs ${apiOk ? "bg-green-500/20 text-green-400 border-green-500/30" : "opacity-60"}`}>
                        {apiOk ? "API On" : "API Off"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex-1">{platform.description}</p>
                  <div className="flex gap-2">
                    {platform.hasApi && (
                      <Button
                        size="sm"
                        className="flex-1 ai-button-gradient"
                        disabled={!apiOk}
                        onClick={() => { handleLiveSearch(platform.id); setActiveTab("live"); }}
                        data-testid={`btn-live-search-${platform.id}`}
                        title={!apiOk ? `Configure ${platform.name} API keys in environment secrets` : ""}
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" /> Live Search
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={platform.hasApi ? "px-2.5" : "flex-1"}
                      onClick={() => handleOpenOnPlatform(platform)}
                      data-testid={`btn-open-${platform.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {!platform.hasApi && <span className="ml-1.5">Search</span>}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 p-4 rounded-xl border border-white/5 bg-card/30 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/70">API Integration Setup</p>
            <p>To enable live in-app search for <strong>Adzuna</strong>, add <code className="bg-white/10 px-1 rounded">ADZUNA_APP_ID</code> and <code className="bg-white/10 px-1 rounded">ADZUNA_APP_KEY</code> to your environment secrets.</p>
            <p>For <strong>Reed.co.uk</strong>, add <code className="bg-white/10 px-1 rounded">REED_API_KEY</code>. All other platforms open in-browser with your search pre-filled.</p>
          </div>
        </TabsContent>

        {/* ── LIVE SEARCH TAB ── */}
        <TabsContent value="live" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            {activePlatform && (
              <div className="flex items-center gap-2">
                <PlatformIcon platform={activePlatform} />
                <span className="font-semibold">{activePlatform.name}</span>
                {liveCount > 0 && <span className="text-xs text-muted-foreground">({liveCount.toLocaleString()} total results)</span>}
              </div>
            )}
            {(isSearching || liveResults.length > 0) && (
              <Button size="sm" variant="outline" onClick={() => handleLiveSearch(liveSearchPlatform!)} disabled={isSearching} data-testid="btn-refresh-search">
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Searching…
            </div>
          )}

          {!isSearching && liveResults.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a platform with API enabled from the Platforms tab to run a live search.</p>
            </div>
          )}

          {!isSearching && liveResults.length > 0 && (
            <div className="space-y-2">
              {liveResults.map((r, i) => (
                <LiveSearchResult
                  key={r.id || i}
                  result={r}
                  platform={liveSearchPlatform || ""}
                  onSave={(result) => {
                    saveFromApiResult.mutate({
                      platform: liveSearchPlatform || "",
                      name: result.company || result.title,
                      headline: result.title,
                      profileUrl: result.url,
                      summary: result.description?.slice(0, 500) || "",
                    });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── PIPELINE TAB ── */}
        <TabsContent value="pipeline" className="mt-4">
          {leadsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No leads yet. Start sourcing from the Platforms tab or add manually.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {newLeads.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">New ({newLeads.length})</h3>
                  <div className="space-y-2">
                    {newLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onImport={() => importMutation.mutate(lead.id)} onDismiss={() => dismissMutation.mutate(lead.id)} importing={importMutation.isPending} />
                    ))}
                  </div>
                </div>
              )}
              {importedLeads.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Imported ({importedLeads.length})</h3>
                  <div className="space-y-2">
                    {importedLeads.map(lead => <LeadCard key={lead.id} lead={lead} readonly />)}
                  </div>
                </div>
              )}
              {dismissedLeads.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 opacity-50">Dismissed ({dismissedLeads.length})</h3>
                  <div className="space-y-2 opacity-50">
                    {dismissedLeads.map(lead => <LeadCard key={lead.id} lead={lead} readonly />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeadCard({ lead, onImport, onDismiss, importing, readonly }: {
  lead: SourcedLead;
  onImport?: () => void;
  onDismiss?: () => void;
  importing?: boolean;
  readonly?: boolean;
}) {
  const platform = PLATFORMS.find(p => p.id === lead.platform);
  return (
    <div className="p-3.5 rounded-xl bg-card/50 border border-white/5 flex items-center gap-4" data-testid={`card-lead-${lead.id}`}>
      <div className="shrink-0">
        {platform ? <PlatformIcon platform={platform} /> : <Globe className="w-5 h-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          {platform && <Badge variant="secondary" className="text-xs shrink-0">{platform.name}</Badge>}
        </div>
        {lead.headline && <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.headline}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {lead.profileUrl && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(lead.profileUrl!, "_blank")} data-testid={`btn-profile-${lead.id}`}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        )}
        {!readonly && (
          <>
            <Button size="sm" className="h-7 px-2 ai-button-gradient" onClick={onImport} disabled={importing} data-testid={`btn-import-${lead.id}`}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Import</>}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDismiss} data-testid={`btn-dismiss-${lead.id}`}>
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
        {readonly && lead.status === "imported" && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Imported</Badge>
        )}
      </div>
    </div>
  );
}
