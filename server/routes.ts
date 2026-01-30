import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { products, testimonials } from "@shared/schema";

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  const existingTestimonials = await storage.getTestimonials();

  if (existingProducts.length === 0) {
    await db.insert(products).values([
      {
        name: "50W Solar Panel",
        description: "High-efficiency monocrystalline solar panel perfect for residential installations",
        price: 15000, // in cents = $150
        category: "solar_panel",
        imageUrl: "/images/solar-panel-50w.jpg",
      },
      {
        name: "300W Solar Panel",
        description: "Premium commercial-grade solar panel for industrial applications",
        price: 80000, // $800
        category: "solar_panel",
        imageUrl: "/images/solar-panel-300w.jpg",
      },
      {
        name: "3KW Inverter",
        description: "Pure sine wave inverter with built-in charge controller",
        price: 45000, // $450
        category: "inverter",
        imageUrl: "/images/inverter-3kw.jpg",
      },
      {
        name: "10KW Inverter",
        description: "Heavy-duty inverter for industrial systems and large installations",
        price: 120000, // $1200
        category: "inverter",
        imageUrl: "/images/inverter-10kw.jpg",
      },
      {
        name: "Circuit Breaker Panel",
        description: "Heavy-duty electrical distribution board for homes and industries",
        price: 25000, // $250
        category: "electrical",
        imageUrl: "/images/circuit-breaker.jpg",
      },
      {
        name: "Power Surge Protector",
        description: "Advanced surge protection for sensitive electrical equipment",
        price: 8000, // $80
        category: "electrical",
        imageUrl: "/images/surge-protector.jpg",
      },
      {
        name: "1080p CCTV Camera",
        description: "HD security camera with night vision and motion detection",
        price: 12000, // $120
        category: "security",
        imageUrl: "/images/cctv-camera.jpg",
      },
      {
        name: "Electric Fence System",
        description: "Complete electric fence kit with charger and insulators",
        price: 35000, // $350
        category: "security",
        imageUrl: "/images/electric-fence.jpg",
      },
    ]);
  }

  if (existingTestimonials.length === 0) {
    await db.insert(testimonials).values([
      {
        author: "John Mwangi",
        position: "Business Owner",
        content: "Green Petals Engineering installed a complete solar system for my factory. Professional, efficient, and the system has been running flawlessly for 2 years!",
        rating: 5,
      },
      {
        author: "Sarah Kamau",
        position: "Homeowner",
        content: "Their security system installation was seamless. They integrated CCTV, alarms, and an automated gate perfectly. Highly recommended!",
        rating: 5,
      },
      {
        author: "David Kipchoge",
        position: "Factory Manager",
        content: "Outstanding electrical diagnostics and maintenance work. They identified issues we didn't even know existed. Great team!",
        rating: 5,
      },
      {
        author: "Mary Okonkwo",
        position: "Estate Developer",
        content: "Green Petals handled the complete electrical and plumbing work for our residential complex. Delivered on time and within budget.",
        rating: 4,
      },
    ]);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed database on startup
  await seedDatabase();

  app.post(api.contact.submit.path, async (req, res) => {
    try {
      const input = api.contact.submit.input.parse(req.body);
      const inquiry = await storage.createInquiry(input);
      res.status(201).json(inquiry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.products.list.path, async (req, res) => {
    const allProducts = await storage.getProducts();
    res.json(allProducts);
  });

  app.get(api.testimonials.list.path, async (req, res) => {
    const allTestimonials = await storage.getTestimonials();
    res.json(allTestimonials);
  });

  return httpServer;
}
