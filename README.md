<p align="center"><img src="assets/logo.png" width="120" alt="Dity Security logo"></p>

# Dity Security

Self-hosted Discord bot that stops spam from **compromised accounts**.

Hacked accounts typically post the same message (fake Nitro, scam links, images) in every channel they can reach.
Dity Security catches the pattern by the **3rd message at the latest** and then:

1. **times out** the user (7 days by default)
2. **deletes** the spam messages
3. sends the user a **DM** explaining what happened and how to secure the account (plus an optional note from the moderators)
4. posts a **report** in the moderation channel, with a **Remove timeout** button

## Detection rule

A user triggers the protection in a server when they send **3 identical messages within 60 seconds across at least 2 different channels** of that server.

- Messages are compared after normalization (case, spacing, invisible characters); attachments by name + size.
- Short messages (< 8 characters) without links or attachments are ignored, so "ok" or "lol" never trigger it.
- Copies arriving while the incident is being handled are deleted too.
- Each server is evaluated separately.

All thresholds can be changed via environment variables (see [.env.example](.env.example)).

## Commands

All commands need the **Manage Server** permission by default. Server admins can change this in *Server Settings → Integrations*.

| Command | Description |
| --- | --- |
| `/set-channel <channel>` | Channel where reports are sent |
| `/set-language <English\|Italiano>` | Language of DMs and reports for this server |
| `/set-note [note]` | Note added to the DM sent to the user. Mention people with `@`, use `\n` for a new line. Run it without text to remove the note |
| `/settings` | Show the current configuration |

**Languages:** Discord does not tell bots which language a user's client uses when they send a normal message,
so the DM language is set per server. Without `/set-language`, the bot uses the server's locale if it is Italian, otherwise English.
Replies to slash commands use the language of the moderator's own Discord client.

## Setup

### 1. Create the Discord application

1. Go to the [Developer Portal](https://discord.com/developers/applications) → **New Application** → name it `Dity Security`
2. Upload [assets/logo.png](assets/logo.png) as the app icon (and as the bot avatar under **Bot**)
3. Under **Bot**:
   - copy the **token**
   - enable **Message Content Intent** (required to compare messages)
   - optionally turn off **Public Bot** so only you can invite it
4. Start the bot once: the **invite link** with the right permissions is printed in the logs.

Required permissions: View Channels, Send Messages, Embed Links, Read Message History, Manage Messages, Timeout Members.

> Put the bot's role **above** the roles of the members it should moderate. Discord does not allow timing out members with a higher role, or the server owner.

### 2. Run with Docker

```bash
cp .env.example .env    # then set DISCORD_TOKEN
docker compose up -d
docker compose logs -f  # shows the invite link
```

The image is pulled from `ghcr.io/jacopofilonzi/discord-anti-spam` (amd64 and arm64). To update: `docker compose pull && docker compose up -d`.

The SQLite database lives in the `dity-data` Docker volume.

### 3. Configure each server

```
/set-channel #mod-log
/set-language Italiano
/set-note Once you have secured your account, write to @moderator
```

## Local development

Requires Node.js 24+ (uses the built-in `node:sqlite`).

```bash
npm install
cp .env.example .env
npm run dev     # runs TypeScript directly, with watch mode
npm run build && npm start
```

## Project structure

```
src/
├── index.ts                 # client setup and event wiring
├── config.ts                # environment configuration
├── db.ts                    # SQLite storage of per-server settings
├── commands/index.ts        # slash command definitions and handlers
├── detection/
│   ├── fingerprint.ts       # message normalization and hashing
│   └── tracker.ts           # rolling history + burst detection
├── handlers/
│   ├── spamAction.ts        # timeout, delete, DM, report
│   └── untimeoutButton.ts   # "Remove timeout" button
└── i18n/                    # English and Italian translations
```
