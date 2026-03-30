import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { useCandidates, useCreateCandidate } from "@/hooks/use-candidates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, UserCircle, Linkedin, Loader2, ChevronRight, Search, Sparkles, X, FileText, BrainCircuit, CheckCircle2, Upload, File } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCandidateSchema, type InsertCandidate } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function CvParserTab({ onCandidateCreated }: { onCandidateCreated: () => void }) {
  const [mode, setMode] = useState<"paste" | "file">("file");
  const [cvText, setCvText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const parseTextMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/candidates/parse-cv", { cvText }).then(r => r.json()),
    onSuccess: (data: any) => setParsed(data),
    onError: (e: any) => toast({ title: "Parse failed", description: e?.message || "Could not extract candidate data.", variant: "destructive" }),
  });

  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/candidates/parse-cv-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => setParsed(data),
    onError: (e: any) => toast({ title: "Parse failed", description: e.message || "Could not extract candidate data.", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/candidates", {
      name: parsed.name,
      headline: parsed.headline || "",
      summary: parsed.summary || "",
      linkedinUrl: parsed.linkedinUrl || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
    }).then(r => r.json()),
    onSuccess: (savedCandidate: any) => {
      if (parsed.skills || parsed.experience || parsed.education) {
        apiRequest("PATCH", `/api/candidates/${savedCandidate.id}`, {
          skills: parsed.skills || [],
          experience: parsed.experience || [],
          education: parsed.education || [],
        }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: "Candidate saved", description: `${parsed.name} added to talent pool.` });
      setParsed(null);
      setCvText("");
      setSelectedFile(null);
      onCandidateCreated();
    },
    onError: () => toast({ title: "Error", description: "Could not save candidate.", variant: "destructive" }),
  });

  const isParsing = parseTextMutation.isPending || parseFileMutation.isPending;

  const triggerFileParse = (file: File) => {
    setSelectedFile(file);
    setParsed(null);
    parseFileMutation.mutate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) triggerFileParse(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (!file) return;
    const allowed = [".pdf", ".doc", ".docx", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast({ title: "Unsupported file", description: "Please drop a PDF, DOCX, or TXT file.", variant: "destructive" });
      return;
    }
    triggerFileParse(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleParse = () => {
    if (mode === "file" && selectedFile) parseFileMutation.mutate(selectedFile);
    else if (mode === "paste" && cvText.trim()) parseTextMutation.mutate();
  };

  const canParse = (mode === "file" && !!selectedFile) || (mode === "paste" && !!cvText.trim());

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "file" ? "default" : "outline"}
          className={mode === "file" ? "ai-button-gradient" : "border-white/10"}
          onClick={() => { setMode("file"); setParsed(null); }}
          data-testid="btn-mode-file"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
        </Button>
        <Button
          size="sm"
          variant={mode === "paste" ? "default" : "outline"}
          className={mode === "paste" ? "ai-button-gradient" : "border-white/10"}
          onClick={() => { setMode("paste"); setParsed(null); }}
          data-testid="btn-mode-paste"
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Paste Text
        </Button>
      </div>

      {mode === "file" ? (
        <div className="space-y-3">
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-white/10 hover:border-primary/40"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnter={handleDragOver}
            data-testid="dropzone-cv"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-cv-file"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                {isParsing ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <File className="w-8 h-8 text-primary" />}
                <div className="text-left">
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{isParsing ? "Parsing with AI…" : `${(selectedFile.size / 1024).toFixed(0)} KB`}</p>
                </div>
                {!isParsing && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setParsed(null); }} className="ml-auto text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div>
                <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground/50"}`} />
                <p className="text-sm font-medium">{isDragging ? "Drop to upload" : "Drag & drop CV here, or click to browse"}</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT • Max 10 MB</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">Paste CV / Resume Text</label>
          <Textarea
            className="h-40 bg-background/50 border-white/10 resize-none font-mono text-xs"
            placeholder="Paste the full CV text here — name, experience, skills, education, contact details…"
            value={cvText}
            onChange={e => setCvText(e.target.value)}
            data-testid="input-cv-text"
          />
        </div>
      )}

      <Button
        className="ai-button-gradient w-full"
        disabled={!canParse || isParsing}
        onClick={handleParse}
        data-testid="btn-parse-cv"
      >
        {isParsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing CV…</> : <><BrainCircuit className="w-4 h-4 mr-2" />Parse with AI</>}
      </Button>

      {parsed && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
            <CheckCircle2 className="w-4 h-4" /> Extracted Data
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{parsed.name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Headline</p><p className="font-medium truncate">{parsed.headline || "—"}</p></div>
            {parsed.email && <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium truncate text-xs">{parsed.email}</p></div>}
            {parsed.phone && <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium text-xs">{parsed.phone}</p></div>}
          </div>
          {parsed.summary && <div><p className="text-xs text-muted-foreground mb-1">Summary</p><p className="text-sm text-muted-foreground line-clamp-3">{parsed.summary}</p></div>}
          {parsed.skills?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.skills.slice(0, 12).map((s: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
                {parsed.skills.length > 12 && <Badge variant="secondary" className="text-xs">+{parsed.skills.length - 12} more</Badge>}
              </div>
            </div>
          )}
          {parsed.experience?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Experience ({parsed.experience.length} roles)</p>
              <div className="space-y-1">
                {parsed.experience.slice(0, 3).map((e: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">• {e.title} @ {e.company}</p>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full ai-button-gradient" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} data-testid="btn-save-parsed">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Save to Talent Pool
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  const searchString = useSearch();
  const urlQuery = new URLSearchParams(searchString).get("q") || "";
  const [search, setSearch] = useState(urlQuery);
  const [activeSearch, setActiveSearch] = useState(urlQuery);
  const { data: candidates, isLoading } = useCandidates(activeSearch);
  useEffect(() => { if (urlQuery) { setSearch(urlQuery); setActiveSearch(urlQuery); } }, [urlQuery]);

  const createCandidate = useCreateCandidate();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState("cv");

  const form = useForm<InsertCandidate>({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: { name: "", linkedinUrl: "", headline: "", summary: "", email: "", phone: "" }
  });

  const onSubmit = (data: InsertCandidate) => {
    createCandidate.mutate(data, { onSuccess: () => { setIsOpen(false); form.reset(); } });
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
            <Button className="ai-button-gradient shrink-0" data-testid="btn-add-candidate">
              <Plus className="w-4 h-4 mr-2" /> Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px] glass-panel border-white/10">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Add Candidate to Talent Pool</DialogTitle>
            </DialogHeader>
            <Tabs value={dialogTab} onValueChange={setDialogTab} className="mt-2">
              <TabsList className="w-full bg-background/50">
                <TabsTrigger value="cv" className="flex-1" data-testid="tab-cv-parse">
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Parse CV
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1" data-testid="tab-manual">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cv" className="mt-4">
                <CvParserTab onCandidateCreated={() => setIsOpen(false)} />
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl><Input placeholder="Jane Doe" {...field} className="bg-background" data-testid="input-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input placeholder="jane@example.com" {...field} className="bg-background" value={field.value || ""} data-testid="input-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input placeholder="+44 7700 000000" {...field} className="bg-background" value={field.value || ""} data-testid="input-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl><Input placeholder="https://linkedin.com/in/..." {...field} className="bg-background" value={field.value || ""} data-testid="input-linkedin" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="headline" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headline</FormLabel>
                        <FormControl><Input placeholder="Senior Software Engineer" {...field} className="bg-background" value={field.value || ""} data-testid="input-headline" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="summary" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Summary</FormLabel>
                        <FormControl><Textarea placeholder="Paste LinkedIn summary or notes…" className="h-24 bg-background resize-none" {...field} value={field.value || ""} data-testid="input-summary" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full ai-button-gradient" disabled={createCandidate.isPending} data-testid="btn-save-candidate">
                      {createCandidate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Candidate"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Semantic Search */}
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
                placeholder='e.g. "React engineers with fintech experience"'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-background/50 border-white/10"
                data-testid="input-search"
              />
              {search && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="ai-button-gradient" data-testid="btn-search">
              {isLoading && activeSearch ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI Search
            </Button>
            <Button
              variant="outline"
              className="border-[#0077B5]/40 text-[#0077B5] hover:bg-[#0077B5]/10 hover:text-[#0077B5]"
              onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(search || "")}`, "_blank")}
              data-testid="btn-linkedin-search"
            >
              <Linkedin className="w-4 h-4 mr-2" /> Search LinkedIn
            </Button>
          </div>
          {activeSearch && (
            <p className="text-xs text-muted-foreground">
              AI results for: <span className="text-primary font-medium">"{activeSearch}"</span>
              <button onClick={clearSearch} className="ml-2 underline hover:text-foreground">Clear</button>
            </p>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {activeSearch && <p className="text-sm text-muted-foreground">AI is searching your talent pool…</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates?.map((candidate) => (
            <Link key={candidate.id} href={`/candidates/${candidate.id}`} className="block group">
              <Card className="p-6 glass-panel border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1" data-testid={`card-candidate-${candidate.id}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-lg truncate">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{candidate.headline || "No headline provided"}</p>
                  </div>
                </div>
                {candidate.email && (
                  <p className="text-xs text-muted-foreground mb-2 truncate">{candidate.email}</p>
                )}
                {candidate.sourcePlatform && (
                  <Badge variant="secondary" className="text-xs mb-3 capitalize">{candidate.sourcePlatform}</Badge>
                )}
                {candidate.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-xs text-[#0077B5] bg-[#0077B5]/10 hover:bg-[#0077B5]/20 px-2 py-1 rounded-md mb-4 transition-colors">
                    <Linkedin className="w-3 h-3 mr-1" /> LinkedIn Profile
                  </a>
                )}
                <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5 text-muted-foreground group-hover:text-primary transition-colors">
                  <span>View Profile</span>
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
              {!activeSearch && (
                <p className="text-sm text-muted-foreground mt-1">Use "Add Candidate" or upload a CV to get started.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
