import { useRoute } from "wouter";
import { useCandidate } from "@/hooks/use-candidates";
import { Card } from "@/components/ui/card";
import { UserCircle, Linkedin, Loader2 } from "lucide-react";

export default function CandidateDetailPage() {
  const [, params] = useRoute("/candidates/:id");
  const candidateId = parseInt(params?.id || "0");
  
  const { data: candidate, isLoading } = useCandidate(candidateId);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!candidate) return <div className="text-center p-12">Candidate not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="p-8 glass-panel border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10" />
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 shadow-lg shrink-0">
            <UserCircle className="w-12 h-12 text-foreground/80" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-4xl font-display font-bold mb-2">{candidate.name}</h1>
            <p className="text-xl text-muted-foreground mb-4">{candidate.headline}</p>
            
            {candidate.linkedinUrl && (
              <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-3 py-1.5 rounded-lg">
                <Linkedin className="w-4 h-4 mr-2" /> View on LinkedIn
              </a>
            )}
          </div>
        </div>
      </Card>

      {candidate.summary && (
        <Card className="p-6 glass-panel border-white/5">
          <h3 className="font-display font-semibold text-lg mb-3">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {candidate.summary}
          </p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 glass-panel border-white/5 opacity-50">
           <h3 className="font-display font-semibold text-lg mb-3">Skills (Parsed)</h3>
           <p className="text-sm text-muted-foreground italic">AI Extraction pending full profile analysis...</p>
           {/* Future JSON display area */}
        </Card>
        <Card className="p-6 glass-panel border-white/5 opacity-50">
           <h3 className="font-display font-semibold text-lg mb-3">Experience</h3>
           <p className="text-sm text-muted-foreground italic">AI Extraction pending full profile analysis...</p>
        </Card>
      </div>
    </div>
  );
}
