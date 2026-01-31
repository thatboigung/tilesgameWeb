import { useEffect, useRef, useState } from "react";

interface Tile {
  id: number;
  lane: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  gradient: CanvasGradient;
  isVocal: boolean;
}

interface GameCanvasProps {
  frequency: number;
  isVocal: boolean;
  isPlaying: boolean;
  sensitivity: number;
  complexity: number; // 0.1 to 0.3 (100ms to 300ms)
}

export function GameCanvas({ frequency, isVocal, isPlaying, sensitivity, complexity }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesRef = useRef<Tile[]>([]);
  const lastWindowTimeRef = useRef<number>(0);
  const pitchBufferRef = useRef<number[]>([]);
  const modeBufferRef = useRef<boolean[]>([]);
  const nextTileIdRef = useRef<number>(0);
  const laneCooldownRef = useRef<number[]>([0, 0, 0, 0]);
  const lastGlobalSpawnRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const laneFlashRef = useRef<number[]>([0, 0, 0, 0]);

  // Lane is now random (0-3) for each tile

  useEffect(() => {
    if (!isPlaying) {
      tilesRef.current = [];
      pitchBufferRef.current = [];
      modeBufferRef.current = [];
      laneCooldownRef.current = [0, 0, 0, 0];
      setCombo(0);
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
    const hitZoneY = canvas.height * 0.8;
    const hitZoneHeight = 50;
    const flashDuration = 150; // ms


    const update = () => {
      const now = performance.now();
      const windowSize = 200; // ms, for pitch averaging

      // Add current frequency to buffer if it's valid
      if (frequency > 0) {
        pitchBufferRef.current.push(frequency);
        modeBufferRef.current.push(isVocal);
      }

      // Process sampling window
      if (now - lastWindowTimeRef.current >= windowSize) {
        if (pitchBufferRef.current.length > 0) {
          const avgFreq = pitchBufferRef.current.reduce((a, b) => a + b, 0) / pitchBufferRef.current.length;
          const vocalVotes = modeBufferRef.current.filter(Boolean).length;
          const tileIsVocal = vocalVotes >= Math.ceil(modeBufferRef.current.length / 2);
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
              if (tileIsVocal) {
                grad.addColorStop(0, "#ff3ea5");
                grad.addColorStop(0.7, "#ff3ea588");
                grad.addColorStop(1, "#2a0124");
              } else {
                grad.addColorStop(0, "#0ff");
                grad.addColorStop(0.7, "#0ff8");
                grad.addColorStop(1, "#012");
              }
              tilesRef.current.push({
                id: nextTileIdRef.current++,
                lane,
                x,
                y: 0,
                width,
                height,
                speed,
                gradient: grad,
                isVocal: tileIsVocal,
              });
              lastGlobalSpawnRef.current = now;
            }
          }
          pitchBufferRef.current = [];
          modeBufferRef.current = [];
        }
        lastWindowTimeRef.current = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hit zone
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(0, hitZoneY - hitZoneHeight / 2, canvas.width, hitZoneHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, hitZoneY);
      ctx.lineTo(canvas.width, hitZoneY);
      ctx.stroke();
      ctx.restore();

      // Draw lanes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
      }

      // Lane flash feedback
      for (let i = 0; i < laneCount; i++) {
        const flashStart = laneFlashRef.current[i];
        if (flashStart && now - flashStart < flashDuration) {
          const alpha = 1 - (now - flashStart) / flashDuration;
          ctx.save();
          ctx.fillStyle = `rgba(255, 62, 165, ${0.25 * alpha})`;
          ctx.fillRect(i * laneWidth, 0, laneWidth, canvas.height);
          ctx.restore();
        }
      }

      const buildGradient = (x: number, height: number, isVocalTile: boolean) => {
        const grad = ctx.createLinearGradient(x, 0, x, height);
        if (isVocalTile) {
          grad.addColorStop(0, "#ff3ea5");
          grad.addColorStop(0.7, "#ff3ea588");
          grad.addColorStop(1, "#2a0124");
        } else {
          grad.addColorStop(0, "#0ff");
          grad.addColorStop(0.7, "#0ff8");
          grad.addColorStop(1, "#012");
        }
        return grad;
      };

      // Update positions
      tilesRef.current.forEach((tile) => {
        tile.y += tile.speed;
      });

      // Merge overlapping tiles into one long tile per lane
      const mergedTiles: Tile[] = [];
      const tilesByLane: Tile[][] = Array.from({ length: laneCount }, () => []);
      for (const tile of tilesRef.current) {
        tilesByLane[tile.lane]?.push(tile);
      }
      for (const laneTiles of tilesByLane) {
        laneTiles.sort((a: Tile, b: Tile) => a.y - b.y);
        let current = laneTiles[0];
        for (let i = 1; i < laneTiles.length; i++) {
          const next = laneTiles[i];
          const overlaps = next.y <= current.y + current.height;
          if (overlaps) {
            const end = Math.max(current.y + current.height, next.y + next.height);
            current.height = end - current.y;
            current.isVocal = current.isVocal || next.isVocal;
            current.gradient = buildGradient(current.x, current.height, current.isVocal);
          } else {
            mergedTiles.push(current);
            current = next;
          }
        }
        if (current) mergedTiles.push(current);
      }
      tilesRef.current = mergedTiles;

      // Draw tiles
      tilesRef.current = tilesRef.current.filter((tile) => {
        ctx.save();
        ctx.shadowBlur = tile.isVocal ? 48 : 32;
        ctx.shadowColor = tile.isVocal ? "#ff3ea5" : "#0ff";
        ctx.fillStyle = tile.gradient;
        ctx.beginPath();
        ctx.roundRect(tile.x, tile.y, tile.width, tile.height, 16);
        ctx.fill();
        ctx.restore();
        if (tile.y >= canvas.height) {
          setCombo(0);
          return false;
        }
        return true;
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, frequency, sensitivity, complexity]);

  useEffect(() => {
    const saved = window.localStorage.getItem("tiles-high-score");
    if (saved) {
      const value = Number(saved);
      if (!Number.isNaN(value)) setHighScore(value);
    }
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      window.localStorage.setItem("tiles-high-score", String(score));
    }
  }, [score, highScore]);

  const handleHit = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const laneCount = 4;
    const laneWidth = rect.width / laneCount;
    const lane = Math.min(laneCount - 1, Math.max(0, Math.floor(x / laneWidth)));

    const hitZoneY = canvas.height * 0.8;
    const hitZoneHeight = 50;
    const hitTop = hitZoneY - hitZoneHeight / 2;
    const hitBottom = hitZoneY + hitZoneHeight / 2;

    const tiles = tilesRef.current;
    const index = tiles.findIndex(
      (tile) => tile.lane === lane && tile.y + tile.height >= hitTop && tile.y <= hitBottom
    );

    if (index !== -1) {
      tiles.splice(index, 1);
      setScore((prev) => prev + 10);
      setCombo((prev) => prev + 1);
      laneFlashRef.current[lane] = performance.now();
    } else {
      setCombo(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full h-[400px] bg-black/60 rounded-xl overflow-hidden border border-border/50">
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
          <div className="px-4 py-1 rounded-full bg-black/40 border border-white/10 text-pink-300 font-mono text-lg tracking-widest shadow-[0_0_18px_rgba(255,62,165,0.35)]">
            SCORE {score}
            <span className="ml-4 text-xs text-white/60">HI {highScore}</span>
          </div>
        </div>
        <div className="absolute top-12 inset-x-0 flex justify-center pointer-events-none">
          <div className="text-xs font-mono text-white/60">
            COMBO {combo}
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full h-full"
          onMouseDown={(event) => handleHit(event.clientX)}
          onTouchStart={(event) => handleHit(event.touches[0]?.clientX ?? 0)}
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
