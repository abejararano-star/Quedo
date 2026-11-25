import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { strings } from "@/lib/format";
import { SavedCatalog } from "@/components/saved-catalog";
export const metadata: Metadata = { title: "Tus espacios guardados" };
export default async function Saved() {
  const user = await getUser();
  const items = await db.listing.findMany({ where: { status: "PUBLISHED", ...(user ? { favorites: { some: { userId: user.id } } } : {}) }, select: { id: true, slug: true, title: true, district: true, city: true, type: true, capacity: true, bedrooms: true, beds: true, priceNight: true, priceWeek: true, photos: true, amenities: true, isDemo: true, featured: true } });
  return <div className="container page-space"><p className="eyebrow">PARA CUANDO DECIDAS QUEDARTE</p><h1 className="page-title">Tus espacios guardados.</h1><p className="page-description">{user ? "Estos son los alojamientos guardados en tu cuenta." : <>Tus favoritos se guardan en este navegador. <Link className="text-link" href="/registro?perfil=huesped">Crea una cuenta para guardar desde varios dispositivos.</Link></>}</p><SavedCatalog items={items.map(item => ({ ...item, photos: strings(item.photos), amenities: strings(item.amenities) }))}/></div>;
}
