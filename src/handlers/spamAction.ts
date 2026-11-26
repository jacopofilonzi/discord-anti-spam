import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type GuildMember,
  type Message,
} from 'discord.js';
import { config } from '../config.js';
import { getGuildSettings } from '../db.js';
import { guildLanguage, t, type Language } from '../i18n/index.js';
import { logger } from '../logger.js';
import type { Detection } from '../detection/tracker.js';

/** Custom id prefix of the "Remove timeout" button: `dity:untimeout:<userId>`. */
export const UNTIMEOUT_BUTTON_PREFIX = 'dity:untimeout:';

/** Discord timestamp markup, rendered in each viewer's own locale and timezone. */
function discordTime(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

/** Shows the spam content inside a code block so links in it are not clickable. */
function formatContent(language: Language, message: Message): string {
  const text = message.content.replace(/```/g, '`\u200b``');
  const parts: string[] = [];
  parts.push(text ? `\`\`\`\n${text.length > 900 ? `${text.slice(0, 900)}…` : text}\n\`\`\`` : t(language, 'report.noText'));
  if (message.attachments.size > 0) parts.push(t(language, 'report.attachments', { count: message.attachments.size }));
  return parts.join('\n');
}

async function applyTimeout(member: GuildMember | null, language: Language): Promise<Date | null> {
  if (!member?.moderatable) return null;
  try {
    await member.timeout(config.timeoutMs, `Dity Security: ${t(language, 'report.title')}`);
    return new Date(Date.now() + config.timeoutMs);
  } catch (error) {
    logger.error(`Failed to time out ${member.user.tag} in ${member.guild.name}`, error);
    return null;
  }
}

async function deleteMessages(messages: Message[]): Promise<number> {
  const results = await Promise.allSettled(messages.map((m) => m.delete()));
  return results.filter((r) => r.status === 'fulfilled').length;
}

async function notifyUser(guild: Guild, member: GuildMember | null, message: Message, language: Language, timedOutUntil: Date | null): Promise<boolean> {
  const user = member?.user ?? message.author;
  const { dmNote } = getGuildSettings(guild.id);

  const description = [t(language, 'dm.body', { user: user.username, guild: guild.name })];
  if (timedOutUntil) description.push(t(language, 'dm.timedOut', { guild: guild.name, until: discordTime(timedOutUntil) }));

  const embed = new EmbedBuilder()
    .setColor(config.dangerColor)
    .setTitle(`⚠️ ${t(language, 'dm.title')}`)
    .setDescription(description.join('\n\n'))
    .addFields({ name: t(language, 'dm.stepsTitle'), value: t(language, 'dm.steps') })
    .setFooter({ text: t(language, 'dm.footer'), iconURL: guild.iconURL() ?? undefined })
    .setTimestamp();

  try {
    await user.send({ embeds: [embed] });
    // The note goes in plain content (not an embed) so user mentions like <@id> resolve to names
    if (dmNote) {
      await user.send({
        content: `${t(language, 'dm.noteHeader', { guild: guild.name })}\n${dmNote}`,
        allowedMentions: { parse: ['users'] },
      });
    }
    return true;
  } catch {
    return false; // DMs closed or user blocked the bot
  }
}

async function sendReport(
  client: Client,
  guild: Guild,
  detection: Detection,
  language: Language,
  outcome: { timedOutUntil: Date | null; deleted: number; dmSent: boolean },
): Promise<void> {
  const { reportChannelId } = getGuildSettings(guild.id);
  if (!reportChannelId) {
    logger.warn(`No report channel set for guild ${guild.name} (${guild.id}); skipping report`);
    return;
  }

  const channel = await guild.channels.fetch(reportChannelId).catch(() => null);
  if (!channel?.isTextBased()) {
    logger.warn(`Report channel ${reportChannelId} of guild ${guild.name} is missing or not text based`);
    return;
  }

  const first = detection.messages[0]!;
  const user = first.author;
  const channelIds = [...new Set(detection.messages.map((m) => m.channelId))];

  const actions = [
    outcome.timedOutUntil
      ? t(language, 'report.timeoutOk', { until: discordTime(outcome.timedOutUntil) })
      : t(language, 'report.timeoutFailed'),
    t(language, 'report.deleted', { deleted: outcome.deleted, total: detection.messages.length }),
    outcome.dmSent ? t(language, 'report.dmOk') : t(language, 'report.dmFailed'),
  ];

  const embed = new EmbedBuilder()
    .setColor(config.dangerColor)
    .setAuthor({ name: 'Dity Security', iconURL: client.user?.displayAvatarURL() })
    .setTitle(`🚨 ${t(language, 'report.title')}`)
    .setDescription(
      t(language, 'report.description', {
        user: `<@${user.id}>`,
        channels: channelIds.length,
        seconds: Math.max(1, Math.round(detection.spanMs / 1000)),
      }),
    )
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: t(language, 'report.fieldUser'), value: `<@${user.id}>\n\`${user.tag}\`\n\`${user.id}\``, inline: true },
      { name: t(language, 'report.fieldChannels'), value: channelIds.map((id) => `<#${id}>`).join('\n'), inline: true },
      { name: t(language, 'report.fieldContent'), value: formatContent(language, first) },
      { name: t(language, 'report.fieldActions'), value: actions.join('\n') },
    )
    .setTimestamp();

  const components = outcome.timedOutUntil
    ? [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${UNTIMEOUT_BUTTON_PREFIX}${user.id}`)
            .setLabel(t(language, 'report.removeTimeout'))
            .setEmoji('🔓')
            .setStyle(ButtonStyle.Secondary),
        ),
      ]
    : [];

  try {
    await channel.send({ embeds: [embed], components, allowedMentions: { parse: [] } });
  } catch (error) {
    logger.error(`Failed to send report in guild ${guild.name}`, error);
  }
}

/** Runs the full response to a detected spam burst: timeout, delete, DM, report. */
export async function handleSpam(client: Client, detection: Detection): Promise<void> {
  const first = detection.messages[0]!;
  const guild = first.guild!;
  const language = guildLanguage(guild);
  const member = first.member ?? (await guild.members.fetch(first.author.id).catch(() => null));

  logger.info(
    `Spam detected from ${first.author.tag} (${first.author.id}) in ${guild.name}: ${detection.messages.length} messages`,
  );

  // Timeout first so the account stops posting as soon as possible
  const timedOutUntil = await applyTimeout(member, language);
  const deleted = await deleteMessages(detection.messages);
  const dmSent = await notifyUser(guild, member, first, language, timedOutUntil);
  await sendReport(client, guild, detection, language, { timedOutUntil, deleted, dmSent });
}

/** Deletes a late copy of spam that is already being handled. */
export async function deleteLateCopy(message: Message): Promise<void> {
  await message.delete().catch(() => undefined);
}

/** Permissions the bot needs to work; used to build the invite link. */
export const REQUIRED_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.ModerateMembers;
