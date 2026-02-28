/**
 * Chekd Unified Communications 3.0 — Logger
 */

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export function createLogger(scope: string): Logger {
  const fmt = (level: string, msg: string, meta?: Record<string, unknown>) => {
    const ts = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level.toUpperCase().padEnd(5)}] [${scope}] ${msg}${metaStr}`;
  };

  return {
    debug: (msg, meta) => console.debug(fmt('debug', msg, meta)),
    info:  (msg, meta) => console.info(fmt('info', msg, meta)),
    warn:  (msg, meta) => console.warn(fmt('warn', msg, meta)),
    error: (msg, meta) => console.error(fmt('error', msg, meta)),
  };
}

export default createLogger;
