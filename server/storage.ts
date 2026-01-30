import { db } from "./db";
import { inquiries, products, testimonials, type InsertInquiry, type Inquiry, type Product, type Testimonial } from "@shared/schema";

export interface IStorage {
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getProducts(): Promise<Product[]>;
  getTestimonials(): Promise<Testimonial[]>;
}

export class DatabaseStorage implements IStorage {
  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials);
  }
}

export const storage = new DatabaseStorage();
