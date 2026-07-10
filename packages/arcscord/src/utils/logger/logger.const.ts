import type { LogLevel, LogLevelInfo } from "#/utils/logger/logger.type";

export const ANSI_RESET = "\u001B[0m";

const foreground = (code: number): string => `\u001B[${code}m`;
const foreground256 = (code: number): string => `\u001B[38;5;${code}m`;

export const logLevelInfos: Record<LogLevel, LogLevelInfo> = {
  fatal: {
    logText: "FATAL",
    titleColor: foreground(91),
    textColor: foreground(31),
    logPriority: 1,
  },
  error: {
    logText: "ERROR",
    titleColor: foreground256(208),
    textColor: foreground256(255),
    logPriority: 2,
  },
  warn: {
    logText: "WARN",
    titleColor: foreground256(220),
    textColor: foreground256(255),
    logPriority: 3,
  },
  info: {
    logText: "INFO",
    titleColor: foreground(92),
    textColor: foreground256(252),
    logPriority: 4,
  },
  debug: {
    logText: "DEBUG",
    titleColor: foreground256(245),
    textColor: foreground256(247),
    logPriority: 5,
  },
  trace: {
    logText: "TRACE",
    titleColor: foreground256(245),
    textColor: foreground256(247),
    logPriority: 6,
  },
};

export const DATE_COLOR: string = foreground(37);
export const SEPARATOR_COLOR: string = foreground256(240);

export const MAX_TITLE_LENGTH = 8;
export const MAX_PROCESS_LENGTH = 10;

export const SPACE_FILLER = " ";
export const PROCESS_NAME_COLOR: string = foreground256(57);

export const DEBUG_KEY_COLOR: string = foreground256(33);
export const DEBUG_VALUE_COLOR: string = foreground256(75);

export const SHORT_DEBUG_SPACING = 33;
export const SHORT_DEBUG_PREFIX = "↳ ";
