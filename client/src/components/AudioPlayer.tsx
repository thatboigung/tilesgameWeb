import { Play, Pause, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext;
  onPlayStateChange: (isPlaying: boolean) => void;
  onAnalyserCreated: (node: AnalyserNode) => void;
}

export function AudioPlayer({ audioBuffer, audioContext, onPlayStateChange, onAnalyserCreated }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset when buffer changes
    stopAudio();
  }, [audioBuffer]);

  const playAudio = () => {
    if (!audioBuffer) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Start from where we paused, or 0
    const offset = pauseTimeRef.current % audioBuffer.duration;
    source.start(0, offset);
    
    startTimeRef.current = audioContext.currentTime - offset;
    sourceNodeRef.current = source;
    analyserNodeRef.current = analyser;
    onAnalyserCreated(analyser);
    
    setIsPlaying(true);
    onPlayStateChange(true);
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      pauseTimeRef.current = audioContext.currentTime - startTimeRef.current;
      setIsPlaying(false);
      onPlayStateChange(false);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    pauseTimeRef.current = 0;
    setIsPlaying(false);
    onPlayStateChange(false);
  };

  if (!audioBuffer) return null;

  return (
    <div className="flex justify-center gap-4 py-6">
      {!isPlaying ? (
        <button
          onClick={playAudio}
          className="flex items-center gap-2 px-8 py-3 rounded-full font-bold uppercase tracking-wider bg-primary text-background hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          Play Beat
        </button>
      ) : (
        <button
          onClick={pauseAudio}
          className="flex items-center gap-2 px-8 py-3 rounded-full font-bold uppercase tracking-wider bg-secondary text-background hover:bg-secondary/90 hover:shadow-lg hover:shadow-secondary/20 transition-all active:scale-95"
        >
          <Pause className="w-5 h-5 fill-current" />
          Pause
        </button>
      )}
      
      <button
        onClick={stopAudio}
        className="p-3 rounded-full border border-border bg-card hover:bg-destructive/20 hover:border-destructive/50 hover:text-destructive transition-colors"
        title="Stop"
      >
        <Square className="w-5 h-5 fill-current" />
      </button>
    </div>
  );
}
