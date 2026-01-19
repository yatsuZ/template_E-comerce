import { FastifyInstance } from "fastify";
import { Logger } from "./logger";
import { db } from "../config/db";

export async function shutdown(fastify: FastifyInstance, signal: string, error?: unknown) {
  if (error) {
    Logger.error(`Shutdown caused by error (${signal})`, error);
  } else {
    Logger.warn(`Received ${signal}, shutting down...`);
  }

  try {
    await fastify.close();
    Logger.success("Fastify server closed");
  } catch (err) {
    Logger.error("Error closing Fastify:", err);
  }

  try {
    db.close();
    Logger.success("Database closed");
  } catch (err) {
    Logger.error("Error closing database:", err);
  }

  process.exit(error ? 1 : 0);
}
