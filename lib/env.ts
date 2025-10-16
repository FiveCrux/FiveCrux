import { z } from "zod";

// In lib/env.ts
export const Env = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});
export const env = Env.parse(process.env);
