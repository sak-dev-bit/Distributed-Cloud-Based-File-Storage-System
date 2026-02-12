import { config } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

// Lightweight logger wrapper. For a real production deployment you'd likely swap
// this for pino or winston, but this is enough for a solid prototype.
class Logger {
  private levelOrder: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
  };

  private currentLevel: LogLevel;

  constructor() {
    const envLevel = (config.logLevel || "info") as LogLevel;
    this.currentLevel = this.levelOrder[envLevel] ? envLevel : "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.currentLevel];
  }

  debug(message: string, meta?: unknown): void {
    if (!this.shouldLog("debug")) return;
    console.debug(JSON.stringify({ level: "debug", message, meta, time: new Date().toISOString() }));
  }

  info(message: string, meta?: unknown): void {
    if (!this.shouldLog("info")) return;
    console.info(JSON.stringify({ level: "info", message, meta, time: new Date().toISOString() }));
  }

  warn(message: string, meta?: unknown): void {
    if (!this.shouldLog("warn")) return;
    console.warn(JSON.stringify({ level: "warn", message, meta, time: new Date().toISOString() }));
  }

  error(message: string, meta?: unknown): void {
    if (!this.shouldLog("error")) return;
    console.error(JSON.stringify({ level: "error", message, meta, time: new Date().toISOString() }));
  }
}

export const logger = new Logger();

