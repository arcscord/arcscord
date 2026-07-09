const units = {
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
} as const;

const minDelayMs = units.minute;
const maxDelayMs = 30 * units.day;
type DurationUnit = keyof typeof units;

const unitAliases = {
  d: "day",
  day: "day",
  days: "day",
  h: "hour",
  heure: "hour",
  heures: "hour",
  hour: "hour",
  hours: "hour",
  hr: "hour",
  hrs: "hour",
  j: "day",
  jour: "day",
  jours: "day",
  m: "minute",
  min: "minute",
  mins: "minute",
  minute: "minute",
  minutes: "minute",
  semaine: "week",
  semaines: "week",
  sem: "week",
  w: "week",
  week: "week",
  weeks: "week",
} satisfies Record<string, DurationUnit>;

const durationPartRegex = /(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)/g;
const ignoredSeparatorsRegex = /[\s,+-]|and|et/gi;

/**
 * Convert a relative user input (`10m`, `1h30m`, `2 hours`, `3 jours`) into milliseconds.
 */
export function parseDelay(input: string): number | null {
  let totalMs = 0;
  let matched = false;
  const unmatched = input.trim().toLowerCase().replace(durationPartRegex, (part, rawAmount: string, rawUnit: string) => {
    const unit = unitAliases[rawUnit.toLowerCase() as keyof typeof unitAliases];
    if (!unit) {
      return part;
    }

    const amount = Number(rawAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return part;
    }

    matched = true;
    totalMs += amount * units[unit];
    return " ";
  });

  if (!matched || unmatched.replace(ignoredSeparatorsRegex, "") !== "") {
    return null;
  }

  const delayMs = Math.round(totalMs);
  if (!Number.isSafeInteger(delayMs) || delayMs < minDelayMs || delayMs > maxDelayMs) {
    return null;
  }

  return delayMs;
}

/**
 * Render one timestamp in Discord's relative + absolute timestamp format.
 */
export function formatDiscordTimestamp(dateMs: number): string {
  const seconds = Math.floor(dateMs / 1000);
  return `<t:${seconds}:R> (<t:${seconds}:f>)`;
}
