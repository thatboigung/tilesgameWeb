
import { useState, useEffect, useCallback } from "react";

export type Analysis = {
  id: string;
  fileName: string;
  bpm: string;
  timestamp?: string;
};

const STORAGE_KEY = "analysis_history";

function getHistory(): Analysis[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(history: Analysis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAnalyses(getHistory());
    setIsLoading(false);
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handler = () => setAnalyses(getHistory());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { data: analyses, isLoading };
}

export function useCreateAnalysis() {
  // Returns a mutate function to add a new analysis
  const addAnalysis = useCallback((data: Omit<Analysis, "id" | "timestamp">) => {
    const history = getHistory();
    const newItem: Analysis = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...history, newItem];
    saveHistory(updated);
    // Trigger storage event for other tabs/components
    window.dispatchEvent(new Event("storage"));
  }, []);

  return { mutate: addAnalysis };
}
