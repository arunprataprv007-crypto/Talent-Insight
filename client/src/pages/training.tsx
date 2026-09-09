import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, CheckCircle2, Circle, ChevronDown, ChevronUp, Search,
  Copy, Users, Briefcase, Scale, Code2, MessageSquare, BarChart3,
  Wrench, Star, FileText, GraduationCap, ClipboardList, X, PlayCircle, Download, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Data ───────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "intro",
    icon: GraduationCap,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "1. Introduction",
    content: [
      {
        type: "text" as const,
        text: "Welcome to the IT Recruitment team! This manual is designed to help new joiners understand the UK IT recruitment landscape, processes, tools, compliance requirements, and best practices. It will act as your go-to reference during your onboarding period and throughout your recruiting journey.",
      },
    ],
  },
  {
    id: "market",
    icon: Briefcase,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    title: "2. UK IT Recruitment Market",
    subsections: [
      {
        title: "2.1 Key Sectors in IT",
        items: [
          "Software Development (Java, .NET, Python, JavaScript)",
          "Cloud & DevOps (AWS, Azure, GCP)",
          "Cybersecurity",
          "Data & Analytics (Data Engineers, Data Scientists)",
          "Infrastructure & Networks",
          "ERP & CRM (SAP, Oracle, Salesforce)",
          "Product & Project Management",
          "QA & Testing",
        ],
      },
      {
        title: "2.2 Contract vs Permanent Hiring",
        table: {
          headers: ["Type", "Duration", "Key Note", "Hiring Speed"],
          rows: [
            ["Contract", "3–12 months", "IR35 regulations apply", "Fast"],
            ["Permanent", "Long-term", "Benefits are key attraction", "1–3 month notice"],
          ],
        },
      },
      {
        title: "2.3 Job Levels",
        items: [
          "Junior / Entry-level",
          "Mid-level",
          "Senior / Lead",
          "Manager / Principal / Architect",
          "Director / Head of IT / CTO",
        ],
      },
    ],
  },
  {
    id: "lifecycle",
    icon: ClipboardList,
    color: "text-green-400",
    bg: "bg-green-400/10",
    title: "3. Recruitment Lifecycle",
    subsections: [
      {
        title: "3.1 Intake Call / Job Qualification",
        items: [
          "Gather job requirements",
          "Understand tech stack clearly",
          "Ask about team structure",
          "Assess urgency & hiring timeline",
          "Understand budget & salary/contract rate expectations",
        ],
      },
      {
        title: "3.2 Sourcing Candidates",
        items: [
          "LinkedIn Recruiter",
          "Job boards (Indeed, CWJobs, Totaljobs, Jobserve)",
          "Internal database / CRM",
          "Referrals",
          "GitHub, StackOverflow (for developers)",
        ],
      },
      {
        title: "3.3 Screening Candidates",
        items: [
          "Technical skills match",
          "Communication skills",
          "UK work authorisation (visa requirements)",
          "Current & expected salary/rate",
          "Notice period",
          "Reason for job change",
        ],
      },
      {
        title: "3.4 Shortlisting & Submission",
        items: [
          "Provide formatted CV",
          "Add candidate summary",
          "Highlight technical fit & key skills",
          "Check alignment with client job specs",
        ],
      },
      {
        title: "3.5 Interview Management",
        items: [
          "Schedule interviews with hiring managers",
          "Prepare candidates (interview format, expectations)",
          "Follow-up after interviews",
        ],
      },
      {
        title: "3.6 Offer & Negotiation",
        items: [
          "Discuss salary/rate expectations upfront",
          "Confirm holiday/benefits (permanent roles)",
          "For contractors, clarify IR35 status",
          "Manage counteroffers",
        ],
      },
      {
        title: "3.7 Onboarding",
        items: [
          "Share onboarding documents",
          "Confirm start date",
          "Maintain contact until Day 1",
        ],
      },
    ],
  },
  {
    id: "technical",
    icon: Code2,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    title: "4. Technical Knowledge",
    subsections: [
      {
        title: "4.1 Popular Technologies",
        table: {
          headers: ["Category", "Technologies"],
          rows: [
            ["Frontend", "React, Angular, Vue"],
            ["Backend", "Java, C#, Node.js, Python"],
            ["Databases", "SQL Server, MySQL, MongoDB, PostgreSQL"],
            ["Cloud", "AWS, Azure, GCP"],
            ["DevOps", "Docker, Kubernetes, Terraform, Jenkins"],
            ["Testing", "Selenium, Cypress, Manual QA"],
          ],
        },
      },
      {
        title: "4.2 Understanding Job Descriptions",
        items: [
          "Must-have skills",
          "Good-to-have skills",
          "Responsibilities",
          "Team/environment",
          "Seniority level",
        ],
      },
    ],
  },
  {
    id: "compliance",
    icon: Scale,
    color: "text-red-400",
    bg: "bg-red-400/10",
    title: "5. Compliance & Legal (UK)",
    subsections: [
      {
        title: "5.1 Right to Work Checks",
        items: [
          "UK passport or residence permit",
          "Skilled Worker Visa",
          "Pre-settled / Settled Status",
        ],
      },
      {
        title: "5.2 IR35 for Contractors",
        items: [
          "Determines if contractor is inside or outside IR35",
          "Impacts tax and pay structure",
          "Important for contract negotiations",
        ],
      },
      {
        title: "5.3 GDPR Compliance",
        items: [
          "Always get consent before storing CVs",
          "Do not share personal data without permission",
          "Use secure channels for documents",
        ],
      },
    ],
  },
  {
    id: "boolean",
    icon: Search,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    title: "6. Boolean Search Techniques",
    content: [
      {
        type: "text" as const,
        text: "Boolean search strings are used to find the right candidates on job boards, LinkedIn Recruiter, and via Google X-Ray searches. Combine operators to narrow or broaden results.",
      },
      {
        type: "code" as const,
        label: "Example Boolean String",
        code: '(Java OR "Java Developer" OR "Backend Developer") AND (Spring OR Springboot) AND (AWS)',
      },
    ],
    subsections: [
      {
        title: "6.1 Tips for Effective Boolean Searches",
        items: [
          "Use job titles + skills",
          'Include synonyms (e.g., DevOps / SRE)',
          "Exclude unrelated skills using NOT",
          'Wrap multi-word terms in quotes: "React Native"',
          "Use OR inside brackets for title/skill variations",
        ],
      },
    ],
  },
  {
    id: "communication",
    icon: MessageSquare,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    title: "7. Communication Skills",
    subsections: [
      {
        title: "7.1 Candidate Communication",
        items: [
          "Be clear and concise",
          "Share job details transparently",
          "Avoid overpromising",
          "Keep candidates informed at all stages",
        ],
      },
      {
        title: "7.2 Client Communication",
        items: [
          "Understand business needs",
          "Manage expectations",
          "Provide timely updates",
          "Gain credibility by sharing market insights",
        ],
      },
    ],
  },
  {
    id: "kpis",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "8. KPIs & Performance Metrics",
    content: [
      {
        type: "chips" as const,
        items: [
          "Number of CV submissions",
          "Shortlists",
          "Interviews scheduled",
          "Offers made",
          "Placements (contract & permanent)",
          "Time-to-fill metrics",
        ],
      },
    ],
  },
  {
    id: "tools",
    icon: Wrench,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    title: "9. Tools & Systems",
    content: [
      {
        type: "chips" as const,
        items: [
          "Applicant Tracking System (ATS)",
          "LinkedIn Recruiter",
          "Job board databases",
          "CRM systems",
          "Email templates",
          "Microsoft Teams / Zoom",
        ],
      },
    ],
  },
  {
    id: "bestpractices",
    icon: Star,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    title: "10. Best Practices",
    content: [
      {
        type: "checklist" as const,
        items: [
          "Learn tech stacks continuously",
          "Follow market trends (AI, cloud, security)",
          "Build strong candidate pipelines",
          "Treat clients and candidates as partners",
          "Maintain excellent documentation",
        ],
      },
    ],
  },
  {
    id: "scripts",
    icon: FileText,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    title: "11. Sample Scripts",
    content: [
      {
        type: "script" as const,
        label: "11.1 Candidate Outreach Template",
        code: `Hi [Name], I came across your profile and thought your experience with [skill] stood out.

I'm working on a role for [Company/Role], and your background seems like a strong match.

Would you be open to a quick chat?`,
      },
      {
        type: "checklist" as const,
        label: "11.2 Intake Call Script",
        items: [
          "What are the must-have skills?",
          "What projects will they work on?",
          "What's the team structure?",
          "What's the budget and timeline?",
          "Why is this role open?",
        ],
      },
    ],
  },
  {
    id: "glossary",
    icon: BookOpen,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "12. Glossary",
    content: [
      {
        type: "glossary" as const,
        items: [
          { term: "IR35", def: "UK tax legislation that determines employment status of contractors" },
          { term: "JD", def: "Job Description — document outlining role requirements and responsibilities" },
          { term: "ATS", def: "Applicant Tracking System — software for managing recruitment workflows" },
          { term: "SOW", def: "Statement of Work — defines deliverables, timelines, and scope of a contract" },
          { term: "Skill Matrix", def: "Table comparing candidate skills against job requirements" },
          { term: "PSL", def: "Preferred Supplier List — vetted agencies approved by a client" },
          { term: "Right to Work", def: "Legal requirement verifying a candidate is authorised to work in the UK" },
          { term: "GDPR", def: "General Data Protection Regulation — governs how personal data is handled" },
        ],
      },
    ],
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function TableBlock({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/5 mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/5 border-b border-white/5">
            {table.headers.map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 text-sm ${j === 0 ? "font-medium" : "text-muted-foreground"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const { toast } = useToast();
  return (
    <div className="mt-3">
      {label && <p className="text-xs text-muted-foreground font-semibold mb-1.5">{label}</p>}
      <div className="relative group">
        <div className="bg-black/50 rounded-lg border border-white/10 p-4 pr-12">
          <p className="text-xs font-mono text-blue-300 leading-relaxed whitespace-pre-wrap break-all">{code}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Copied!" }); }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ContentBlock({ block }: { block: any }) {
  if (block.type === "text") {
    return <p className="text-sm text-muted-foreground leading-relaxed mt-3">{block.text}</p>;
  }
  if (block.type === "code" || block.type === "script") {
    return <CodeBlock code={block.code} label={block.label} />;
  }
  if (block.type === "chips") {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {block.items.map((item: string, i: number) => (
          <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{item}</Badge>
        ))}
      </div>
    );
  }
  if (block.type === "checklist") {
    return (
      <div className="space-y-2 mt-3">
        {block.label && <p className="text-xs text-muted-foreground font-semibold mb-2">{block.label}</p>}
        {block.items.map((item: string, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "glossary") {
    return (
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        {block.items.map((entry: { term: string; def: string }, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-sm font-bold font-mono text-primary mb-1">{entry.term}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{entry.def}</p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function SubsectionBlock({ sub }: { sub: any }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-foreground/80 mb-2">{sub.title}</p>
      {sub.table && <TableBlock table={sub.table} />}
      {sub.items && (
        <ul className="space-y-1.5">
          {sub.items.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5 shrink-0">•</span>{item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionCard({
  section,
  isRead,
  onToggleRead,
}: {
  section: (typeof SECTIONS)[0];
  isRead: boolean;
  onToggleRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <Card
      className={`glass-panel border-white/5 overflow-hidden transition-all duration-200 ${isRead ? "border-green-500/20" : ""}`}
      data-testid={`section-${section.id}`}
    >
      <button
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
        data-testid={`toggle-${section.id}`}
      >
        <div className={`w-9 h-9 rounded-lg ${section.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${section.color}`} />
        </div>
        <span className="flex-1 font-display font-semibold text-base">{section.title}</span>
        <div className="flex items-center gap-3">
          {isRead && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs h-5">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Done
            </Badge>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-1">
              {"content" in section && section.content?.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
              {"subsections" in section && section.subsections?.map((sub, i) => (
                <SubsectionBlock key={i} sub={sub} />
              ))}
              <div className="pt-4 flex justify-end">
                <Button
                  size="sm"
                  variant={isRead ? "outline" : "default"}
                  className={isRead
                    ? "border-green-500/30 text-green-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-xs"
                    : "ai-button-gradient text-xs"}
                  onClick={onToggleRead}
                  data-testid={`mark-read-${section.id}`}
                >
                  {isRead ? <><X className="w-3 h-3 mr-1.5" />Mark Unread</> : <><CheckCircle2 className="w-3 h-3 mr-1.5" />Mark as Read</>}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleRead = (id: string) => {
    setReadSet(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter(s => {
      const titleMatch = s.title.toLowerCase().includes(q);
      const contentMatch = JSON.stringify(s).toLowerCase().includes(q);
      return titleMatch || contentMatch;
    });
  }, [searchQuery]);

  const progress = SECTIONS.length > 0 ? Math.round((readSet.size / SECTIONS.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" /> IT Recruitment Training
          </h1>
          <p className="text-muted-foreground mt-1">UK Market Onboarding Manual — 12 sections covering the full recruitment lifecycle.</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-sm px-3 py-1">
          {readSet.size} / {SECTIONS.length} completed
        </Badge>
      </div>

      {/* Progress Bar */}
      <Card className="p-4 glass-panel border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Your Progress</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        {progress === 100 && (
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> You've completed the full training manual!
          </p>
        )}
      </Card>

      {/* Academy Video */}
      <Card className="overflow-hidden glass-panel border-white/5">
        <div className="p-5 pb-3 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <PlayCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg">GCC Recruitment Academy</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Watch the recruitment training video before working through the detailed manual below.
            </p>
          </div>
        </div>
        <div className="bg-black/30 border-y border-white/5">
          <video
            className="w-full aspect-video max-h-[520px] object-contain bg-black"
            controls
            preload="metadata"
            playsInline
            aria-label="GCC Recruitment Academy training video"
          >
            <source src="/gcc-recruitment-academy-training.mp4" type="video/mp4" />
            Your browser does not support the training video.
          </video>
        </div>
        <div className="px-5 py-3 text-xs text-muted-foreground">
          GCC Recruitment Academy · MP4 training video
        </div>
      </Card>

      {/* Academy Manual */}
      <Card className="overflow-hidden glass-panel border-white/5">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Complete Recruiter Training Manual</h2>
              <p className="text-sm text-muted-foreground mt-1">
                2026 GCC Recruitment Academy playbook covering the full recruitment lifecycle.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="border-white/10">
              <a href="/gcc-recruitment-academy-training-manual.pdf" target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
              </a>
            </Button>
            <Button asChild size="sm" className="ai-button-gradient">
              <a href="/gcc-recruitment-academy-training-manual.pdf" download>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </a>
            </Button>
          </div>
        </div>
        <div className="mx-5 mb-5 rounded-lg border border-white/10 bg-white/[.03] p-4 text-sm text-muted-foreground">
          The manual opens in a separate browser tab to avoid blocked embedded-document errors in the app preview.
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10 bg-background/50 border-white/10"
          placeholder="Search training content…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          data-testid="input-training-search"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {searchQuery && (
        <p className="text-xs text-muted-foreground">
          {filteredSections.length} section{filteredSections.length !== 1 ? "s" : ""} match "<span className="text-primary">{searchQuery}</span>"
        </p>
      )}

      {/* Section Cards */}
      <div className="space-y-3">
        {filteredSections.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sections match your search.</p>
          </div>
        ) : (
          filteredSections.map((section, i) => (
            <motion.div key={section.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <SectionCard
                section={section}
                isRead={readSet.has(section.id)}
                onToggleRead={() => toggleRead(section.id)}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
