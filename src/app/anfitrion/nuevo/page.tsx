import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ListingForm } from "@/components/listing-form";
export const metadata: Metadata = { title: "Presenta tu espacio" };
export default async function NewListing() {
  const user = await requireUser();
  return <div className="container page-space"><p className="eyebrow">UN NUEVO LUGAR EN QUEDO</p><h1 className="page-title">Presenta tu espacio.</h1><p className="page-description">La información clara ayuda a tus huéspedes a decidir. Tu anuncio se revisará antes de publicarse.</p><ListingForm testMode={user.isTest}/></div>;
}
