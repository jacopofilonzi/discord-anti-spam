import { EmbedBuilder, MessageFlags, PermissionFlagsBits, type ButtonInteraction } from 'discord.js';
import { config } from '../config.js';
import { guildLanguage, languageFromLocale, t } from '../i18n/index.js';
import { logger } from '../logger.js';
import { UNTIMEOUT_BUTTON_PREFIX } from './spamAction.js';

/** Handles the "Remove timeout" button attached to spam reports. */
export async function handleUntimeoutButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  // Replies to the moderator use their own client language
  const language = languageFromLocale(interaction.locale);
  const userId = interaction.customId.slice(UNTIMEOUT_BUTTON_PREFIX.length);

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: t(language, 'button.noPermission'), flags: MessageFlags.Ephemeral });
    return;
  }

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) {
    await interaction.reply({ content: t(language, 'button.memberGone'), flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await member.timeout(null, `Dity Security: removed by ${interaction.user.tag}`);
  } catch (error) {
    logger.error(`Failed to remove timeout for ${member.user.tag}`, error);
    await interaction.reply({ content: t(language, 'button.failed'), flags: MessageFlags.Ephemeral });
    return;
  }

  // Update the report (in the guild language) and remove the button
  const guildLang = guildLanguage(interaction.guild);
  const original = interaction.message.embeds[0];
  const embed = original ? EmbedBuilder.from(original) : new EmbedBuilder();
  embed
    .setColor(config.successColor)
    .addFields({ name: '\u200b', value: t(guildLang, 'report.timeoutRemovedBy', { moderator: `<@${interaction.user.id}>` }) });

  await interaction.update({ embeds: [embed], components: [] });
  await interaction.followUp({
    content: t(language, 'button.removed', { user: `<@${userId}>` }),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}
