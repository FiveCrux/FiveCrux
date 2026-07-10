// Server-side Discord membership verification for giveaway requirements.
//
// Uses the USER's own Discord OAuth token (the `guilds` scope FiveCrux already
// requests at login) — same approach as /api/user/verify-discord-server. NO bot
// token needed; works with the existing DISCORD_CLIENT_ID/SECRET env.
//
// Returns:  true  → confirmed member
//           false → confirmed NOT a member
//           null  → can't verify (no/expired token, API error, unresolved guild)
//                   → caller falls back to the honor-system claim.

/** A requirement is a Discord-join check when its type mentions discord. */
export function isDiscordRequirement(type: string | null | undefined): boolean {
  return typeof type === "string" && type.toLowerCase().includes("discord");
}

/** A raw guild id (snowflake) if the link already contains one. */
export function guildIdFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const m = String(link).match(/\d{15,25}/);
  return m ? m[0] : null;
}

/** Discord invite code from a discord.gg / discord.com/invite link, if present. */
export function inviteCodeFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const m = String(link).match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/i);
  return m ? m[1] : null;
}

export type GuildInfo = {
  guildId: string | null;
  serverName: string | null;
  serverIcon: string | null; // full CDN URL, or null if the guild has no icon
  inviteCode: string | null;
};

/**
 * Resolve an invite link to the server's id, name, and icon URL — via Discord's
 * public (unauthenticated) invite lookup. Used at create time to cache what the
 * giveaway detail page shows next to each "Join" button. All fields null-safe.
 */
export async function resolveGuildInfo(link: string | null | undefined): Promise<GuildInfo> {
  const code = inviteCodeFromLink(link);
  const directId = guildIdFromLink(link);
  const empty: GuildInfo = { guildId: directId, serverName: null, serverIcon: null, inviteCode: code };
  if (!code) return empty;
  try {
    const r = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
    if (!r.ok) return empty;
    const d = await r.json();
    const guild = d?.guild;
    if (!guild?.id) return empty;
    const icon = guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${String(guild.icon).startsWith("a_") ? "gif" : "png"}?size=128`
      : null;
    return {
      guildId: guild.id,
      serverName: guild.name ?? null,
      serverIcon: icon,
      inviteCode: code,
    };
  } catch {
    return empty;
  }
}

/**
 * Resolve a requirement's `link` to a guild id (snowflake). Accepts either a raw
 * guild id or an invite link (resolved via the public invites endpoint). Null if
 * neither works.
 */
export async function resolveGuildId(link: string | null | undefined): Promise<string | null> {
  const direct = guildIdFromLink(link);
  if (direct) return direct;
  const code = inviteCodeFromLink(link);
  if (!code) return null;
  try {
    const r = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.guild?.id ?? null;
  } catch {
    return null;
  }
}

/** True/false if verifiable via the user's token, null if it can't be checked. */
export async function isMemberOfGuild(
  accessToken: string | null | undefined,
  guildId: string
): Promise<boolean | null> {
  if (!accessToken || !guildId) return null;
  try {
    const r = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null; // 401 (expired/no scope), rate-limited, etc.
    const guilds = await r.json();
    return Array.isArray(guilds) ? guilds.some((g: any) => g.id === guildId) : null;
  } catch {
    return null;
  }
}
