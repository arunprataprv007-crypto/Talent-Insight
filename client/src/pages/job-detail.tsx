import { useRoute } from "wouter";
import { useJob, useParseJob } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrainCircuit, Loader2, FileText, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = parseInt(params?.id || "0");
  
  const { data: job, isLoading } = useJob(jobId);
  const parseJob = useParseJob();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!job) return <div className="text-center p-12">Job not found</div>;

  const handleParse = () => {
    parseJob.mutate(job.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 p-6 rounded-2xl border border-white/5">
        <div>
          <p className="text-primary font-medium mb-1">{job.company}</p>
          <h1 className="text-3xl font-display font-bold">{job.title}</h1>
        </div>
        <Button 
          onClick={handleParse} 
          disabled={parseJob.isPending}
          className="ai-button-gradient whitespace-nowrap"
        >
          {parseJob.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing JDs...</>
          ) : (
            <><BrainCircuit className="w-4 h-4 mr-2" /> Run AI Parse & Generate</>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 glass-panel border-white/5">
            <h3 className="font-display font-semibold text-lg flex items-center mb-4 border-b border-white/5 pb-4">
              <FileText className="w-5 h-5 mr-2 text-muted-foreground" /> Raw Description
            </h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed max-h-[500px] overflow-y-auto pr-2">
              {job.description}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 glass-panel border-primary/20 bg-primary/5">
            <h3 className="font-display font-semibold text-lg flex items-center mb-4">
              <SparklesIcon className="w-5 h-5 mr-2 text-primary" /> AI Parsed Requirements
            </h3>
            {job.parsedRequirements ? (
              <pre className="text-xs bg-black/50 p-4 rounded-xl overflow-x-auto text-green-400 border border-white/5">
                {JSON.stringify(job.parsedRequirements, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Click the AI Parse button to extract structured requirements from the job description.
              </div>
            )}
          </Card>

          <Card className="p-6 glass-panel border-accent/20 bg-accent/5">
            <h3 className="font-display font-semibold text-lg flex items-center mb-4">
              <Search className="w-5 h-5 mr-2 text-accent" /> Boolean Strings
            </h3>
            {job.booleanStrings ? (
              <div className="space-y-3">
                {Array.isArray(job.booleanStrings) ? job.booleanStrings.map((str, i) => (
                  <div key={i} className="text-xs bg-black/50 p-3 rounded-lg border border-white/5 text-blue-300 font-mono">
                    {str}
                  </div>
                )) : (
                  <pre className="text-xs bg-black/50 p-4 rounded-xl overflow-x-auto text-blue-300">
                    {JSON.stringify(job.booleanStrings, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Awaiting AI analysis to generate LinkedIn boolean strings.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
