import { useState, useMemo, useEffect, useRef } from "react";
import { analyze } from "web-audio-beat-detector";
import { FileUpload } from "@/components/FileUpload";
import { BeatVisualizer } from "@/components/BeatVisualizer";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PitchLanes } from "@/components/PitchLanes";
import { GameCanvas } from "@/components/GameCanvas";
import { useCreateAnalysis } from "@/hooks/use-analyses";
import { motion } from "framer-motion";
import { Mic, Waves, Info, Music2, Gamepad2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [complexity, setComplexity] = useState(0.15); // Sampling window size
  const [pitchData, setPitchData] = useState<{ frequency: number; note: string; isVocal: boolean } | null>(null);
  const { toast } = useToast();
  const createAnalysis = useCreateAnalysis();

  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>();
  const vocalModeRef = useRef<"vocal" | "full">("full");
  const pendingModeRef = useRef<{ mode: "vocal" | "full"; since: number } | null>(null);
  const vocalPrevFreqRef = useRef(0);
  const vocalPrevTimeRef = useRef(0);
  const vocalCandidateSinceRef = useRef(0);
  const highNoisePrevAvgRef = useRef(0);

  // Memoize audio context to prevent recreation
  const audioContext = useMemo(() => new (window.AudioContext || (window as any).webkitAudioContext)(), []);

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const getNoteName = (frequency: number) => {
    if (frequency <= 0) return "-";
    const midi = Math.round(12 * Math.log2(frequency / 440) + 69);
    const name = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
  };

  useEffect(() => {
    if (!isPlaying || !audioContext || !analyserRef.current) {
      setPitchData(null);
      vocalPrevFreqRef.current = 0;
      vocalPrevTimeRef.current = 0;
      vocalCandidateSinceRef.current = 0;
      highNoisePrevAvgRef.current = 0;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const sampleRate = audioContext.sampleRate;
    const vocalRange = { min: 300, max: 1500 };
    const highNoiseRange = { min: 3000, max: 8000 };
    const vocalThreshold = 0.15;
    const vocalHoldMs = 120;
    const vocalPitchStableHz = 35;
    const highNoiseThreshold = 0.12;
    const highNoiseSpike = 0.3;
    const modeDebounceMs = 250;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const binHz = sampleRate / analyser.fftSize;

    const getDominantFrequency = (startBin: number, endBin: number) => {
      let maxAmp = 0;
      let maxIndex = -1;
      for (let i = startBin; i <= endBin; i++) {
        const amp = dataArray[i] ?? 0;
        if (amp > maxAmp) {
          maxAmp = amp;
          maxIndex = i;
        }
      }
      const frequency = maxIndex >= 0 ? maxIndex * binHz : 0;
      return { frequency, maxAmp };
    };

    const updatePitch = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);

        const minBin = Math.max(0, Math.floor(vocalRange.min / binHz));
        const maxBin = Math.min(dataArray.length - 1, Math.ceil(vocalRange.max / binHz));
        const highMinBin = Math.max(0, Math.floor(highNoiseRange.min / binHz));
        const highMaxBin = Math.min(dataArray.length - 1, Math.ceil(highNoiseRange.max / binHz));

        let vocalSum = 0;
        let vocalCount = 0;
        for (let i = minBin; i <= maxBin; i++) {
          vocalSum += dataArray[i] ?? 0;
          vocalCount++;
        }
        const vocalAvg = vocalCount > 0 ? vocalSum / vocalCount / 255 : 0;
        let highSum = 0;
        let highCount = 0;
        for (let i = highMinBin; i <= highMaxBin; i++) {
          highSum += dataArray[i] ?? 0;
          highCount++;
        }
        const highAvg = highCount > 0 ? highSum / highCount / 255 : 0;
        const now = performance.now();

        const vocalDominant = getDominantFrequency(minBin, maxBin);
        const vocalFreqStable =
          vocalPrevFreqRef.current > 0 &&
          Math.abs(vocalDominant.frequency - vocalPrevFreqRef.current) <= vocalPitchStableHz;
        const highSpike =
          highNoisePrevAvgRef.current > 0 &&
          (highAvg - highNoisePrevAvgRef.current) / highNoisePrevAvgRef.current >= highNoiseSpike &&
          now - vocalPrevTimeRef.current <= 40;
        const highNoiseBlocked = highAvg >= highNoiseThreshold && (!vocalFreqStable || highSpike);

        if (vocalAvg >= vocalThreshold && vocalFreqStable && !highNoiseBlocked) {
          if (vocalCandidateSinceRef.current === 0) {
            vocalCandidateSinceRef.current = now;
          }
        } else {
          vocalCandidateSinceRef.current = 0;
        }
        const vocalActive =
          vocalCandidateSinceRef.current > 0 && now - vocalCandidateSinceRef.current >= vocalHoldMs;

        const candidateMode: "vocal" | "full" = vocalActive ? "vocal" : "full";
        if (candidateMode !== vocalModeRef.current) {
          if (!pendingModeRef.current || pendingModeRef.current.mode !== candidateMode) {
            pendingModeRef.current = { mode: candidateMode, since: now };
          } else if (now - pendingModeRef.current.since >= modeDebounceMs) {
            vocalModeRef.current = candidateMode;
            pendingModeRef.current = null;
          }
        } else {
          pendingModeRef.current = null;
        }

        const mode = vocalModeRef.current;
        const range =
          mode === "vocal" ? vocalDominant : getDominantFrequency(0, dataArray.length - 1);

        const minAmplitude = 0.02 + (1 - sensitivity) * 0.18;
        if (range.frequency > 0 && range.maxAmp / 255 >= minAmplitude) {
          setPitchData({
            frequency: range.frequency,
            note: getNoteName(range.frequency),
            isVocal: mode === "vocal",
          });
        } else {
          setPitchData(null);
        }
        vocalPrevFreqRef.current = vocalDominant.frequency;
        vocalPrevTimeRef.current = now;
        highNoisePrevAvgRef.current = highAvg;
      }
      requestRef.current = requestAnimationFrame(updatePitch);
    };

    requestRef.current = requestAnimationFrame(updatePitch);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, audioContext, sensitivity]);

  const handleFileSelected = async (file: File) => {
    setIsAnalyzing(true);
    setBpm(null);
    setAudioBuffer(null);
    setIsPlaying(false);
    setPitchData(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);

      // Analyze BPM
      const tempo = await analyze(decodedBuffer);
      setBpm(tempo);

      // Save to history
      createAnalysis.mutate({
        fileName: file.name,
        bpm: tempo.toString(),
      });
      
      toast({
        title: "Analysis Complete",
        description: `Detected ${Math.round(tempo)} BPM`,
        className: "bg-primary text-background border-none",
      });
    } catch (err) {
      console.error("Analysis failed:", err);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not detect beat. Try a clearer audio file.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="pt-12 pb-16 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-mono uppercase tracking-widest mb-6">
            <Mic className="w-3 h-3" />
            <span>Real-time Rhythm Game Engine</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl mb-6 relative inline-block glitch-text" data-text="BEAT DETECTOR">
            BEAT DETECTOR
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload your music to generate a dynamic 4-lane rhythm game based on real-time pitch analysis.
          </p>
        </motion.div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Input & Visualization */}
        <div className="lg:col-span-8 space-y-12">
          
          <section>
            <FileUpload onFileSelected={handleFileSelected} isAnalyzing={isAnalyzing} />
            
            {audioBuffer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-display text-primary flex items-center gap-2">
                    <Waves className="w-5 h-5" />
                    Visualizer & Game
                  </h2>
                  <div className="flex gap-2">
                    {bpm && (
                      <span className="text-xs font-mono text-muted-foreground bg-secondary/10 px-2 py-1 rounded text-secondary">
                        TEMPO: {Math.round(bpm)}
                      </span>
                    )}
                    {pitchData && (
                      <span className="text-xs font-mono text-muted-foreground bg-primary/10 px-2 py-1 rounded text-primary">
                        {pitchData.note} ({Math.round(pitchData.frequency)}Hz)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <BeatVisualizer bpm={bpm} isPlaying={isPlaying} />
                   <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Gamepad2 className="w-4 h-4" />
                            <span className="text-sm font-semibold uppercase tracking-wider">Game Feed</span>
                         </div>
                         <div className="flex items-center gap-4 bg-card/50 border border-border p-2 rounded-lg">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col gap-2 w-48">
                               <div className="flex justify-between items-center px-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">Sensitivity</span>
                                  <span className="text-[10px] text-primary font-mono">{Math.round(sensitivity * 100)}%</span>
                               </div>
                               <Slider 
                                 value={[sensitivity]} 
                                 max={1} 
                                 step={0.01} 
                                 onValueChange={([v]) => setSensitivity(v)}
                               />
                               <div className="flex justify-between items-center px-1 mt-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">Complexity</span>
                                  <span className="text-[10px] text-primary font-mono">{Math.round(complexity * 1000)}ms</span>
                               </div>
                               <Slider 
                                 value={[complexity]} 
                                 min={0.1}
                                 max={0.3} 
                                 step={0.01} 
                                 onValueChange={([v]) => setComplexity(v)}
                               />
                            </div>
                         </div>
                      </div>
                      <GameCanvas 
                        frequency={pitchData?.frequency || 0} 
                        isVocal={pitchData?.isVocal ?? false}
                        isPlaying={isPlaying} 
                        sensitivity={sensitivity}
                        complexity={complexity}
                      />
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Music2 className="w-4 h-4" />
                    <span className="text-sm font-semibold uppercase tracking-wider">Musical Lanes</span>
                  </div>
                  <PitchLanes frequency={pitchData?.frequency || 0} note={pitchData?.note || ""} />
                </div>
                
                <AudioPlayer 
                  audioBuffer={audioBuffer} 
                  audioContext={audioContext} 
                  onPlayStateChange={setIsPlaying}
                  onAnalyserCreated={(node) => analyserRef.current = node}
                />
              </motion.div>
            )}
          </section>
        </div>

        {/* Right Column: Info & History */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card border border-border p-6 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Gamepad2 className="w-5 h-5" />
              <h3 className="font-bold font-display tracking-wide">GAME MECHANICS</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Tiles spawn in lanes based on the live pitch of the music. Adjust sensitivity to filter out noise and fine-tune tile frequency.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono border-b border-border pb-1">
                <span>Lane 1</span>
                <span className="text-primary">0-250Hz</span>
              </div>
              <div className="flex justify-between text-xs font-mono border-b border-border pb-1">
                <span>Lane 2</span>
                <span className="text-primary">250-450Hz</span>
              </div>
              <div className="flex justify-between text-xs font-mono border-b border-border pb-1">
                <span>Lane 3</span>
                <span className="text-primary">450-700Hz</span>
              </div>
              <div className="flex justify-between text-xs font-mono border-b border-border pb-1">
                <span>Lane 4</span>
                <span className="text-primary">&gt; 700Hz</span>
              </div>
            </div>
          </motion.div>

          <motion.div
             initial={{ x: 20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             transition={{ delay: 0.4 }}
          >
            <AnalysisHistory />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
