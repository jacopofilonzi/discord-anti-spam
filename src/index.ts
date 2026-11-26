import { Client, Events, GatewayIntentBits, MessageFlags, OAuth2Scopes, type Interaction, type Message } from 'discord.js';
import { config } from './config.js';
import { closeDatabase, deleteGuildSettings } from './db.js';
import { commandData, handleCommand } from './commands/index.js';
import { fingerprintMessage } from './detection/fingerprint.js';
import { SpamTracker } from './detection/tracker.js';
import { deleteLateCopy, handleSpam, REQUIRED_PERMISSIONS, UNTIMEOUT_BUTTON_PREFIX } from './handlers/spamAction.js';
import { handleUntimeoutButton } from './handlers/untimeoutButton.js';
import { languageFromLocale, t } from './i18n/index.js';
import { logger } from './logger.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Privileged: must be enabled in the Developer Portal (Bot → Message Content Intent)
    GatewayIntentBits.MessageContent,
  ],
});

const tracker = new SpamTracker(config.spam);

client.once(Events.ClientReady, async (ready) => {
  logger.info(`Logged in as ${ready.user.tag}, serving ${ready.guilds.cache.size} server(s)`);
  try {
    // Global registration: simple, and fine for a self-hosted bot
    await ready.application.commands.set(commandData);
    logger.info(`Registered ${commandData.length} slash commands`);
  } catch (error) {
    logger.error('Failed to register slash commands', error);
  }
  const invite = ready.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: REQUIRED_PERMISSIONS,
  });
  logger.info(`Invite link: ${invite}`);
});

client.on(Events.MessageCreate, (message: Message) => {
  if (!message.inGuild() || message.author.bot || message.webhookId || message.system) return;

  const fingerprint = fingerprintMessage(message, config.spam.minContentLength);
  if (!fingerprint) return;

  // Copies arriving while the incident is being handled are just removed
  if (tracker.isPartOfIncident(message, fingerprint)) {
    void deleteLateCopy(message);
    return;
  }

  const detection = tracker.track(message, fingerprint);
  if (detection) {
    handleSpam(client, detection).catch((error) => logger.error('Failed to handle spam', error));
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isButton() && interaction.customId.startsWith(UNTIMEOUT_BUTTON_PREFIX)) {
      await handleUntimeoutButton(interaction);
    }
  } catch (error) {
    logger.error('Interaction failed', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      const language = languageFromLocale(interaction.locale);
      await interaction.reply({ content: t(language, 'cmd.error'), flags: MessageFlags.Ephemeral }).catch(() => undefined);
    }
  }
});

client.on(Events.GuildCreate, (guild) => logger.info(`Joined server ${guild.name} (${guild.id})`));
client.on(Events.GuildDelete, (guild) => {
  logger.info(`Removed from server ${guild.name ?? guild.id}`);
  deleteGuildSettings(guild.id);
});
client.on(Events.Error, (error) => logger.error('Client error', error));

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down`);
  tracker.stop();
  void client.destroy().finally(() => {
    closeDatabase();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await client.login(config.token);
