import { env } from './env'

type DiscordEmbed = {
  title: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  thumbnail?: { url: string }
  image?: { url: string }
  footer?: { text: string }
  timestamp?: string
}

export async function sendDiscordWebhook(embed: DiscordEmbed) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured')
    return { success: false, error: 'Webhook not configured' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Crux Marketplace',
        embeds: [embed],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Discord webhook error:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send Discord webhook:', error)
    return { success: false, error: String(error) }
  }
}

export async function announceGiveawayWinners(
  giveaway: {
    id: number
    title: string
    coverImage?: string | null
  },
  winners: Array<{
    position: number
    userName: string | null
    userId: string
    prizeName: string
    prizeValue: string
  }>,
) {
  const lines = winners
    .sort((a, b) => a.position - b.position)
    .map(
      (w) => `#${w.position} – <@${w.userId}> (${w.userName ?? 'Unknown'})\nPrize: ${w.prizeName} (${w.prizeValue})`,
    )
    .join('\n\n')

  const embed: DiscordEmbed = {
    title: '🎉 Giveaway Winners Announced!'
    ,description: `Results for **${giveaway.title}**`,
    color: 0xffd700,
    fields: [
      {
        name: 'Winners',
        value: lines || 'No winners selected',
      },
      {
        name: 'Link',
        value: `${env.NEXTAUTH_URL ?? ''}/giveaway/${giveaway.id}`,
      },
    ],
    thumbnail: giveaway.coverImage ? { url: giveaway.coverImage } : undefined,
    footer: { text: 'Crux Marketplace • Giveaway System' },
    timestamp: new Date().toISOString(),
  }

  return await sendDiscordWebhook(embed)
}


