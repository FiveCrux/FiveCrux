require("dotenv/config");

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const migrationPath = path.join(
    __dirname,
    "..",
    "drizzle",
    "0004_props_approval_system.sql"
  );

  const migrationSql = fs.existsSync(migrationPath)
    ? fs.readFileSync(migrationPath, "utf8")
    : `
CREATE TABLE IF NOT EXISTS "pending_props" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "discount_percentage" numeric(5, 2) DEFAULT '0',
  "discounted_price" numeric(10, 2),
  "images" text[] DEFAULT '{}',
  "zip_file" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "submitted_at" timestamp DEFAULT now(),
  "admin_notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approved_props" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "discount_percentage" numeric(5, 2) DEFAULT '0',
  "discounted_price" numeric(10, 2),
  "images" text[] DEFAULT '{}',
  "zip_file" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "approved_at" timestamp DEFAULT now(),
  "approved_by" text,
  "admin_notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rejected_props" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "discount_percentage" numeric(5, 2) DEFAULT '0',
  "discounted_price" numeric(10, 2),
  "images" text[] DEFAULT '{}',
  "zip_file" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "rejected_at" timestamp DEFAULT now(),
  "rejected_by" text,
  "rejection_reason" text NOT NULL,
  "admin_notes" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_props" ADD CONSTRAINT "pending_props_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approved_props" ADD CONSTRAINT "approved_props_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rejected_props" ADD CONSTRAINT "rejected_props_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.props') IS NOT NULL THEN
    INSERT INTO "approved_props" (
      "id", "name", "description", "price", "discount_percentage",
      "discounted_price", "images", "zip_file", "created_by",
      "created_at", "updated_at", "approved_at"
    )
    SELECT
      "id", "name", "description", "price", "discount_percentage",
      "discounted_price", "images", "zip_file", "created_by",
      "created_at", "updated_at", COALESCE("created_at", now())
    FROM "props"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;
`;

  const sql = migrationSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const statement of sql) {
      await client.query(statement);
    }
    console.log("Props approval migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
