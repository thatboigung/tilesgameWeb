import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  bpm: text("bpm").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({ 
  id: true, 
  timestamp: true 
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
