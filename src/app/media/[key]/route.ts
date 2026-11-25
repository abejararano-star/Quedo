import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) return new Response(null, { status: 404 });
  const media = await db.media.findUnique({ where: { key }, include: { listing: { select: { status: true, hostId: true } } } });
  if (!media) return new Response(null, { status: 404 });
  if (media.listing.status !== "PUBLISHED") {
    const user = await getUser();
    if (!user || (user.id !== media.listing.hostId && user.role !== "ADMIN")) return new Response(null, { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), "storage", "media", key));
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": media.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}
