/**
 * Shared Prisma client (singleton).
 *
 * Uses the better-sqlite3 driver adapter so the example runs against a local
 * SQLite file (`DATABASE_URL`) with no external database to set up. Import this
 * instance everywhere instead of constructing a new `PrismaClient` per module,
 * so the whole bot shares one connection pool.
 */
import * as process from "node:process";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
