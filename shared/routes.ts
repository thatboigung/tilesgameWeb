import { z } from 'zod';
import { insertAnalysisSchema, analyses } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  analyses: {
    list: {
      method: 'GET' as const,
      path: '/api/analyses',
      responses: {
        200: z.array(z.custom<typeof analyses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/analyses',
      input: insertAnalysisSchema,
      responses: {
        201: z.custom<typeof analyses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
