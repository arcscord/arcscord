import { dirname, resolve } from "node:path";
import process from "node:process";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";

/**
 * App-level reminder model.
 *
 * SQLite stores snake_case columns, while the rest of the bot uses camelCase.
 */
export type Reminder = {
  id: number;
  userId: string;
  message: string;
  remindAt: number;
  createdAt: number;
};

type ReminderRow = {
  id: number;
  user_id: string;
  message: string;
  remind_at: number;
  created_at: number;
};

function toReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    remindAt: row.remind_at,
    createdAt: row.created_at,
  };
}

const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/reminders.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// The table is created at startup to keep the example migration-free.
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS reminders_user_remind_at_idx
    ON reminders (user_id, remind_at);

  CREATE INDEX IF NOT EXISTS reminders_due_idx
    ON reminders (remind_at);
`);

export function createReminder(userId: string, message: string, remindAt: number): Reminder {
  const createdAt = Date.now();
  const result = db
    .prepare("INSERT INTO reminders (user_id, message, remind_at, created_at) VALUES (?, ?, ?, ?)")
    .run(userId, message, remindAt, createdAt);

  return {
    id: Number(result.lastInsertRowid),
    userId,
    message,
    remindAt,
    createdAt,
  };
}

export function listReminders(userId: string): Reminder[] {
  const rows = db
    .prepare("SELECT id, user_id, message, remind_at, created_at FROM reminders WHERE user_id = ? ORDER BY remind_at ASC")
    .all(userId) as ReminderRow[];

  return rows.map(toReminder);
}

export function deleteReminder(userId: string, id: number): boolean {
  const result = db
    .prepare("DELETE FROM reminders WHERE user_id = ? AND id = ?")
    .run(userId, id);

  return result.changes > 0;
}

export function listDueReminders(now: number, limit = 25): Reminder[] {
  const rows = db
    .prepare("SELECT id, user_id, message, remind_at, created_at FROM reminders WHERE remind_at <= ? ORDER BY remind_at ASC LIMIT ?")
    .all(now, limit) as ReminderRow[];

  return rows.map(toReminder);
}

export function deleteReminderById(id: number): void {
  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
}

export function closeDatabase(): void {
  db.close();
}
