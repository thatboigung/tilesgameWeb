import { useAnalyses } from "@/hooks/use-analyses";
import { format } from "date-fns";
import { Music, Activity } from "lucide-react";
import { motion } from "framer-motion";

export function AnalysisHistory() {
  const { data: analyses, isLoading } = useAnalyses();

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-muted-foreground animate-pulse">
        Loading history...
      </div>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/30">
        <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground">No analysis history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold font-display text-primary tracking-wide mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Recent Analyses
      </h3>
      
      <div className="grid gap-3">
        {analyses.slice().reverse().map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:bg-card/80 hover:shadow-[0_0_15px_-5px_rgba(0,255,200,0.3)] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                  {item.fileName}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {item.timestamp ? format(new Date(item.timestamp), 'MMM d, h:mm a') : 'Unknown Date'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="block text-2xl font-bold font-mono text-secondary tabular-nums">
                {Math.round(parseFloat(item.bpm))}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">BPM</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
