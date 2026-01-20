import { FastifyInstance } from "fastify";
import { Logger } from "./logger";
import { DatabaseManager } from "../config/db";

const location = "routes/api/env.ts"

export async function shutdown(fastify: FastifyInstance, db: DatabaseManager, signal: string, error?: unknown) {
  if (error) {
    Logger.error(location, `Shutdown caused by error (${signal})`, error);
  } else {
    Logger.warn(location, `Received ${signal}, shutting down...`);
  }

  try {
    await fastify.close();
    Logger.success(location, "Fastify server closed");
  } catch (err) {
    Logger.error(location, "Error closing Fastify:", err);
  }

  try {
    db.close();
    Logger.success(location, "Database closed");
  } catch (err) {
    Logger.error(location, "Error closing database:", err);
  }

  process.exit(error ? 1 : 0);
}
