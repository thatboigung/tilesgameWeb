import { db } from "./db";
import { analyses, type InsertAnalysis, type Analysis } from "@shared/schema";

export interface IStorage {
  getAnalyses(): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
}

export class DatabaseStorage implements IStorage {
  async getAnalyses(): Promise<Analysis[]> {
    return await db.select().from(analyses);
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(insertAnalysis).returning();
    return analysis;
  }
}

export const storage = new DatabaseStorage();
