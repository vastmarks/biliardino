/**
 * Imported from `next.config.js`, so the app refuses to build/start with invalid env vars.
 * It has to be a `.js` file to be imported there.
 */
const { z } = require("zod");

const envSchema = z.object({
  // SQLite connection string, e.g. file:./data/hilde.db
  DATABASE_URL: z.string().startsWith("file:"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  NEXTAUTH_SECRET: z
    .string()
    .min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error(
    "Invalid environment variables:",
    JSON.stringify(env.error.format(), null, 2),
  );
  process.exit(1);
}
module.exports.env = env.data;
