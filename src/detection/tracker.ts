import type { Message } from 'discord.js';

interface TrackedMessage {
  message: Message;
  fingerprint: string;
  timestamp: number;
}

export interface Detection {
  /** All messages that are part of the spam burst (including the triggering one). */
  messages: Message[];
  fingerprint: string;
  /** Time between the first and last message of the burst. */
  spanMs: number;
}

export interface TrackerOptions {
  threshold: number;
  windowMs: number;
  minChannels: number;
}

/**
 * Keeps a short rolling history of messages per (guild, user) and detects
 * when the same content is posted repeatedly across different channels.
 */
export class SpamTracker {
  private readonly history = new Map<string, TrackedMessage[]>();
  /** Active incidents: further copies of the same spam are deleted silently. */
  private readonly incidents = new Map<string, { fingerprint: string; expiresAt: number }>();
  private readonly sweeper: NodeJS.Timeout;

  constructor(private readonly options: TrackerOptions) {
    // Periodically drop stale entries so memory stays bounded
    this.sweeper = setInterval(() => this.sweep(), options.windowMs).unref();
  }

  private key(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  /** True if this message is a further copy of spam that already triggered an incident. */
  isPartOfIncident(message: Message, fingerprint: string): boolean {
    const incident = this.incidents.get(this.key(message.guildId!, message.author.id));
    return incident !== undefined && incident.expiresAt > Date.now() && incident.fingerprint === fingerprint;
  }

  /**
   * Records a message and returns a Detection when it completes a spam burst.
   * Must be called synchronously per message (no awaits before it) so that
   * concurrent copies of the same spam can't trigger the action twice.
   */
  track(message: Message, fingerprint: string): Detection | null {
    const now = Date.now();
    const key = this.key(message.guildId!, message.author.id);
    const entries = (this.history.get(key) ?? []).filter((e) => now - e.timestamp <= this.options.windowMs);
    entries.push({ message, fingerprint, timestamp: now });
    this.history.set(key, entries);

    const matches = entries.filter((e) => e.fingerprint === fingerprint);
    const channels = new Set(matches.map((e) => e.message.channelId));
    if (matches.length < this.options.threshold || channels.size < this.options.minChannels) return null;

    // Open an incident and forget the history so the same burst isn't reported again
    this.incidents.set(key, { fingerprint, expiresAt: now + this.options.windowMs * 5 });
    this.history.delete(key);

    return {
      messages: matches.map((e) => e.message),
      fingerprint,
      spanMs: now - matches[0]!.timestamp,
    };
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entries] of this.history) {
      const fresh = entries.filter((e) => now - e.timestamp <= this.options.windowMs);
      if (fresh.length === 0) this.history.delete(key);
      else this.history.set(key, fresh);
    }
    for (const [key, incident] of this.incidents) {
      if (incident.expiresAt <= now) this.incidents.delete(key);
    }
  }

  stop(): void {
    clearInterval(this.sweeper);
  }
}
