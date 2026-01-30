import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PitchLanesProps {
  frequency: number;
  note: string;
}

export function PitchLanes({ frequency, note }: PitchLanesProps) {
  const lanes = [
    { id: 1, name: "Bass", range: [0, 150], color: "bg-blue-500" },
    { id: 2, name: "Mid-Low", range: [150, 400], color: "bg-green-500" },
    { id: 3, name: "Mid-High", range: [400, 800], color: "bg-yellow-500" },
    { id: 4, name: "High", range: [800, 20000], color: "bg-red-500" },
  ];

  const activeLane = lanes.find(
    (lane) => frequency >= lane.range[0] && frequency < lane.range[1]
  );

  return (
    <div className="grid grid-cols-4 gap-4 w-full h-40">
      {lanes.map((lane) => (
        <div
          key={lane.id}
          className={`relative rounded-xl border-2 transition-all duration-75 flex flex-col items-center justify-end pb-4 overflow-hidden ${
            activeLane?.id === lane.id
              ? "border-primary bg-primary/10 scale-105 shadow-[0_0_30px_rgba(0,255,200,0.3)]"
              : "border-border bg-card/50"
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-tighter opacity-50 mb-1">
            {lane.name}
          </div>
          <div className="font-bold text-sm">
            {activeLane?.id === lane.id ? note : ""}
          </div>
          
          <AnimatePresence>
            {activeLane?.id === lane.id && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute inset-x-0 bottom-0 h-1 ${lane.color} shadow-[0_0_15px_rgba(255,255,255,0.5)]`}
              />
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
