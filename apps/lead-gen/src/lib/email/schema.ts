import { z } from "zod";

export const emailSchema = z.object({
  subject: z.string().describe("Email subject line - concise and engaging"),
  body: z.string().describe("Email body content - personalized and professional"),
  tone: z.enum(["professional", "casual", "friendly"]).optional(),
  estimatedReadTime: z.number().optional(),
});

export type EmailContent = z.infer<typeof emailSchema>;

export const batchEmailSchema = z.object({
  emails: z.array(
    z.object({
      contactEmail: z.string().email(),
      contactName: z.string(),
      subject: z.string(),
      body: z.string(),
      metadata: z
        .object({
          generatedAt: z.string(),
          model: z.string(),
        })
        .optional(),
    })
  ),
  summary: z
    .object({
      total: z.number(),
      avgLength: z.number().optional(),
      commonThemes: z.array(z.string()).optional(),
    })
    .optional(),
});

export type BatchEmailContent = z.infer<typeof batchEmailSchema>;
