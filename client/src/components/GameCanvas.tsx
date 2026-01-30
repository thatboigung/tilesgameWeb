import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Tile {
  id: number;
  lane: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  gradient: CanvasGradient;
}

interface GameCanvasProps {
  frequency: number;
  isPlaying: boolean;
  sensitivity: number;
  complexity: number; // 0.1 to 0.3 (100ms to 300ms)
}

export function GameCanvas({ frequency, isPlaying, sensitivity, complexity }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesRef = useRef<Tile[]>([]);
  const lastWindowTimeRef = useRef<number>(0);
  const pitchBufferRef = useRef<number[]>([]);
  const nextTileIdRef = useRef<number>(0);
  const laneCooldownRef = useRef<number[]>([0, 0, 0, 0]);
  const lastGlobalSpawnRef = useRef<number>(0);

  // Lane is now random (0-3) for each tile

  useEffect(() => {
    if (!isPlaying) {
      tilesRef.current = [];
      pitchBufferRef.current = [];
      laneCooldownRef.current = [0, 0, 0, 0];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const laneCount = 4;
    const laneWidth = canvas.width / laneCount;
    const minHeight = 100;
    const maxHeight = 200;
    const tileWidth = laneWidth * 0.8;
    const minSpeed = 5;
    const maxSpeed = 8;
    // Anti-stacking: cooldown for all lanes
    const globalCooldown = 300; // ms


    const update = () => {
      const now = performance.now();
      const windowSize = 200; // ms, for pitch averaging

      // Add current frequency to buffer if it's valid
      if (frequency > 0) {
        pitchBufferRef.current.push(frequency);
      }

      // Process sampling window
      if (now - lastWindowTimeRef.current >= windowSize) {
        if (pitchBufferRef.current.length > 0) {
          const avgFreq = pitchBufferRef.current.reduce((a, b) => a + b, 0) / pitchBufferRef.current.length;
          // Debug check: skip if pitch is 0 or undefined
          if (avgFreq && avgFreq > 0) {
            // Pick a random lane (0-3) for each tile
            const lane = Math.floor(Math.random() * 4);
            // Anti-stacking: global cooldown for all lanes
            if (now - lastGlobalSpawnRef.current > globalCooldown) {
              // Centered in lane
              const laneX = lane * laneWidth;
              const x = laneX + (laneWidth - tileWidth) / 2;
              const height = minHeight + Math.random() * (maxHeight - minHeight);
              const width = tileWidth;
              const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
              const grad = ctx.createLinearGradient(x, 0, x, height);
              grad.addColorStop(0, "#0ff");
              grad.addColorStop(0.7, "#0ff8");
              grad.addColorStop(1, "#012");
              tilesRef.current.push({
                id: nextTileIdRef.current++,
                lane,
                x,
                y: 0,
                width,
                height,
                speed,
                gradient: grad,
              });
              lastGlobalSpawnRef.current = now;
            }
          }
          pitchBufferRef.current = [];
        }
        lastWindowTimeRef.current = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw lanes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
      }

      // Update and draw tiles
      tilesRef.current = tilesRef.current.filter((tile) => {
        tile.y += tile.speed;
        ctx.save();
        ctx.shadowBlur = 32;
        ctx.shadowColor = "#0ff";
        ctx.fillStyle = tile.gradient;
        ctx.beginPath();
        ctx.roundRect(tile.x, tile.y, tile.width, tile.height, 16);
        ctx.fill();
        ctx.restore();
        return tile.y < canvas.height;
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, frequency, sensitivity, complexity]);

  return (
    <div className="space-y-4">
      <div className="relative w-full h-[400px] bg-black/60 rounded-xl overflow-hidden border border-border/50">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full h-full"
        />
        
        {/* Lane Labels */}
        <div className="absolute bottom-2 inset-x-0 grid grid-cols-4 text-center pointer-events-none">
          <span className="text-[10px] font-mono opacity-30">BASS</span>
          <span className="text-[10px] font-mono opacity-30">MID-L</span>
          <span className="text-[10px] font-mono opacity-30">MID-H</span>
          <span className="text-[10px] font-mono opacity-30">HIGH</span>
        </div>
      </div>
    </div>
  );
}
