/** Reads an integer env variable, falling back to a default and enforcing bounds. */
function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < min || value > max) {
    throw new Error(`Invalid value for ${name}: "${raw}" (expected an integer between ${min} and ${max})`);
  }
  return value;
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
}

export const config = {
  token,
  databasePath: process.env.DATABASE_PATH ?? './data/dity.db',
  spam: {
    threshold: intEnv('SPAM_THRESHOLD', 3, 2, 20),
    windowMs: intEnv('SPAM_WINDOW_SECONDS', 60, 5, 3600) * 1000,
    minChannels: intEnv('SPAM_MIN_CHANNELS', 2, 1, 20),
    minContentLength: intEnv('MIN_CONTENT_LENGTH', 8, 0, 2000),
  },
  // Discord caps timeouts at 28 days
  timeoutMs: intEnv('TIMEOUT_MINUTES', 10080, 1, 40320) * 60 * 1000,
  /** Brand color taken from the Dity logo. */
  brandColor: 0x246dd5,
  dangerColor: 0xd63c3c,
  successColor: 0x3ba55c,
} as const;
