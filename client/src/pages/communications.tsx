import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  Mail, MessageSquare, PhoneCall, History, CheckCircle2, AlertCircle,
  Settings, Users, ExternalLink, Search, Filter, RefreshCw, Loader2, Clock
} from "lucide-react";
import { format } from "date-fns";

const COMM_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  email: { icon: Mail, color: "text-blue-400", label: "Email" },
  sms: { icon: MessageSquare, color: "text-green-400", label: "SMS" },
  call: { icon: PhoneCall, color: "text-purple-400", label: "Call" },
  outlook: { icon: Mail, color: "text-orange-400", label: "Outlook" },
};

const STATUS_CONFIG: Record<string, string> = {
  sent: "bg-green-500/20 text-green-400 border-green-500/30",
  delivered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  received: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function CommunicationsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: config } = useQuery<any>({ queryKey: ["/api/communications/config"] });
  const { data: comms, isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ["/api/communications"],
  });

  const filtered = (comms || []).filter(c => {
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesSearch =
      !search ||
      c.body?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const stats = {
    total: comms?.length || 0,
    emails: comms?.filter(c => c.type === "email").length || 0,
    sms: comms?.filter(c => c.type === "sms").length || 0,
    calls: comms?.filter(c => c.type === "call").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Communications</h1>
          <p className="text-muted-foreground mt-1">All candidate communications — emails, SMS, and calls.</p>
        </div>
        <Button variant="outline" className="border-white/10" onClick={() => refetch()} disabled={isFetching} data-testid="btn-refresh">
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={`p-4 glass-panel border-white/5 flex items-center gap-3 ${config?.sendgridConfigured ? "border-green-500/20" : "border-yellow-500/20"}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config?.sendgridConfigured ? "bg-green-500/20" : "bg-yellow-500/10"}`}>
            <Mail className={`w-5 h-5 ${config?.sendgridConfigured ? "text-green-400" : "text-yellow-400"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">SendGrid Email</p>
            <p className={`text-xs ${config?.sendgridConfigured ? "text-green-400" : "text-yellow-400"}`}>
              {config?.sendgridConfigured ? "Connected" : "Not configured"}
            </p>
          </div>
          {config?.sendgridConfigured ? <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" /> : <AlertCircle className="w-4 h-4 text-yellow-400 ml-auto" />}
        </Card>

        <Card className={`p-4 glass-panel border-white/5 flex items-center gap-3 ${config?.twilioConfigured ? "border-green-500/20" : "border-yellow-500/20"}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config?.twilioConfigured ? "bg-green-500/20" : "bg-yellow-500/10"}`}>
            <MessageSquare className={`w-5 h-5 ${config?.twilioConfigured ? "text-green-400" : "text-yellow-400"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">Twilio SMS + VoIP</p>
            <p className={`text-xs ${config?.twilioConfigured ? "text-green-400" : "text-yellow-400"}`}>
              {config?.twilioConfigured ? "Connected" : "Not configured"}
            </p>
          </div>
          {config?.twilioConfigured ? <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" /> : <AlertCircle className="w-4 h-4 text-yellow-400 ml-auto" />}
        </Card>

        <Card className="p-4 glass-panel border-white/5 flex items-center gap-3 border-slate-500/20">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-500/10">
            <Mail className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Outlook Tracker</p>
            <p className="text-xs text-slate-400">Setup required</p>
          </div>
          <Clock className="w-4 h-4 text-slate-400 ml-auto" />
        </Card>
      </div>

      {/* If services not configured */}
      {(!config?.sendgridConfigured || !config?.twilioConfigured) && (
        <Card className="p-5 glass-panel border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-semibold text-sm text-yellow-400">Configure your communication services</p>
              <p className="text-xs text-muted-foreground">Add the following environment secrets to enable sending emails, SMS, and VoIP calls directly from the portal:</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {!config?.sendgridConfigured && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs font-semibold text-blue-400 mb-1">SendGrid (Email)</p>
                    <code className="text-xs text-muted-foreground font-mono block">SENDGRID_API_KEY</code>
                    <code className="text-xs text-muted-foreground font-mono block">SENDGRID_FROM_EMAIL</code>
                  </div>
                )}
                {!config?.twilioConfigured && (
                  <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                    <p className="text-xs font-semibold text-green-400 mb-1">Twilio (SMS + VoIP)</p>
                    <code className="text-xs text-muted-foreground font-mono block">TWILIO_ACCOUNT_SID</code>
                    <code className="text-xs text-muted-foreground font-mono block">TWILIO_AUTH_TOKEN</code>
                    <code className="text-xs text-muted-foreground font-mono block">TWILIO_PHONE_NUMBER</code>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Outlook Tracker Info */}
      <Card className="p-5 glass-panel border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold font-display mb-1">Outlook Email Tracker</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Track emails sent to candidates through your Microsoft Outlook account. This integration uses the Microsoft Graph API to pull your outbound emails and match them to candidates in the portal.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Microsoft Graph API</Badge>
              <Badge variant="secondary" className="text-xs">OAuth 2.0</Badge>
              <Badge variant="secondary" className="text-xs">Azure App Registration required</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              To enable: Create an Azure App Registration and add <code className="font-mono bg-white/5 px-1 rounded">AZURE_CLIENT_ID</code>, <code className="font-mono bg-white/5 px-1 rounded">AZURE_CLIENT_SECRET</code>, and <code className="font-mono bg-white/5 px-1 rounded">AZURE_TENANT_ID</code> to your environment secrets.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: History, color: "text-primary" },
          { label: "Emails", value: stats.emails, icon: Mail, color: "text-blue-400" },
          { label: "SMS", value: stats.sms, icon: MessageSquare, color: "text-green-400" },
          { label: "Calls", value: stats.calls, icon: PhoneCall, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.label} className="p-4 glass-panel border-white/5 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-2xl font-bold font-display">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-background/50 border-white/10"
            data-testid="input-comm-search"
          />
        </div>
        <div className="flex gap-2">
          {["all", "email", "sms", "call"].map(t => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              className={typeFilter === t ? "ai-button-gradient" : "border-white/10"}
              onClick={() => setTypeFilter(t)}
              data-testid={`filter-${t}`}
            >
              {t === "all" ? "All" : COMM_TYPE_CONFIG[t]?.label || t}
            </Button>
          ))}
        </div>
      </div>

      {/* Communications List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No communications yet</p>
          <p className="text-sm text-muted-foreground mt-1">Send an email, SMS, or initiate a call from a candidate profile to see activity here.</p>
          <Button asChild className="mt-4 ai-button-gradient" size="sm">
            <Link href="/candidates"><Users className="w-4 h-4 mr-2" /> Go to Candidates</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((comm: any) => {
            const typeCfg = COMM_TYPE_CONFIG[comm.type] || COMM_TYPE_CONFIG.email;
            const statusCls = STATUS_CONFIG[comm.status] || STATUS_CONFIG.sent;
            return (
              <Card key={comm.id} className="p-4 glass-panel border-white/5 hover:border-white/10 transition-colors" data-testid={`comm-row-${comm.id}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/5`}>
                    <typeCfg.icon className={`w-5 h-5 ${typeCfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{typeCfg.label}</span>
                      <Badge className={`text-[10px] border ${statusCls}`}>{comm.status}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(comm.createdAt), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    {comm.subject && <p className="text-sm font-medium truncate">{comm.subject}</p>}
                    {comm.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{comm.body}</p>}
                    {comm.externalId && (
                      <p className="text-xs text-muted-foreground/50 font-mono mt-1">ID: {comm.externalId}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
