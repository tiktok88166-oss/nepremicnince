import postgres from "postgres";

const rawConnectionString = process.env.DATABASE_URL;
const connectionString = rawConnectionString && rawConnectionString !== "[SENSITIVE]" ? rawConnectionString : undefined;

export const databaseConfigured = Boolean(connectionString);

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.sql ??
  (connectionString
    ? postgres(connectionString, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 15,
        prepare: false,
      })
    : null);

if (process.env.NODE_ENV !== "production" && sql) globalForDb.sql = sql;

export function requireDatabase() {
  if (!sql) throw new Error("DATABASE_URL ni nastavljen.");
  return sql;
}
