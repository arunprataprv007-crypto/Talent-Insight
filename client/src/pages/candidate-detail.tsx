import { useState } from "react";
import { useRoute } from "wouter";
import { useCandidate } from "@/hooks/use-candidates";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UserCircle, Linkedin, Loader2, Mail, Phone, MessageSquare, PhoneCall,
  CheckCircle2, Clock, Send, History, ChevronRight, Briefcase, GraduationCap,
  Wrench, AlertCircle, Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "bg-slate-500", textColor: "text-slate-400" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-blue-500", textColor: "text-blue-400" },
  { key: "screening", label: "Screening", color: "bg-yellow-500", textColor: "text-yellow-400" },
  { key: "interviewing", label: "Interviewing", color: "bg-purple-500", textColor: "text-purple-400" },
  { key: "offered", label: "Offered", color: "bg-green-500", textColor: "text-green-400" },
  { key: "rejected", label: "Rejected", color: "bg-red-500", textColor: "text-red-400" },
];

function PipelineTracker({ candidateId, currentStage }: { candidateId: number; currentStage: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStageMutation = useMutation({
    mutationFn: (stage: string) =>
      apiRequest("PATCH", `/api/candidates/${candidateId}`, { pipelineStage: stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidateId] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const activeIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStage);

  return (
    <Card className="p-6 glass-panel border-white/5">
      <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" /> Candidate Pipeline Status
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = stage.key === currentStage;
          const isPast = i < activeIndex;
          return (
            <button
              key={stage.key}
              onClick={() => updateStageMutation.mutate(stage.key)}
              disabled={updateStageMutation.isPending}
              data-testid={`stage-btn-${stage.key}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                isActive
                  ? `${stage.color} text-white border-transparent shadow-lg scale-105`
                  : isPast
                  ? "bg-white/10 text-muted-foreground border-white/10"
                  : "bg-transparent border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground"
              }`}
            >
              {isActive && <CheckCircle2 className="w-3 h-3" />}
              {stage.label}
            </button>
          );
        })}
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
          style={{ width: `${activeIndex === -1 ? 0 : ((activeIndex) / (PIPELINE_STAGES.length - 1)) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Current stage: <span className="font-medium text-foreground capitalize">{currentStage || "new"}</span>
      </p>
    </Card>
  );
}

function CommunicationsPanel({ candidateId, candidateName, candidateEmail, candidatePhone }: {
  candidateId: number;
  candidateName: string;
  candidateEmail?: string | null;
  candidatePhone?: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config } = useQuery<any>({
    queryKey: ["/api/communications/config"],
  });

  const { data: comms, isLoading } = useQuery<any[]>({
    queryKey: ["/api/communications", candidateId],
    queryFn: () => fetch(`/api/communications?candidateId=${candidateId}`, { credentials: "include" }).then(r => r.json()),
  });

  const [emailForm, setEmailForm] = useState({ to: candidateEmail || "", subject: "", body: "" });
  const [smsBody, setSmsBody] = useState("");
  const [callTo, setCallTo] = useState(candidatePhone || "");

  const emailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/communications/email", { candidateId, ...emailForm }),
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      setEmailForm(f => ({ ...f, subject: "", body: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/communications", candidateId] });
    },
    onError: (e: any) => toast({ title: "Failed to send email", description: e.message, variant: "destructive" }),
  });

  const smsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/communications/sms", { candidateId, to: candidatePhone, body: smsBody }),
    onSuccess: () => {
      toast({ title: "SMS sent" });
      setSmsBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/communications", candidateId] });
    },
    onError: (e: any) => toast({ title: "Failed to send SMS", description: e.message, variant: "destructive" }),
  });

  const callMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/communications/call", { candidateId, to: callTo }),
    onSuccess: () => {
      toast({ title: "Call initiated via Twilio VoIP" });
      queryClient.invalidateQueries({ queryKey: ["/api/communications", candidateId] });
    },
    onError: (e: any) => toast({ title: "Call failed", description: e.message, variant: "destructive" }),
  });

  const commTypeIcon = (type: string) => {
    if (type === "email") return <Mail className="w-3.5 h-3.5 text-blue-400" />;
    if (type === "sms") return <MessageSquare className="w-3.5 h-3.5 text-green-400" />;
    if (type === "call") return <PhoneCall className="w-3.5 h-3.5 text-purple-400" />;
    return <History className="w-3.5 h-3.5" />;
  };

  const twilioOk = config?.twilioConfigured;
  const sendgridOk = config?.sendgridConfigured;

  return (
    <Card className="p-6 glass-panel border-white/5">
      <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" /> Communication Hub
      </h3>

      <Tabs defaultValue="email">
        <TabsList className="w-full bg-background/50 mb-4">
          <TabsTrigger value="email" className="flex-1" data-testid="tab-email">
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex-1" data-testid="tab-sms">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> SMS
          </TabsTrigger>
          <TabsTrigger value="call" className="flex-1" data-testid="tab-call">
            <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> VoIP Call
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1" data-testid="tab-history">
            <History className="w-3.5 h-3.5 mr-1.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-3">
          {!sendgridOk && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>SendGrid not configured. Add <code className="font-mono">SENDGRID_API_KEY</code> and <code className="font-mono">SENDGRID_FROM_EMAIL</code> to your environment secrets to send emails.</span>
            </div>
          )}
          <Input
            placeholder="To: recipient@example.com"
            value={emailForm.to}
            onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
            className="bg-background/50 border-white/10"
            data-testid="input-email-to"
          />
          <Input
            placeholder="Subject"
            value={emailForm.subject}
            onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
            className="bg-background/50 border-white/10"
            data-testid="input-email-subject"
          />
          <Textarea
            placeholder={`Hi ${candidateName},\n\nI wanted to reach out regarding...`}
            value={emailForm.body}
            onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
            className="h-32 bg-background/50 border-white/10 resize-none"
            data-testid="input-email-body"
          />
          <Button
            className="w-full ai-button-gradient"
            disabled={emailMutation.isPending || !emailForm.to || !emailForm.subject || !emailForm.body}
            onClick={() => emailMutation.mutate()}
            data-testid="btn-send-email"
          >
            {emailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Email
          </Button>
        </TabsContent>

        <TabsContent value="sms" className="space-y-3">
          {!twilioOk && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Twilio not configured. Add <code className="font-mono">TWILIO_ACCOUNT_SID</code>, <code className="font-mono">TWILIO_AUTH_TOKEN</code>, and <code className="font-mono">TWILIO_PHONE_NUMBER</code> to your environment secrets.</span>
            </div>
          )}
          <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Sending to</p>
            <p className="font-medium">{candidatePhone || "No phone number on record"}</p>
          </div>
          <Textarea
            placeholder="Type your SMS message here…"
            value={smsBody}
            onChange={e => setSmsBody(e.target.value)}
            className="h-28 bg-background/50 border-white/10 resize-none"
            data-testid="input-sms-body"
          />
          <p className="text-xs text-muted-foreground">{smsBody.length}/160 characters</p>
          <Button
            className="w-full ai-button-gradient"
            disabled={smsMutation.isPending || !smsBody.trim() || !candidatePhone}
            onClick={() => smsMutation.mutate()}
            data-testid="btn-send-sms"
          >
            {smsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
            Send SMS
          </Button>
        </TabsContent>

        <TabsContent value="call" className="space-y-3">
          {!twilioOk && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Twilio not configured. Add <code className="font-mono">TWILIO_ACCOUNT_SID</code>, <code className="font-mono">TWILIO_AUTH_TOKEN</code>, and <code className="font-mono">TWILIO_PHONE_NUMBER</code> to your environment secrets.</span>
            </div>
          )}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center space-y-3">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto border border-primary/30">
              <PhoneCall className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{candidateName}</p>
              <p className="text-sm text-muted-foreground">{candidatePhone || "No phone on record"}</p>
            </div>
            <Input
              placeholder="Phone number (e.g. +447700900000)"
              value={callTo}
              onChange={e => setCallTo(e.target.value)}
              className="bg-background/50 border-white/10 text-center"
              data-testid="input-call-to"
            />
            <p className="text-xs text-muted-foreground">VoIP call will be initiated via Twilio. Ensure your Twilio number is configured.</p>
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-500 text-white"
            disabled={callMutation.isPending || !callTo.trim()}
            onClick={() => callMutation.mutate()}
            data-testid="btn-initiate-call"
          >
            {callMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PhoneCall className="w-4 h-4 mr-2" />}
            Initiate VoIP Call
          </Button>
        </TabsContent>

        <TabsContent value="history">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : !comms?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No communications yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comms.map((comm: any) => (
                <div key={comm.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5" data-testid={`comm-item-${comm.id}`}>
                  <div className="mt-0.5 shrink-0">{commTypeIcon(comm.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold capitalize">{comm.type}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(comm.createdAt), "dd MMM, HH:mm")}</span>
                    </div>
                    {comm.subject && <p className="text-xs font-medium truncate">{comm.subject}</p>}
                    {comm.body && <p className="text-xs text-muted-foreground line-clamp-2">{comm.body}</p>}
                    <Badge variant="secondary" className={`text-[10px] mt-1 ${comm.status === "sent" ? "text-green-400" : ""}`}>{comm.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

export default function CandidateDetailPage() {
  const [, params] = useRoute("/candidates/:id");
  const candidateId = parseInt(params?.id || "0");
  const { data: candidate, isLoading } = useCandidate(candidateId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const matchesMutation = useQuery<any[]>({
    queryKey: ["/api/matches", { candidateId }],
    queryFn: () => fetch(`/api/matches?candidateId=${candidateId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!candidateId,
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!candidate) return <div className="text-center p-12">Candidate not found</div>;

  const skills = (candidate.skills as string[] | null) || [];
  const experience = (candidate.experience as any[] | null) || [];
  const education = (candidate.education as any[] | null) || [];
  const pipelineStage = (candidate as any).pipelineStage || "new";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="p-8 glass-panel border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10" />
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 shadow-lg shrink-0">
            <UserCircle className="w-12 h-12 text-foreground/80" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-display font-bold mb-1">{candidate.name}</h1>
            <p className="text-xl text-muted-foreground mb-3">{candidate.headline}</p>
            <div className="flex flex-wrap gap-3 items-center">
              {candidate.email && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" /> {candidate.email}
                </span>
              )}
              {candidate.phone && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" /> {candidate.phone}
                </span>
              )}
              {candidate.linkedinUrl && (
                <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-3 py-1.5 rounded-lg">
                  <Linkedin className="w-4 h-4 mr-2" /> View on LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Pipeline Tracker */}
      <PipelineTracker candidateId={candidateId} currentStage={pipelineStage} />

      {/* Summary */}
      {candidate.summary && (
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-3">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{candidate.summary}</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Skills */}
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Skills
          </h3>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{skill}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No skills extracted yet. Parse a CV to populate.</p>
          )}
        </Card>

        {/* Education */}
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Education
          </h3>
          {education.length > 0 ? (
            <div className="space-y-3">
              {education.map((edu: any, i: number) => (
                <div key={i} className="border-l-2 border-primary/30 pl-4">
                  <p className="font-semibold text-sm">{edu.degree} {edu.field ? `in ${edu.field}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  {edu.year && <p className="text-xs text-muted-foreground">{edu.year}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No education data extracted yet.</p>
          )}
        </Card>
      </div>

      {/* Experience */}
      {experience.length > 0 && (
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Experience
          </h3>
          <div className="space-y-4">
            {experience.map((exp: any, i: number) => (
              <div key={i} className="border-l-2 border-primary/30 pl-4 pb-4 last:pb-0">
                <p className="font-semibold">{exp.title}</p>
                <p className="text-sm text-primary/80">{exp.company}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {exp.startDate} {exp.endDate ? `→ ${exp.endDate}` : "→ Present"}
                </p>
                {exp.description && <p className="text-sm text-muted-foreground leading-relaxed">{exp.description}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Job Matches */}
      {matchesMutation.data && matchesMutation.data.length > 0 && (
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Matched Jobs
          </h3>
          <div className="space-y-2">
            {matchesMutation.data.map((match: any) => (
              <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p className="font-medium text-sm">{match.job.title}</p>
                  <p className="text-xs text-muted-foreground">{match.job.company}</p>
                </div>
                <div className="flex items-center gap-3">
                  {match.score !== null && (
                    <Badge variant="secondary" className="text-xs">{match.score}% fit</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs capitalize">{match.screeningStatus}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Communication Hub */}
      <CommunicationsPanel
        candidateId={candidateId}
        candidateName={candidate.name}
        candidateEmail={candidate.email}
        candidatePhone={candidate.phone}
      />
    </div>
  );
}
