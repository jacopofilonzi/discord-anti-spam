import {
  ChannelType,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
} from 'discord.js';
import { config } from '../config.js';
import { getGuildSettings, setDmNote, setLanguage, setReportChannel } from '../db.js';
import { formatDuration, guildLanguage, LANGUAGES, languageFromLocale, t, type Language } from '../i18n/index.js';

/** Base builder shared by all commands: guild only, reserved to "Manage Server" by default. */
function adminCommand(name: string, description: string, descriptionIt: string): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDescriptionLocalizations({ it: descriptionIt })
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
}

export const commandData = [
  adminCommand('set-channel', 'Set the channel where spam reports are sent', 'Imposta il canale in cui inviare i report di spam')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setNameLocalizations({ it: 'canale' })
        .setDescription('Report channel')
        .setDescriptionLocalizations({ it: 'Canale dei report' })
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    ),
  adminCommand('set-language', 'Set the language used for DMs and reports', 'Imposta la lingua usata per DM e report')
    .addStringOption((option) =>
      option
        .setName('language')
        .setNameLocalizations({ it: 'lingua' })
        .setDescription('Language')
        .setDescriptionLocalizations({ it: 'Lingua' })
        .setRequired(true)
        .addChoices(...LANGUAGES.map((lang) => ({ name: t(lang, `language.${lang}`), value: lang }))),
    ),
  adminCommand(
    'set-note',
    'Set a note sent to users together with the DM (leave empty to remove it)',
    'Imposta una nota inviata agli utenti insieme al DM (lascia vuoto per rimuoverla)',
  ).addStringOption((option) =>
    option
      .setName('note')
      .setNameLocalizations({ it: 'nota' })
      .setDescription('Text of the note. You can mention users with @. Use \\n for a new line')
      .setDescriptionLocalizations({ it: 'Testo della nota. Puoi menzionare utenti con @. Usa \\n per andare a capo' })
      .setMaxLength(1500)
      .setRequired(false),
  ),
  adminCommand('settings', 'Show the current Dity Security settings', 'Mostra le impostazioni attuali di Dity Security'),
].map((command) => command.toJSON());

type Handler = (interaction: ChatInputCommandInteraction<'cached'>, language: Language) => Promise<void>;

const handlers: Record<string, Handler> = {
  'set-channel': async (interaction, language) => {
    const channel = interaction.options.getChannel('channel', true) as GuildTextBasedChannel;
    const me = interaction.guild.members.me;
    const permissions = me ? channel.permissionsFor(me) : null;
    const canWrite = permissions?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ]);

    if (!canWrite) {
      await interaction.reply({
        content: t(language, 'cmd.setChannel.missingPerms', { channel: `<#${channel.id}>` }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    setReportChannel(interaction.guildId, channel.id);
    await interaction.reply({
      content: t(language, 'cmd.setChannel.done', { channel: `<#${channel.id}>` }),
      flags: MessageFlags.Ephemeral,
    });
  },

  'set-language': async (interaction) => {
    const selected = interaction.options.getString('language', true) as Language;
    setLanguage(interaction.guildId, selected);
    // Confirm in the newly selected language
    await interaction.reply({
      content: t(selected, 'cmd.setLanguage.done', { language: t(selected, `language.${selected}`) }),
      flags: MessageFlags.Ephemeral,
    });
  },

  'set-note': async (interaction, language) => {
    // Slash command options are single-line: allow "\n" as a manual line break
    const raw = interaction.options.getString('note')?.replace(/\\n/g, '\n').trim();
    if (!raw) {
      setDmNote(interaction.guildId, null);
      await interaction.reply({ content: t(language, 'cmd.setNote.cleared'), flags: MessageFlags.Ephemeral });
      return;
    }

    setDmNote(interaction.guildId, raw);
    // Preview exactly as the user will receive it (mentions shown, nobody pinged)
    const guildLang = guildLanguage(interaction.guild);
    await interaction.reply({
      content: `${t(language, 'cmd.setNote.done')}\n\n${t(guildLang, 'dm.noteHeader', { guild: interaction.guild.name })}\n${raw}`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    });
  },

  settings: async (interaction, language) => {
    const settings = getGuildSettings(interaction.guildId);
    const effective = guildLanguage(interaction.guild);
    const notSet = t(language, 'cmd.settings.notSet');

    const embed = new EmbedBuilder()
      .setColor(config.brandColor)
      .setAuthor({ name: 'Dity Security', iconURL: interaction.client.user.displayAvatarURL() })
      .setTitle(t(language, 'cmd.settings.title'))
      .addFields(
        {
          name: t(language, 'cmd.settings.channel'),
          value: settings.reportChannelId ? `<#${settings.reportChannelId}>` : notSet,
          inline: true,
        },
        {
          name: t(language, 'cmd.settings.language'),
          value: settings.language
            ? t(language, `language.${settings.language}`)
            : t(language, 'cmd.settings.auto', { language: t(language, `language.${effective}`) }),
          inline: true,
        },
        {
          name: t(language, 'cmd.settings.rule'),
          value: t(language, 'cmd.settings.ruleValue', {
            threshold: config.spam.threshold,
            seconds: config.spam.windowMs / 1000,
            channels: config.spam.minChannels,
            timeout: formatDuration(language, config.timeoutMs),
          }),
        },
        { name: t(language, 'cmd.settings.note'), value: settings.dmNote?.slice(0, 1024) ?? notSet },
      );

    if (!settings.reportChannelId) embed.setDescription(t(language, 'cmd.settings.warning'));
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  },
};

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  // Command replies follow the moderator's own Discord client language
  const language = languageFromLocale(interaction.locale);
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: t(language, 'cmd.guildOnly'), flags: MessageFlags.Ephemeral });
    return;
  }
  const handler = handlers[interaction.commandName];
  if (handler) await handler(interaction, language);
}
