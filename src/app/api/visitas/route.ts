import { db } from "@/lib/db";
import { allowRequest } from "@/lib/rate-limit";
import { getVisit } from "@/lib/visit";
import { readLimitedJson } from "@/lib/limited-json";
export async function POST(request: Request) {
  const allowedOrigin = new URL(process.env.APP_URL ?? "http://127.0.0.1:3000").origin;
  if (request.headers.get("origin") !== allowedOrigin) return new Response(null, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return new Response(null, { status: 415 });
  const body = await readLimitedJson(request, 1024);
  if (body.status !== 200) return new Response(null, { status: body.status });
  const { listingId, source } = body.data;
  if (typeof listingId !== "string" || listingId.length > 50) return new Response(null, { status: 400 });
  if (!await allowRequest("views", 60, 60)) return new Response(null, { status: 429 });
  const listing = await db.listing.findFirst({ where: { id: listingId, status: "PUBLISHED" }, select: { id: true, isDemo: true } });
  if (listing) {
    const visit = await getVisit(typeof source === "string" ? source : "directo");
    await db.pageView.createMany({ data: [{ listingId: listing.id, visitId: visit.id, isSimulated: listing.isDemo }], skipDuplicates: true });
  }
  return new Response(null, { status: 204 });
}
