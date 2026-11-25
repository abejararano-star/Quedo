import Link from "next/link";
import { BedDouble, MapPin } from "lucide-react";
import type { CatalogItem } from "@/lib/catalog";
import { money } from "@/lib/format";
import { FavoriteButton } from "./favorite-button";

export function ListingCard({ item, priority = false, consultation }: { item: CatalogItem; priority?: boolean; consultation?: { arrival: string; departure?: string; people: string } }) {
  const query = new URLSearchParams();
  if (consultation?.arrival) query.set("llegada", consultation.arrival);
  if (consultation?.departure) query.set("salida", consultation.departure);
  if (consultation?.people) query.set("personas", consultation.people);
  const href = `/estadias/${item.slug}${query.size ? `?${query}` : ""}`;
  return <article className="listing-card"><div className="card-image-wrap"><Link href={href} aria-label={`Ver ${item.title}`}><img className="card-image" src={item.photos[0] ?? "/images/apartment-1.jpg"} alt={item.isDemo ? `Imagen de referencia para ${item.title}` : item.title} loading={priority ? "eager" : "lazy"} width="640" height="480"/></Link><span className="card-label">{item.isDemo ? "Espacio de ejemplo" : item.type}</span><FavoriteButton id={item.id}/></div><div className="card-copy"><p className="card-location"><MapPin size={13}/>{item.district}, {item.city}</p><h3><Link href={href}>{item.title}</Link></h3><p className="card-meta">{item.capacity} huéspedes <span>·</span> <BedDouble size={14}/>{item.beds} {item.beds === 1 ? "cama" : "camas"}</p><p className="card-price"><strong>{money(item.priceNight)}</strong><span> / noche</span><span className="currency">COP</span></p></div></article>;
}
