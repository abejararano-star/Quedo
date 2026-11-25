import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export async function getVisit(source = "directo") {
  const jar = await cookies();
  const token = jar.get("quedo-visit")?.value;
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    const current = await db.visitSession.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
    if (current && current.expiresAt > new Date()) return current;
  }
  const fresh = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  const visit = await db.visitSession.create({ data: { tokenHash: createHash("sha256").update(fresh).digest("hex"), expiresAt, source: source.replace(/[^\p{L}\p{N}_. -]/gu, "").slice(0, 100) || "directo" } });
  jar.set("quedo-visit", fresh, { httpOnly: true, sameSite: "lax", secure: process.env.APP_URL?.startsWith("https://") ?? false, expires: expiresAt, path: "/" });
  return visit;
}
