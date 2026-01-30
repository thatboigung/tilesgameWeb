import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface BeatVisualizerProps {
  bpm: number | null;
  isPlaying: boolean;
}

export function BeatVisualizer({ bpm, isPlaying }: BeatVisualizerProps) {
  const [beatActive, setBeatActive] = useState(false);
  const requestRef = useRef<number>();
  const lastBeatTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!bpm || !isPlaying) {
      setBeatActive(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const interval = (60 / bpm) * 1000;

    const animate = (time: number) => {
      if (time - lastBeatTimeRef.current >= interval) {
        setBeatActive(true);
        lastBeatTimeRef.current = time;
        setTimeout(() => setBeatActive(false), 100); // Quick flash duration
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [bpm, isPlaying]);

  return (
    <div className="relative flex flex-col items-center justify-center p-12 border border-border/50 rounded-3xl bg-black/40 backdrop-blur-sm shadow-2xl overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,200,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,200,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Main Pulse Circle */}
      <div className="relative z-10 w-48 h-48 flex items-center justify-center">
        <motion.div
          animate={{
            scale: beatActive ? 1.2 : 1,
            opacity: beatActive ? 0.8 : 0.2,
            boxShadow: beatActive
              ? "0 0 60px 20px rgba(0, 255, 200, 0.6)"
              : "0 0 0px 0px rgba(0, 255, 200, 0)",
          }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-4 border-primary bg-primary/20"
        />
        
        {/* Inner Core */}
        <motion.div 
           animate={{
            scale: beatActive ? 1.1 : 1,
           }}
           className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg relative z-20"
        >
           <Zap className={`w-12 h-12 text-black ${beatActive ? 'fill-black' : ''} transition-all duration-100`} />
        </motion.div>

        {/* Shockwave Rings */}
        <AnimatePresence>
          {beatActive && (
            <motion.div
              initial={{ scale: 1, opacity: 0.8, borderWidth: "4px" }}
              animate={{ scale: 2.5, opacity: 0, borderWidth: "0px" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-primary z-0"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center relative z-10">
        <h3 className="text-muted-foreground uppercase tracking-widest text-sm font-semibold mb-2">Current Tempo</h3>
        <div className="font-mono text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary glitch-text" data-text={bpm ? Math.round(bpm) : "---"}>
          {bpm ? Math.round(bpm) : "---"} <span className="text-lg text-muted-foreground align-top mt-2 inline-block">BPM</span>
        </div>
      </div>
    </div>
  );
}
