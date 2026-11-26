import type { Message } from 'discord.js';
import { createHash } from 'node:crypto';

// Zero-width and other invisible characters often used to dodge exact matching
const INVISIBLE_CHARS = /[\u200B-\u200F\u2060-\u2064\uFEFF\u00AD]/g;
const LINK_PATTERN = /(https?:\/\/|discord\.gg\/|discord(app)?\.com\/invite\/)/i;

/** Normalizes message text so trivial variations (case, spacing, invisible chars) don't matter. */
export function normalizeContent(content: string): string {
  return content.normalize('NFKC').replace(INVISIBLE_CHARS, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Builds a fingerprint identifying "the same message" across channels.
 * Returns null when the message is too short/generic to be meaningful for spam detection.
 */
export function fingerprintMessage(message: Message, minContentLength: number): string | null {
  const text = normalizeContent(message.content);

  // Attachments are re-uploaded each time, so compare name + size instead of URL
  const attachments = [...message.attachments.values()].map((a) => `${a.name}:${a.size}`).sort();
  const stickers = [...message.stickers.keys()].sort();

  const hasMedia = attachments.length > 0 || stickers.length > 0;
  const hasLink = LINK_PATTERN.test(text);
  if (!hasMedia && !hasLink && text.length < minContentLength) return null;

  return createHash('sha256')
    .update(JSON.stringify({ text, attachments, stickers }))
    .digest('hex');
}
