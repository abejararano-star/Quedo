import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { mayUseTestAccount } from "./security-config";

const cookieName = "quedo-session";
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export const getUser = cache(async () => {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, select: {
    expiresAt: true, user: { select: { id: true, name: true, email: true, role: true, isTest: true } },
  } });
  if (!session || session.expiresAt <= new Date()) return null;
  if (session.user.isTest && !mayUseTestAccount(process.env.APP_URL, process.env.NODE_ENV)) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role, isTest: session.user.isTest };
});
export function accountPath(role: string) {
  return role === "GUEST" ? "/huesped" : role === "ADMIN" ? "/admin" : "/anfitrion";
}
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/acceso");
  if (user.role === "GUEST") redirect("/huesped");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/anfitrion");
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.APP_URL?.startsWith("https://") ?? false, expires: expiresAt, path: "/" });
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(cookieName);
}
