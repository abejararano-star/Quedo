import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { strings } from "./format";

export type CatalogParams = Record<string, string | string[] | undefined>;
export function catalogWhere(params: CatalogParams): Prisma.ListingWhereInput {
  const scalar = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const q = scalar("q").trim().slice(0, 100);
  const capacity = Number(scalar("personas"));
  const max = Number(scalar("precio"));
  const selected = typeof params.servicio === "string" ? [params.servicio] : params.servicio ?? [];
  return {
    status: "PUBLISHED",
    ...(q ? { OR: ["title", "district", "city", "summary"].map(field => ({ [field]: { contains: q } })) } : {}),
    ...(scalar("tipo") ? { type: scalar("tipo") } : {}),
    ...(capacity >= 1 && capacity <= 30 ? { capacity: { gte: capacity } } : {}),
    ...(max >= 10000 && max <= 20000000 ? { priceNight: { lte: max } } : {}),
    ...(selected.length ? { AND: selected.slice(0, 8).map(item => ({ amenities: { array_contains: [item] } })) } : {}),
  };
}
export async function getCatalog(params: CatalogParams = {}) {
  const sort = params.orden;
  const orderBy: Prisma.ListingOrderByWithRelationInput[] = sort === "precio-asc" ? [{ priceNight: "asc" }] : sort === "precio-desc" ? [{ priceNight: "desc" }] : [{ featured: "desc" }, { createdAt: "desc" }];
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const where = catalogWhere(params);
  const [items, count] = await Promise.all([db.listing.findMany({ where, orderBy, take: 12, skip: (page - 1) * 12, select: {
    id: true, slug: true, title: true, district: true, city: true, type: true, capacity: true, bedrooms: true, beds: true,
    priceNight: true, priceWeek: true, photos: true, amenities: true, isDemo: true, featured: true,
  } }), db.listing.count({ where })]);
  return { items: items.map(item => ({ ...item, photos: strings(item.photos), amenities: strings(item.amenities) })), count, page };
}
export type CatalogItem = Awaited<ReturnType<typeof getCatalog>>["items"][number];
