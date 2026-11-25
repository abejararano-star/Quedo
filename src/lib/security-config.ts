import { isIP } from "node:net";

export function isLoopbackUrl(value: string | undefined) {
  if (!value) return false;
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname); }
  catch { return false; }
}

export function mayUseTestAccount(appUrl: string | undefined, environment: string | undefined) {
  return environment === "development" && isLoopbackUrl(appUrl);
}

export function rateLimitPeer(realIp: string | null, trustProxy: string | undefined) {
  return trustProxy === "true" && realIp && isIP(realIp) ? realIp : "shared";
}
