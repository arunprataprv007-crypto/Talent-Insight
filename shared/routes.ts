import { z } from 'zod';
import { insertJobSchema, insertCandidateSchema, insertMatchSchema, insertSourcedLeadSchema, insertCommunicationSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  jobs: {
    list: { method: 'GET' as const, path: '/api/jobs' as const, responses: { 200: z.array(z.any()) } },
    get: { method: 'GET' as const, path: '/api/jobs/:id' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    create: { method: 'POST' as const, path: '/api/jobs' as const, input: insertJobSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    parse: { method: 'POST' as const, path: '/api/jobs/:id/parse' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    rankCandidates: { method: 'POST' as const, path: '/api/jobs/:id/rank-candidates' as const, responses: { 200: z.any() } },
    updateStatus: { method: 'PATCH' as const, path: '/api/jobs/:id/status' as const, input: z.object({ status: z.string() }), responses: { 200: z.any() } },
  },
  candidates: {
    list: { method: 'GET' as const, path: '/api/candidates' as const, input: z.object({ search: z.string().optional() }).optional(), responses: { 200: z.array(z.any()) } },
    get: { method: 'GET' as const, path: '/api/candidates/:id' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    create: { method: 'POST' as const, path: '/api/candidates' as const, input: insertCandidateSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/candidates/:id' as const, responses: { 200: z.any() } },
    parseCv: { method: 'POST' as const, path: '/api/candidates/parse-cv' as const, responses: { 200: z.any() } },
    parseCvFile: { method: 'POST' as const, path: '/api/candidates/parse-cv-file' as const, responses: { 200: z.any() } },
  },
  matches: {
    list: { method: 'GET' as const, path: '/api/matches' as const, input: z.object({ jobId: z.coerce.number().optional(), candidateId: z.coerce.number().optional() }).optional(), responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/matches' as const, input: insertMatchSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/matches/:id' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    generateAnalysis: { method: 'POST' as const, path: '/api/matches/:id/analyze' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    generateQuestions: { method: 'POST' as const, path: '/api/matches/:id/questions' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    updateStatus: { method: 'PATCH' as const, path: '/api/matches/:id/status' as const, input: z.object({ status: z.string() }), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    updateScreeningStatus: { method: 'PATCH' as const, path: '/api/matches/:id/screening-status' as const, input: z.object({ screeningStatus: z.string() }), responses: { 200: z.any() } },
  },
  sourcing: {
    leads: {
      list: { method: 'GET' as const, path: '/api/sourcing/leads' as const, responses: { 200: z.array(z.any()) } },
      create: { method: 'POST' as const, path: '/api/sourcing/leads' as const, input: insertSourcedLeadSchema, responses: { 201: z.any() } },
      import: { method: 'POST' as const, path: '/api/sourcing/leads/:id/import' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
      dismiss: { method: 'PATCH' as const, path: '/api/sourcing/leads/:id/dismiss' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
    },
    search: { method: 'GET' as const, path: '/api/sourcing/search' as const, responses: { 200: z.any() } },
    config: { method: 'GET' as const, path: '/api/sourcing/config' as const, responses: { 200: z.any() } },
  },
  screening: {
    stats: { method: 'GET' as const, path: '/api/screening/stats' as const, responses: { 200: z.any() } },
  },
  boolean: {
    generate: { method: 'POST' as const, path: '/api/boolean/generate' as const, responses: { 200: z.any() } },
  },
  communications: {
    list: { method: 'GET' as const, path: '/api/communications' as const, responses: { 200: z.array(z.any()) } },
    sendEmail: { method: 'POST' as const, path: '/api/communications/email' as const, responses: { 200: z.any() } },
    sendSms: { method: 'POST' as const, path: '/api/communications/sms' as const, responses: { 200: z.any() } },
    initiateCall: { method: 'POST' as const, path: '/api/communications/call' as const, responses: { 200: z.any() } },
    config: { method: 'GET' as const, path: '/api/communications/config' as const, responses: { 200: z.any() } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
