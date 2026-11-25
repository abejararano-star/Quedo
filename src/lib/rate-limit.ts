import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";
import { rateLimitPeer } from "./security-config";

export async function allowRequest(scope: string, limit: number, windowMinutes: number, subject?: string) {
  const requestHeaders = await headers();
  const peer = rateLimitPeer(requestHeaders.get("x-real-ip"), process.env.TRUST_PROXY);
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("Configura RATE_LIMIT_SECRET con al menos 32 bytes aleatorios.");
  const windowMs = windowMinutes * 60_000;
  const window = Math.floor(Date.now() / windowMs);
  const key = `${scope}:${window}:${createHmac("sha256", secret).update(subject ?? peer).digest("hex")}`;
  const record = await db.rateLimit.upsert({ where: { key }, create: { key, hits: 1, expiresAt: new Date((window + 1) * windowMs) }, update: { hits: { increment: 1 } } });
  return record.hits <= limit;
}
