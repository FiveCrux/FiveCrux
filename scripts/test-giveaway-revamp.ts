// Giveaway revamp (Phase 1): use_points entry mode + cached Discord server info
// on requirements + simplified prizes. Tests the DB layer + invite-parsing pure
// helpers (no network). Run: npx tsx scripts/test-giveaway-revamp.ts

process.env.USE_PGLITE = "true";
process.env.PGLITE_DIR = "./.pglite-test-gv";
process.env.DATABASE_URL ||= "postgres://placeholder/local";
process.env.NEXTAUTH_SECRET ||= "x";
process.env.DISCORD_CLIENT_ID ||= "x";
process.env.DISCORD_CLIENT_SECRET ||= "x";

import { rmSync } from "node:fs";

async function main() {
  rmSync("./.pglite-test-gv", { recursive: true, force: true });
  const { db } = await import("../lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("../lib/db/schema");
  const { createGiveaway, createGiveawayRequirement, createGiveawayPrize } = await import("../lib/database-new");
  const { inviteCodeFromLink, guildIdFromLink } = await import("../lib/discord-verify");
  const { eq } = await import("drizzle-orm");

  await migrate(db as any, { migrationsFolder: "./drizzle" });

  await db.insert(schema.users).values([
    { id: "hostA", name: "Host A", roles: ["user"] },
  ]).onConflictDoNothing();

  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name}`); }
  };

  // 1. Pure invite-parsing helpers (no network).
  check("inviteCodeFromLink parses discord.gg", inviteCodeFromLink("https://discord.gg/abc123") === "abc123");
  check("inviteCodeFromLink parses discord.com/invite", inviteCodeFromLink("https://discord.com/invite/XyZ-9") === "XyZ-9");
  check("inviteCodeFromLink null for non-invite", inviteCodeFromLink("https://youtube.com/@x") === null);
  check("guildIdFromLink pulls a snowflake", guildIdFromLink("https://discord.com/channels/123456789012345678/1") === "123456789012345678");

  // 2. createGiveaway persists use_points = true.
  const gid = await createGiveaway({
    title: "Points GA", description: "desc here long enough",
    end_date: new Date(Date.now() + 7 * 864e5).toISOString(),
    creator_name: "Host A", creator_email: "a@x.com", creator_id: "hostA",
    use_points: true, status: "pending",
  } as any);
  const row = await db.query.pendingGiveaways.findFirst({ where: eq(schema.pendingGiveaways.id, gid!) });
  check("giveaway created in pending", !!row);
  check("use_points persisted true", row?.usePoints === true);
  check("total_value defaults to '0' (no value field)", row?.totalValue === "0");

  // 3. createGiveaway defaults use_points = false when omitted.
  const gid2 = await createGiveaway({
    title: "Equal GA", description: "another description",
    end_date: new Date(Date.now() + 7 * 864e5).toISOString(),
    creator_name: "Host A", creator_email: "a@x.com", creator_id: "hostA",
    status: "pending",
  } as any);
  const row2 = await db.query.pendingGiveaways.findFirst({ where: eq(schema.pendingGiveaways.id, gid2!) });
  check("use_points defaults false", row2?.usePoints === false);

  // 4. Requirement stores cached Discord server info.
  const rid = await createGiveawayRequirement({
    giveaway_id: gid, type: "discord", description: "https://discord.gg/abc123",
    link: "https://discord.gg/abc123", points: 1, required: true,
    guild_id: "111222333444555666", server_name: "Test Server",
    server_icon: "https://cdn.discordapp.com/icons/111/abc.png", invite_code: "abc123",
  } as any);
  const req = await db.query.giveawayRequirements.findFirst({ where: eq(schema.giveawayRequirements.id, rid!) });
  check("requirement guildId cached", req?.guildId === "111222333444555666");
  check("requirement serverName cached", req?.serverName === "Test Server");
  check("requirement serverIcon cached", (req?.serverIcon || "").includes("cdn.discordapp.com"));
  check("requirement inviteCode cached", req?.inviteCode === "abc123");
  check("requirement points = 1", req?.points === 1);

  // 5. Prize stores name + winners (value defaulted, no description required).
  const pid = await createGiveawayPrize({
    giveaway_id: gid, name: "Script of choice", number_of_winners: 3, position: 1, value: "0",
  } as any);
  const prize = await db.query.giveawayPrizes.findFirst({ where: eq(schema.giveawayPrizes.id, pid!) });
  check("prize name persisted", prize?.name === "Script of choice");
  check("prize winners persisted", prize?.numberOfWinners === 3);

  console.log(`\n${pass}/${pass + fail} passing`);
  rmSync("./.pglite-test-gv", { recursive: true, force: true });
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
