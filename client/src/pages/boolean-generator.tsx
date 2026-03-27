import { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, Loader2, Copy, ExternalLink, CheckCircle2, X,
  Plus, Search, Linkedin, Github, Code2, BookOpen, RefreshCw,
  Info, ChevronDown, ChevronUp, Zap, FileText, Hash
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface TermBucket {
  jobTitles: string[];
  requiredSkills: string[];
  optionalSkills: string[];
  excludedTerms: string[];
}

interface GeneratedStrings {
  linkedin: string;
  xrayLinkedIn: string;
  xrayGitHub: string;
  indeed: string;
  stackOverflow: string;
}

const BUCKET_CONFIG = [
  {
    key: "jobTitles" as const,
    label: "Job Titles",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    removeColor: "hover:bg-blue-500/30",
    inputColor: "border-blue-500/30 focus:border-blue-400",
    description: "Role names & variations (e.g. \"Software Engineer\", \"SWE\", \"Developer\")",
    operator: "OR",
    icon: Hash,
    badgeColor: "blue",
  },
  {
    key: "requiredSkills" as const,
    label: "Required Skills",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    removeColor: "hover:bg-green-500/30",
    inputColor: "border-green-500/30 focus:border-green-400",
    description: "Must-have technologies, languages, tools — joined with AND",
    operator: "AND",
    icon: CheckCircle2,
    badgeColor: "green",
  },
  {
    key: "optionalSkills" as const,
    label: "Nice-to-Have Skills",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    removeColor: "hover:bg-yellow-500/30",
    inputColor: "border-yellow-500/30 focus:border-yellow-400",
    description: "Preferred skills — at least one must match",
    operator: "OR",
    icon: Zap,
    badgeColor: "yellow",
  },
  {
    key: "excludedTerms" as const,
    label: "Exclude Terms",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    removeColor: "hover:bg-red-500/30",
    inputColor: "border-red-500/30 focus:border-red-400",
    description: "Filter out unwanted profiles — joined with NOT",
    operator: "NOT",
    icon: X,
    badgeColor: "red",
  },
];

const PLATFORMS = [
  {
    key: "linkedin" as const,
    label: "LinkedIn Recruiter",
    icon: Linkedin,
    color: "text-[#0077B5]",
    bg: "bg-[#0077B5]/10 border-[#0077B5]/20",
    searchUrl: (s: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(s)}`,
    tip: "Paste directly into LinkedIn Recruiter search bar.",
  },
  {
    key: "xrayLinkedIn" as const,
    label: "Google X-Ray · LinkedIn",
    icon: Search,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    searchUrl: (s: string) => `https://www.google.com/search?q=${encodeURIComponent(s)}`,
    tip: "Search Google to find LinkedIn profiles without a Recruiter seat.",
  },
  {
    key: "xrayGitHub" as const,
    label: "Google X-Ray · GitHub",
    icon: Github,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    searchUrl: (s: string) => `https://www.google.com/search?q=${encodeURIComponent(s)}`,
    tip: "Find developers by their GitHub profiles and code.",
  },
  {
    key: "indeed" as const,
    label: "Indeed / Job Boards",
    icon: Search,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    searchUrl: (s: string) => `https://uk.indeed.com/jobs?q=${encodeURIComponent(s)}`,
    tip: "Works on Indeed, Reed, Totaljobs, and most boolean-enabled boards.",
  },
  {
    key: "stackOverflow" as const,
    label: "Stack Overflow Users",
    icon: Code2,
    color: "text-orange-300",
    bg: "bg-orange-400/10 border-orange-400/20",
    searchUrl: (s: string) => `https://www.google.com/search?q=${encodeURIComponent(s)}`,
    tip: "Discover developers via Stack Overflow profiles.",
  },
];

// ── Tag Input ──────────────────────────────────────────────────────────────────
function TagInput({
  config,
  tags,
  onAdd,
  onRemove,
}: {
  config: (typeof BUCKET_CONFIG)[0];
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  const [val, setVal] = useState("");

  const handleAdd = () => {
    const clean = val.trim().replace(/^["']|["']$/g, "");
    if (clean && !tags.includes(clean)) {
      onAdd(clean);
      setVal("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAdd(); }
    if (e.key === "Backspace" && !val && tags.length) onRemove(tags[tags.length - 1]);
  };

  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${config.color.split(" ").slice(0, 1).join(" ")}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold">{config.label}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 h-4 ${config.color}`}>
              {config.operator}
            </Badge>
            {tags.length > 0 && (
              <span className="text-xs text-muted-foreground">{tags.length} term{tags.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
          <div className={`min-h-10 flex flex-wrap gap-1.5 p-2 rounded-lg border bg-background/30 ${config.inputColor}`}>
            <AnimatePresence>
              {tags.map(tag => (
                <motion.span
                  key={tag}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-mono ${config.color} cursor-default`}
                >
                  {tag}
                  <button onClick={() => onRemove(tag)} className={`rounded p-0.5 ${config.removeColor} transition-colors`} data-testid={`remove-tag-${tag}`}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <Input
              className="h-6 min-w-[120px] flex-1 border-0 bg-transparent p-0 text-xs focus-visible:ring-0 placeholder:text-muted-foreground/50"
              placeholder="Type and press Enter…"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => val.trim() && handleAdd()}
              data-testid={`input-tag-${config.key}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── String Card ────────────────────────────────────────────────────────────────
function StringCard({ platform, value }: { platform: (typeof PLATFORMS)[0]; value: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  const Icon = platform.icon;
  const empty = !value || value.trim() === "site:linkedin.com/in" || value.trim() === "site:github.com" || value.trim() === "site:stackoverflow.com/users";

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: `Copied ${platform.label} string` });
  };

  return (
    <Card className={`border ${platform.bg} glass-panel overflow-hidden`} data-testid={`card-platform-${platform.key}`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${platform.color}`} />
        <span className={`text-sm font-semibold ${platform.color}`}>{platform.label}</span>
        <div className="flex-1" />
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2">
              {empty ? (
                <p className="text-xs text-muted-foreground italic py-2">Add terms above to generate this string.</p>
              ) : (
                <>
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs font-mono text-blue-200 break-all leading-relaxed">{value}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{platform.tip}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copy} data-testid={`btn-copy-${platform.key}`}>
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                      <a href={platform.searchUrl(value)} target="_blank" rel="noopener noreferrer" data-testid={`btn-search-${platform.key}`}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Search Now
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Boolean Generator Page ─────────────────────────────────────────────────────
export default function BooleanGeneratorPage() {
  const { toast } = useToast();

  const [jdText, setJdText] = useState("");
  const [terms, setTerms] = useState<TermBucket>({
    jobTitles: [],
    requiredSkills: [],
    optionalSkills: [],
    excludedTerms: [],
  });
  const [generatedStrings, setGeneratedStrings] = useState<GeneratedStrings | null>(null);
  const [extractedMeta, setExtractedMeta] = useState<{ seniority?: string; industry?: string } | null>(null);

  // Real-time local boolean builder (no API call needed)
  const liveStrings = useMemo<GeneratedStrings>(() => {
    const { jobTitles: jt, requiredSkills: rs, optionalSkills: os, excludedTerms: et } = terms;
    const q = (s: string) => `"${s}"`;
    const titlePart = jt.length ? `(${jt.map(q).join(" OR ")})` : "";
    const reqPart = rs.length ? rs.map(q).join(" AND ") : "";
    const optPart = os.length ? `(${os.map(q).join(" OR ")})` : "";
    const exPart = et.length ? et.map(e => `NOT ${q(e)}`).join(" ") : "";

    const linkedin = [titlePart, reqPart, optPart, exPart].filter(Boolean).join(" AND ");
    const xrayLinkedIn = `site:linkedin.com/in ${[titlePart, reqPart].filter(Boolean).join(" ")}`.trim();
    const xrayGitHub = `site:github.com ${[rs.slice(0, 5).map(q).join(" "), titlePart].filter(Boolean).join(" ")}`.trim();
    const indeed = [titlePart, rs.map(q).join(" "), optPart, exPart].filter(Boolean).join(" ");
    const stackOverflow = `site:stackoverflow.com/users ${rs.slice(0, 4).map(q).join(" OR ")}`;

    return { linkedin, xrayLinkedIn, xrayGitHub, indeed, stackOverflow };
  }, [terms]);

  const displayStrings = generatedStrings || liveStrings;

  const aiExtract = useMutation({
    mutationFn: () => apiRequest("POST", "/api/boolean/generate", {
      jdText,
      jobTitles: terms.jobTitles,
      requiredSkills: terms.requiredSkills,
      optionalSkills: terms.optionalSkills,
      excludedTerms: terms.excludedTerms,
    }),
    onSuccess: (data: any) => {
      setTerms({
        jobTitles: data.terms?.jobTitles || [],
        requiredSkills: data.terms?.requiredSkills || [],
        optionalSkills: data.terms?.optionalSkills || [],
        excludedTerms: data.terms?.excludedTerms || [],
      });
      setGeneratedStrings(data.strings);
      setExtractedMeta({ seniority: data.terms?.seniority, industry: data.terms?.industry });
      toast({ title: "AI extraction complete", description: `Extracted ${(data.terms?.jobTitles?.length || 0) + (data.terms?.requiredSkills?.length || 0)} terms from JD.` });
    },
    onError: () => toast({ title: "AI extraction failed", variant: "destructive" }),
  });

  const addTerm = useCallback((bucket: keyof TermBucket, term: string) => {
    setTerms(prev => ({ ...prev, [bucket]: [...prev[bucket], term] }));
    setGeneratedStrings(null);
  }, []);

  const removeTerm = useCallback((bucket: keyof TermBucket, term: string) => {
    setTerms(prev => ({ ...prev, [bucket]: prev[bucket].filter(t => t !== term) }));
    setGeneratedStrings(null);
  }, []);

  const clearAll = () => {
    setTerms({ jobTitles: [], requiredSkills: [], optionalSkills: [], excludedTerms: [] });
    setGeneratedStrings(null);
    setJdText("");
    setExtractedMeta(null);
  };

  const totalTerms = terms.jobTitles.length + terms.requiredSkills.length + terms.optionalSkills.length + terms.excludedTerms.length;
  const hasContent = totalTerms > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Search className="w-7 h-7 text-primary" /> Boolean Search Generator
          </h1>
          <p className="text-muted-foreground mt-1">Build precise boolean strings from a JD or manually. Outputs ready for 5 platforms.</p>
        </div>
        {hasContent && (
          <Button variant="outline" size="sm" onClick={clearAll} className="border-white/10 shrink-0" data-testid="btn-clear-all">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Clear All
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Input ── */}
        <div className="lg:col-span-3 space-y-5">
          <Tabs defaultValue="jd">
            <TabsList className="bg-card border border-white/5 w-full">
              <TabsTrigger value="jd" className="flex-1" data-testid="tab-jd-input">
                <FileText className="w-4 h-4 mr-2" /> From Job Description
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1" data-testid="tab-manual-input">
                <Plus className="w-4 h-4 mr-2" /> Manual Builder
              </TabsTrigger>
            </TabsList>

            {/* JD Input Tab */}
            <TabsContent value="jd" className="mt-4">
              <Card className="p-5 glass-panel border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  <span>Paste a job description and AI will extract all search terms automatically.</span>
                </div>
                <Textarea
                  className="h-52 bg-background/50 border-white/10 resize-none text-sm"
                  placeholder="Paste the full job description here — job title, responsibilities, required skills, nice-to-haves, qualifications…"
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  data-testid="textarea-jd"
                />
                <Button
                  className="w-full ai-button-gradient"
                  disabled={!jdText.trim() || aiExtract.isPending}
                  onClick={() => aiExtract.mutate()}
                  data-testid="btn-ai-extract"
                >
                  {aiExtract.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting terms…</>
                    : <><BrainCircuit className="w-4 h-4 mr-2" />Extract Terms with AI</>}
                </Button>

                {extractedMeta && (extractedMeta.seniority || extractedMeta.industry) && (
                  <div className="flex gap-2 pt-1">
                    {extractedMeta.seniority && <Badge variant="secondary" className="text-xs">{extractedMeta.seniority}</Badge>}
                    {extractedMeta.industry && <Badge variant="secondary" className="text-xs capitalize">{extractedMeta.industry}</Badge>}
                  </div>
                )}

                {hasContent && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>Terms extracted below. Switch to <strong>Manual Builder</strong> tab to edit individual terms, or generate strings directly.</span>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Manual Builder Tab */}
            <TabsContent value="manual" className="mt-4">
              <Card className="p-5 glass-panel border-white/5 space-y-5">
                {BUCKET_CONFIG.map(config => (
                  <TagInput
                    key={config.key}
                    config={config}
                    tags={terms[config.key]}
                    onAdd={t => addTerm(config.key, t)}
                    onRemove={t => removeTerm(config.key, t)}
                  />
                ))}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Term Summary (always visible when there are terms) */}
          {hasContent && (
            <Card className="p-4 glass-panel border-white/5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Term Summary</p>
              <div className="space-y-2">
                {BUCKET_CONFIG.map(c => {
                  const tags = terms[c.key];
                  if (!tags.length) return null;
                  return (
                    <div key={c.key} className="flex items-start gap-2">
                      <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${c.color}`}>{c.operator}</Badge>
                      <div className="flex flex-wrap gap-1">
                        {tags.map(t => (
                          <span key={t} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0 rounded border font-mono ${c.color}`}>
                            {t}
                            <button onClick={() => removeTerm(c.key, t)} className="opacity-60 hover:opacity-100">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: Output ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Generated Strings</h3>
            {hasContent && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  const allStrings = PLATFORMS.map(p => `--- ${p.label} ---\n${displayStrings[p.key]}`).join("\n\n");
                  navigator.clipboard.writeText(allStrings);
                  toast({ title: "All strings copied to clipboard" });
                }}
                data-testid="btn-copy-all"
              >
                <Copy className="w-3 h-3 mr-1" /> Copy All
              </Button>
            )}
          </div>

          {!hasContent ? (
            <Card className="p-8 glass-panel border-white/5 border-dashed flex flex-col items-center justify-center text-center gap-3">
              <Search className="w-10 h-10 text-primary/30" />
              <p className="text-sm text-muted-foreground">Add terms in the builder or paste a JD to generate boolean strings.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {PLATFORMS.map(platform => (
                <StringCard key={platform.key} platform={platform} value={displayStrings[platform.key]} />
              ))}
            </div>
          )}

          {/* Tips */}
          <Card className="p-4 glass-panel border-white/5 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Boolean Tips
            </p>
            <ul className="text-xs text-muted-foreground space-y-2">
              {[
                { tip: "Use AND to make skills mandatory between groups." },
                { tip: "Use OR inside parentheses for alternatives (e.g. titles or synonyms)." },
                { tip: "NOT removes profiles with unwanted terms." },
                { tip: "Wrap multi-word terms in quotes: \"React Native\"." },
                { tip: "X-Ray searches bypass LinkedIn seat limits via Google." },
              ].map((item, i) => (
                <li key={i} className="flex gap-1.5"><span className="text-primary shrink-0">•</span>{item.tip}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
