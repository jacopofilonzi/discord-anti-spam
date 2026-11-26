import type { Guild } from 'discord.js';
import { en } from './en.js';
import { it } from './it.js';
import { getGuildSettings } from '../db.js';

export const LANGUAGES = ['en', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, it };

/** Translates a key, replacing `{placeholders}` with the given values. Falls back to English. */
export function t(language: Language, key: TranslationKey, vars: Record<string, string | number> = {}): string {
  const template = dictionaries[language][key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Maps any Discord locale (e.g. "it", "en-US") to a supported language. */
export function languageFromLocale(locale: string | null | undefined): Language {
  return locale?.toLowerCase().startsWith('it') ? 'it' : 'en';
}

/**
 * Language used for a guild's DMs and reports: the one chosen with /set-language,
 * otherwise the guild's preferred locale (if supported), otherwise English.
 */
export function guildLanguage(guild: Guild): Language {
  return getGuildSettings(guild.id).language ?? languageFromLocale(guild.preferredLocale);
}

/** Human readable duration, e.g. "7 days" / "7 giorni". */
export function formatDuration(language: Language, ms: number): string {
  const units = [
    { ms: 86_400_000, en: ['day', 'days'], it: ['giorno', 'giorni'] },
    { ms: 3_600_000, en: ['hour', 'hours'], it: ['ora', 'ore'] },
    { ms: 60_000, en: ['minute', 'minutes'], it: ['minuto', 'minuti'] },
  ] as const;
  for (const unit of units) {
    if (ms >= unit.ms && ms % unit.ms === 0) {
      const value = ms / unit.ms;
      return `${value} ${unit[language][value === 1 ? 0 : 1]}`;
    }
  }
  const minutes = Math.round(ms / 60_000);
  return `${minutes} ${units[2][language][minutes === 1 ? 0 : 1]}`;
}
