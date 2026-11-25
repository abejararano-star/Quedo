import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, UsersRound, BedDouble, Bath, Check, Info, CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { money, shortDate, strings } from "@/lib/format";
import { StayConsultation } from "@/components/stay-consultation";
import { todayInBogota } from "@/lib/stay-quote";
import { canContactListing } from "@/lib/policy";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButton } from "@/components/share-button";
import { ReportForm } from "@/components/report-form";
import { ViewTracker } from "@/components/view-tracker";
import { parseConsultation } from "@/lib/validation";

async function visibleListing(slug: string) {
  const listing = await db.listing.findUnique({ where: { slug }, include: { host: { select: { id: true, name: true } } } });
  if (!listing) return null;
  if (listing.status === "PUBLISHED") return listing;
  const user = await getUser();
  return user && (user.id === listing.hostId || user.role === "ADMIN") ? listing : null;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const listing = await visibleListing((await params).slug);
  return listing ? { title: listing.title, description: listing.summary, openGraph: { images: strings(listing.photos).slice(0, 1) } } : { title: "Espacio no disponible" };
}
export default async function Detail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ contacto?: string; llegada?: string; salida?: string; personas?: string }> }) {
  const listing = await visibleListing((await params).slug);
  if (!listing) notFound();
  const photos = strings(listing.photos);
  const services = strings(listing.amenities);
  const query = await searchParams;
  const consultation = parseConsultation(query.llegada, query.personas);
  return <div className="container page-space detail-page"><p className="breadcrumb"><Link href="/">Inicio</Link><span>/</span><Link href="/estadias">Estadías en Quibdó</Link><span>/</span>{listing.type}</p><div className="detail-title-row"><div><p className="eyebrow">{listing.type.toUpperCase()}</p><h1 className="detail-title">{listing.title}</h1><p className="detail-location"><MapPin size={16}/>{listing.district}, {listing.city}, Chocó</p></div><div className="detail-tools"><ShareButton title={listing.title}/><FavoriteButton large id={listing.id}/></div></div>
    {listing.status === "PUBLISHED" && <ViewTracker listingId={listing.id}/>}
    {listing.status !== "PUBLISHED" && <div className="notice">Vista privada del anuncio · Este espacio todavía no está publicado.</div>}
    {listing.isDemo && <div className="notice demo-notice"><Info size={19}/><p><strong>Este alojamiento es un ejemplo de diseño.</strong> Sus fotografías, ubicación y tarifas son ilustrativas. No representa una propiedad disponible.</p></div>}
    <div className={`detail-gallery ${photos.length === 1 ? "single-photo" : ""}`}>{photos.slice(0, 3).map((photo, index) => <a key={photo} href={photo} target="_blank" rel="noreferrer" aria-label={`Ampliar fotografía ${index + 1}`}><img src={photo} width="1100" height="800" alt={`${listing.isDemo ? "Imagen de referencia" : "Fotografía"} ${index + 1}: ${listing.title}`} loading={index ? "lazy" : "eager"}/></a>)}</div>
    {photos.length > 3 && <div className="extra-photos">{photos.slice(3).map((photo, index) => <a href={photo} target="_blank" rel="noreferrer" key={photo}><img src={photo} width="250" height="180" loading="lazy" alt={`Fotografía adicional ${index + 4}`}/></a>)}</div>}
    <div className="detail-layout"><div className="detail-content"><section><div className="host-heading"><div><h2>Tu espacio para quedarte.</h2><p>{listing.isDemo ? "Perfil de anfitrión de demostración" : `Anfitrión: ${listing.host.name}`}</p></div><span className="host-initial">{listing.host.name[0]}</span></div><div className="property-facts"><span><UsersRound size={20}/>{listing.capacity} huéspedes</span><span><BedDouble size={20}/>{listing.bedrooms} habitaciones · {listing.beds} camas</span><span><Bath size={20}/>{listing.bathrooms} baños</span></div><p className="listing-summary">{listing.summary}</p><p className="preserve-lines">{listing.description}</p></section><section><h2>Lo que ofrece este espacio</h2><div className="amenities-list">{services.map(service => <div key={service}><Check size={18}/>{service}</div>)}</div></section><section><h2>Antes de quedarte</h2><h3>Reglas y condiciones</h3><p className="preserve-lines">{listing.houseRules}</p><h3>Cargos adicionales</h3><p>{listing.extraCosts}</p></section><section><h2>Información del anuncio</h2><p><CalendarDays size={16} className="inline-icon"/> Actualizado el {shortDate(listing.updatedAt)}</p>{!listing.isDemo && listing.reviewedAt && <p>Información revisada el {shortDate(listing.reviewedAt)}. La revisión de publicación no certifica condiciones estructurales ni garantiza la disponibilidad.</p>}{!listing.isDemo && listing.rnt && <p>RNT aportado por el anfitrión: {listing.rnt}. Confirma su vigencia antes de contratar.</p>}<p>Se muestra una ubicación por barrio. Solicita al anfitrión los detalles necesarios antes de decidir.</p></section><ReportForm listingId={listing.id}/></div>
    <aside className="contact-aside">
      <div className="contact-card">
        <p className="contact-price"><strong>{money(listing.priceNight)}</strong><span> COP / noche</span></p>
        {listing.priceWeek && <p className="weekly-price">{money(listing.priceWeek)} COP por semana</p>}
        <div className="contact-line"/>
        <StayConsultation slug={listing.slug} arrival={consultation.arrival} departure={parseConsultation(query.salida, "").arrival} people={consultation.people} today={todayInBogota()} capacity={listing.capacity} priceNight={listing.priceNight} extraCosts={listing.extraCosts} demo={listing.isDemo} enabled={canContactListing(listing)}/>
        {query.contacto === "invalido" && <p role="alert">Revisa las fechas y la cantidad de huéspedes antes de continuar.</p>}
        {query.contacto === "limite" && <p role="alert">Has alcanzado el límite de contactos. Inténtalo más tarde.</p>}
        <p className="contact-note">Abrir WhatsApp no confirma una reserva ni realiza un cobro.</p>
      </div>
      <div className="contact-help"><Info size={18}/><p>Revisa las condiciones y la identidad del anfitrión antes de acordar un pago.</p></div>
    </aside></div>
  </div>;
}
