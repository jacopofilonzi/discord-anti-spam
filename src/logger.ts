type Level = 'INFO' | 'WARN' | 'ERROR';

function write(level: Level, message: string, error?: unknown): void {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  if (level === 'ERROR') console.error(line, error ?? '');
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string) => write('INFO', message),
  warn: (message: string) => write('WARN', message),
  error: (message: string, error?: unknown) => write('ERROR', message, error),
};
