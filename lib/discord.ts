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

export async function sendDiscordWebhook(embed: DiscordEmbed, customWebhookUrl?: string) {
  const webhookUrl = customWebhookUrl || env.DISCORD_WEBHOOK_URL
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

export async function announceScriptApproval(
  script: {
    id: number
    title: string
    coverImage?: string | null
    sellerId?: string | null
  },
  seller: {
    id: string
    name: string | null
  },
  approver: {
    id: string
    name: string | null
  }
) {
  const embed: DiscordEmbed = {
    title: '✅ Script Approved!',
    description: `**${script.title}** has been approved and is now live on the marketplace!`,
    color: 0x00ff00, // Green color
    fields: [
      {
        name: 'Creator',
        value: script.sellerId ? `<@${script.sellerId}> (${seller.name ?? 'Unknown'})` : seller.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Approved By',
        value: `<@${approver.id}> (${approver.name ?? 'Admin'})`,
        inline: true,
      },
      {
        name: 'Script ID',
        value: `#${script.id}`,
        inline: true,
      },
      {
        name: 'Link',
        value: `${env.NEXTAUTH_URL ?? ''}/script/${script.id}`,
      },
    ],
    thumbnail: script.coverImage ? { url: script.coverImage } : undefined,
    footer: { text: 'Crux Marketplace • Script Approval System' },
    timestamp: new Date().toISOString(),
  }

  // Use the script approval webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_SCRIPT_APPROVAL_WEBHOOK_URL)
}

export async function announceScriptPending(
  script: {
    id: number
    title: string
    description: string
    price: string
    category: string
    coverImage?: string | null
    sellerId?: string | null
  },
  seller: {
    id: string
    name: string | null
  },
  isUpdate: boolean = false
) {
  const embed: DiscordEmbed = {
    title: isUpdate ? '🔄 Script Updated - Re-approval Required!' : '📝 New Script Submission!',
    description: isUpdate 
      ? `**${script.title}** has been updated and is awaiting re-approval.`
      : `**${script.title}** has been submitted and is awaiting approval.`,
    color: isUpdate ? 0x3498db : 0xffa500, // Blue for updates, Orange for new submissions
    fields: [
      {
        name: 'Creator',
        value: script.sellerId ? `<@${script.sellerId}> (${seller.name ?? 'Unknown'})` : seller.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Script ID',
        value: `#${script.id}`,
        inline: true,
      },
      {
        name: 'Price',
        value: `$${script.price}`,
        inline: true,
      },
      {
        name: 'Category',
        value: script.category,
        inline: true,
      },
      {
        name: 'Description',
        value: script.description.length > 200 
          ? script.description.substring(0, 200) + '...' 
          : script.description,
      },
      {
        name: 'Admin Panel',
        value: `${env.NEXTAUTH_URL ?? ''}/admin`,
      },
    ],
    thumbnail: script.coverImage ? { url: script.coverImage } : undefined,
    footer: { text: isUpdate ? 'Crux Marketplace • Script Update System' : 'Crux Marketplace • Script Submission System' },
    timestamp: new Date().toISOString(),
  }

  // Use the script pending webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_SCRIPT_PENDING_WEBHOOK_URL)
}

export async function announceScriptRejection(
  script: {
    id: number
    title: string
    description: string
    coverImage?: string | null
    sellerId?: string | null
  },
  seller: {
    id: string
    name: string | null
  },
  rejectionReason: string,
  rejectedBy: {
    id: string
    name: string | null
  }
) {
  const embed: DiscordEmbed = {
    title: '❌ Script Rejected',
    description: `**${script.title}** has been rejected by the admin team.`,
    color: 0xff0000, // Red color for rejection
    fields: [
      {
        name: 'Creator',
        value: script.sellerId ? `<@${script.sellerId}> (${seller.name ?? 'Unknown'})` : seller.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Rejected By',
        value: `<@${rejectedBy.id}> (${rejectedBy.name ?? 'Admin'})`,
        inline: true,
      },
      {
        name: 'Script ID',
        value: `#${script.id}`,
        inline: true,
      },
      {
        name: 'Rejection Reason',
        value: rejectionReason.length > 500 
          ? rejectionReason.substring(0, 500) + '...' 
          : rejectionReason,
      },
      {
        name: 'Description',
        value: script.description.length > 200 
          ? script.description.substring(0, 200) + '...' 
          : script.description,
      },
    ],
    thumbnail: script.coverImage ? { url: script.coverImage } : undefined,
    footer: { text: 'Crux Marketplace • Script Rejection System' },
    timestamp: new Date().toISOString(),
  }

  // Use the script rejection webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_SCRIPT_REJECTION_WEBHOOK_URL)
}

export async function announceGiveawayApproval(
  giveaway: {
    id: number
    title: string
    totalValue: string
    difficulty: string
    endDate: string
    coverImage?: string | null
    creatorId?: string | null
  },
  creator: {
    id: string
    name: string | null
  },
  approver: {
    id: string
    name: string | null
  }
) {
  const embed: DiscordEmbed = {
    title: '✅ Giveaway Approved!',
    description: `**${giveaway.title}** has been approved and is now live!`,
    color: 0x00ff00, // Green color
    fields: [
      {
        name: 'Creator',
        value: giveaway.creatorId ? `<@${giveaway.creatorId}> (${creator.name ?? 'Unknown'})` : creator.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Approved By',
        value: `<@${approver.id}> (${approver.name ?? 'Admin'})`,
        inline: true,
      },
      {
        name: 'Giveaway ID',
        value: `#${giveaway.id}`,
        inline: true,
      },
      {
        name: 'Total Value',
        value: giveaway.totalValue,
        inline: true,
      },
      {
        name: 'Difficulty',
        value: giveaway.difficulty,
        inline: true,
      },
      {
        name: 'End Date',
        value: new Date(giveaway.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        inline: true,
      },
      {
        name: 'Link',
        value: `${env.NEXTAUTH_URL ?? ''}/giveaway/${giveaway.id}`,
      },
    ],
    thumbnail: giveaway.coverImage ? { url: giveaway.coverImage } : undefined,
    footer: { text: 'Crux Marketplace • Giveaway Approval System' },
    timestamp: new Date().toISOString(),
  }

  // Use the giveaway approval webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_GIVEAWAY_APPROVAL_WEBHOOK_URL)
}

export async function announceGiveawayPending(
  giveaway: {
    id: number
    title: string
    description: string
    totalValue: string
    difficulty: string
    endDate: string
    coverImage?: string | null
    creatorId?: string | null
  },
  creator: {
    id: string
    name: string | null
  },
  isUpdate: boolean = false
) {
  const embed: DiscordEmbed = {
    title: isUpdate ? '🔄 Giveaway Updated - Re-approval Required!' : '📝 New Giveaway Submission!',
    description: isUpdate 
      ? `**${giveaway.title}** has been updated and is awaiting re-approval.`
      : `**${giveaway.title}** has been submitted and is awaiting approval.`,
    color: isUpdate ? 0x3498db : 0xffa500, // Blue for updates, Orange for new submissions
    fields: [
      {
        name: 'Creator',
        value: giveaway.creatorId ? `<@${giveaway.creatorId}> (${creator.name ?? 'Unknown'})` : creator.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Giveaway ID',
        value: `#${giveaway.id}`,
        inline: true,
      },
      {
        name: 'Total Value',
        value: giveaway.totalValue,
        inline: true,
      },
      {
        name: 'Difficulty',
        value: giveaway.difficulty,
        inline: true,
      },
      {
        name: 'End Date',
        value: new Date(giveaway.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        inline: true,
      },
      {
        name: 'Description',
        value: giveaway.description.length > 200 
          ? giveaway.description.substring(0, 200) + '...' 
          : giveaway.description,
      },
      {
        name: 'Admin Panel',
        value: `${env.NEXTAUTH_URL ?? ''}/admin`,
      },
    ],
    thumbnail: giveaway.coverImage ? { url: giveaway.coverImage } : undefined,
    footer: { text: isUpdate ? 'Crux Marketplace • Giveaway Update System' : 'Crux Marketplace • Giveaway Submission System' },
    timestamp: new Date().toISOString(),
  }

  // Use the giveaway pending webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_GIVEAWAY_PENDING_WEBHOOK_URL)
}

export async function announceGiveawayRejection(
  giveaway: {
    id: number
    title: string
    description: string
    coverImage?: string | null
    creatorId?: string | null
  },
  creator: {
    id: string
    name: string | null
  },
  rejectionReason: string,
  rejectedBy: {
    id: string
    name: string | null
  }
) {
  const embed: DiscordEmbed = {
    title: '❌ Giveaway Rejected',
    description: `**${giveaway.title}** has been rejected by the admin team.`,
    color: 0xff0000, // Red color for rejection
    fields: [
      {
        name: 'Creator',
        value: giveaway.creatorId ? `<@${giveaway.creatorId}> (${creator.name ?? 'Unknown'})` : creator.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Rejected By',
        value: `<@${rejectedBy.id}> (${rejectedBy.name ?? 'Admin'})`,
        inline: true,
      },
      {
        name: 'Giveaway ID',
        value: `#${giveaway.id}`,
        inline: true,
      },
      {
        name: 'Rejection Reason',
        value: rejectionReason.length > 500 
          ? rejectionReason.substring(0, 500) + '...' 
          : rejectionReason,
      },
      {
        name: 'Description',
        value: giveaway.description.length > 200 
          ? giveaway.description.substring(0, 200) + '...' 
          : giveaway.description,
      },
    ],
    thumbnail: giveaway.coverImage ? { url: giveaway.coverImage } : undefined,
    footer: { text: 'Crux Marketplace • Giveaway Rejection System' },
    timestamp: new Date().toISOString(),
  }

  // Use the giveaway rejection webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_GIVEAWAY_REJECTED_WEBHOOK_URL)
}

export async function announceAdPending(
  ad: {
    id: number
    title: string
    description: string
    category: string
    linkUrl?: string | null
    imageUrl?: string | null
    createdBy?: string | null
  },
  creator: {
    id: string
    name: string | null
  },
  isUpdate: boolean = false
) {
  const embed: DiscordEmbed = {
    title: isUpdate ? '🔄 Ad Updated - Re-approval Required!' : '📝 New Ad Submission!',
    description: isUpdate 
      ? `**${ad.title}** has been updated and is awaiting re-approval.`
      : `**${ad.title}** has been submitted and is awaiting approval.`,
    color: isUpdate ? 0x3498db : 0xffa500, // Blue for updates, Orange for new submissions
    fields: [
      {
        name: 'Creator',
        value: ad.createdBy ? `<@${ad.createdBy}> (${creator.name ?? 'Unknown'})` : creator.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Ad ID',
        value: `#${ad.id}`,
        inline: true,
      },
      {
        name: 'Category',
        value: ad.category,
        inline: true,
      },
      {
        name: 'Description',
        value: ad.description.length > 200 
          ? ad.description.substring(0, 200) + '...' 
          : ad.description,
      },
      {
        name: 'Link',
        value: ad.linkUrl || 'No link provided',
      },
      {
        name: 'Admin Panel',
        value: `${env.NEXTAUTH_URL ?? ''}/admin`,
      },
    ],
    thumbnail: ad.imageUrl ? { url: ad.imageUrl } : undefined,
    footer: { text: isUpdate ? 'Crux Marketplace • Ad Update System' : 'Crux Marketplace • Ad Submission System' },
    timestamp: new Date().toISOString(),
  }

  // Use the ad pending webhook if configured, otherwise fall back to default
  return await sendDiscordWebhook(embed, env.DISCORD_AD_PENDING_WEBHOOK_URL)
}

export async function announceAdApproval(
  ad: {
    id: number
    title: string
    description: string
    category: string
    linkUrl?: string | null
    imageUrl?: string | null
    createdBy?: string | null
  },
  creator: {
    id: string
    name: string | null
  },
  approver: {
    id: string
    name: string | null
  }
) {
  const embed: DiscordEmbed = {
    title: '✅ Ad Approved!',
    description: `**${ad.title}** has been approved and is now live!`,
    color: 0x00ff00, // Green color
    fields: [
      {
        name: 'Creator',
        value: ad.createdBy ? `<@${ad.createdBy}> (${creator.name ?? 'Unknown'})` : creator.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Approved By',
        value: `<@${approver.id}> (${approver.name ?? 'Admin'})`,
        inline: true,
      },
      {
        name: 'Ad ID',
        value: `#${ad.id}`,
        inline: true,
      },
      {
        name: 'Category',
        value: ad.category,
        inline: true,
      },
      {
        name: 'Description',
        value: ad.description.length > 200 
          ? ad.description.substring(0, 200) + '...' 
          : ad.description,
      },
      {
        name: 'Link',
        value: ad.linkUrl || 'No link provided',
      },
    ],
    thumbnail: ad.imageUrl ? { url: ad.imageUrl } : undefined,
    footer: { text: 'Crux Marketplace • Ad Approval System' },
    timestamp: new Date().toISOString(),
  }

  return await sendDiscordWebhook(embed, env.DISCORD_AD_APPROVAL_WEBHOOK_URL)
}

export async function announceAdRejection(
  ad: {
    id: number
    title: string
    description: string
    category: string
    imageUrl?: string | null
    createdBy?: string | null
  },
  creator: {
    id: string
    name: string | null
  },
  rejectionReason: string,
  rejectedBy: {
    id: string
    name: string | null
  }
) {
  const embed: DiscordEmbed = {
    title: '❌ Ad Rejected',
    description: `**${ad.title}** has been rejected by the admin team.`,
    color: 0xff0000, // Red color
    fields: [
      {
        name: 'Creator',
        value: ad.createdBy ? `<@${ad.createdBy}> (${creator.name ?? 'Unknown'})` : creator.name ?? 'Unknown',
        inline: true,
      },
      {
        name: 'Rejected By',
        value: `<@${rejectedBy.id}> (${rejectedBy.name ?? 'Admin'})`,
        inline: true,
      },
      {
        name: 'Ad ID',
        value: `#${ad.id}`,
        inline: true,
      },
      {
        name: 'Category',
        value: ad.category,
        inline: true,
      },
      {
        name: 'Rejection Reason',
        value: rejectionReason.length > 500 
          ? rejectionReason.substring(0, 500) + '...' 
          : rejectionReason,
      },
      {
        name: 'Description',
        value: ad.description.length > 200 
          ? ad.description.substring(0, 200) + '...' 
          : ad.description,
      },
    ],
    thumbnail: ad.imageUrl ? { url: ad.imageUrl } : undefined,
    footer: { text: 'Crux Marketplace • Ad Rejection System' },
    timestamp: new Date().toISOString(),
  }

  return await sendDiscordWebhook(embed, env.DISCORD_AD_REJECTION_WEBHOOK_URL)
}


