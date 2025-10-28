import { z } from "zod";

// In lib/env.ts
export const Env = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_BUCKET_URL: z.string().optional(),
  // DISCORD_WEBHOOK_URL: z.string().url().optional(), // For giveaway winners
  DISCORD_SCRIPT_APPROVAL_WEBHOOK_URL: z.string().url().optional(), // For script approvals
  DISCORD_SCRIPT_PENDING_WEBHOOK_URL: z.string().url().optional(), // For script pending submissions
  DISCORD_SCRIPT_REJECTION_WEBHOOK_URL: z.string().url().optional(), // For script rejections
  DISCORD_GIVEAWAY_APPROVAL_WEBHOOK_URL: z.string().url().optional(), // For giveaway approvals
  DISCORD_GIVEAWAY_WINNER_WEBHOOK_URL: z.string().url().optional(), // For giveaway winners
  DISCORD_GIVEAWAY_PENDING_WEBHOOK_URL: z.string().url().optional(), // For giveaway pending submissions
  DISCORD_GIVEAWAY_REJECTED_WEBHOOK_URL: z.string().url().optional(), // For giveaway rejections
  DISCORD_AD_PENDING_WEBHOOK_URL: z.string().url().optional(), // For ad pending submissions
  DISCORD_AD_APPROVAL_WEBHOOK_URL: z.string().url().optional(), // For ad approvals
  DISCORD_AD_REJECTION_WEBHOOK_URL: z.string().url().optional(), // For ad rejections
});
export const env = Env.parse(process.env);
