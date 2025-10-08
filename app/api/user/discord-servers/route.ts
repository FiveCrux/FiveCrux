import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: "No Discord access token" }, { status: 400 });
    }

    // Fetch user's Discord servers
    const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!discordResponse.ok) {
      console.error('Discord API error:', discordResponse.status, await discordResponse.text());
      return NextResponse.json({ error: "Failed to fetch Discord servers" }, { status: 500 });
    }

    const guilds = await discordResponse.json();
    
    // Transform the data to include useful information
    const transformedGuilds = guilds.map((guild: any) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
      owner: guild.owner,
      permissions: guild.permissions,
      features: guild.features,
      approximate_member_count: guild.approximate_member_count,
      approximate_presence_count: guild.approximate_presence_count,
    }));

    return NextResponse.json({ 
      guilds: transformedGuilds,
      total: transformedGuilds.length 
    });

  } catch (error) {
    console.error('Error fetching Discord servers:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
