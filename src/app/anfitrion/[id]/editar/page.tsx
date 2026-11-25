import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { strings } from "@/lib/format";
import { canEditListing } from "@/lib/policy";
import { ListingForm } from "@/components/listing-form";
export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const item = await db.listing.findUnique({ where: { id: (await params).id } });
  if (!item || !canEditListing(user, item)) notFound();
  const { id, title, summary, description, district, type, capacity, bedrooms, beds, bathrooms, priceNight, priceWeek, extraCosts, houseRules, whatsapp, rnt } = item;
  return <div className="container page-space"><p className="eyebrow">MANTÉN TU INFORMACIÓN AL DÍA</p><h1 className="page-title">Edita tu espacio.</h1><p className="page-description">Al guardar, el anuncio vuelve a revisión y se retira temporalmente de la vitrina.</p><ListingForm testMode={item.isDemo} listing={{ id, title, summary, description, district, type, capacity, bedrooms, beds, bathrooms, priceNight, priceWeek, extraCosts, houseRules, whatsapp, rnt, photos: strings(item.photos), amenities: strings(item.amenities) }}/></div>;
}
