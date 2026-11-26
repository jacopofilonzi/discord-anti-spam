import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';
import type { Language } from './i18n/index.js';

export interface GuildSettings {
  guildId: string;
  reportChannelId: string | null;
  language: Language | null;
  /** Custom note from the moderators, appended to the DM sent to the user. */
  dmNote: string | null;
}

mkdirSync(dirname(config.databasePath), { recursive: true });

const db = new DatabaseSync(config.databasePath);
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id          TEXT PRIMARY KEY,
    report_channel_id TEXT,
    language          TEXT,
    dm_note           TEXT
  )
`);

const selectStmt = db.prepare('SELECT report_channel_id, language, dm_note FROM guild_settings WHERE guild_id = ?');
const upsertChannelStmt = db.prepare(`
  INSERT INTO guild_settings (guild_id, report_channel_id) VALUES (?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET report_channel_id = excluded.report_channel_id
`);
const upsertLanguageStmt = db.prepare(`
  INSERT INTO guild_settings (guild_id, language) VALUES (?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET language = excluded.language
`);
const upsertNoteStmt = db.prepare(`
  INSERT INTO guild_settings (guild_id, dm_note) VALUES (?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET dm_note = excluded.dm_note
`);
const deleteStmt = db.prepare('DELETE FROM guild_settings WHERE guild_id = ?');

export function getGuildSettings(guildId: string): GuildSettings {
  const row = selectStmt.get(guildId) as
    | { report_channel_id: string | null; language: string | null; dm_note: string | null }
    | undefined;
  return {
    guildId,
    reportChannelId: row?.report_channel_id ?? null,
    language: (row?.language as Language | null) ?? null,
    dmNote: row?.dm_note ?? null,
  };
}

export function setReportChannel(guildId: string, channelId: string): void {
  upsertChannelStmt.run(guildId, channelId);
}

export function setLanguage(guildId: string, language: Language): void {
  upsertLanguageStmt.run(guildId, language);
}

/** Sets the moderators' DM note; pass null to remove it. */
export function setDmNote(guildId: string, note: string | null): void {
  upsertNoteStmt.run(guildId, note);
}

/** Removes all stored settings of a guild (used when the bot leaves it). */
export function deleteGuildSettings(guildId: string): void {
  deleteStmt.run(guildId);
}

export function closeDatabase(): void {
  db.close();
}
