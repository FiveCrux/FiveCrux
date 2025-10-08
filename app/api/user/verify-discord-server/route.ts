import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serverId } = await request.json();
    
    if (!serverId) {
      return NextResponse.json({ error: "Server ID is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Failed to verify Discord server membership" }, { status: 500 });
    }

    const guilds = await discordResponse.json();
    
    // Check if user is a member of the specified server
    const isMember = guilds.some((guild: any) => guild.id === serverId);
    
    if (isMember) {
      // Get server details for the joined server
      const joinedServer = guilds.find((guild: any) => guild.id === serverId);
      return NextResponse.json({ 
        joined: true,
        server: {
          id: joinedServer.id,
          name: joinedServer.name,
          icon: joinedServer.icon ? `https://cdn.discordapp.com/icons/${joinedServer.id}/${joinedServer.icon}.png` : null,
          owner: joinedServer.owner,
          permissions: joinedServer.permissions,
        }
      });
    } else {
      return NextResponse.json({ 
        joined: false,
        message: "User is not a member of this Discord server"
      });
    }

  } catch (error) {
    console.error('Error verifying Discord server membership:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
