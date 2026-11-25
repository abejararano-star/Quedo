import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FavoriteProvider } from "@/components/favorite-button";
import "./globals.css";
import "./portal.css";
import "./guest.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://127.0.0.1:3000"),
  title: { default: "Quedo · Tu lugar en Quibdó", template: "%s · Quedo" },
  description: "Explora estadías por días o semanas en Quibdó. Compara espacios y condiciones, y conversa directamente con el anfitrión.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/icon.svg?v=quedo-1", type: "image/svg+xml", sizes: "any" }],
    shortcut: "/favicon.ico?v=quedo-1",
  },
  openGraph: { title: "Quedo · Tu lugar en Quibdó", description: "Un lugar para llegar. Una razón para quedarte.", locale: "es_CO", type: "website", images: [{ url: "/images/apartment-1.jpg", width: 1200, height: 800 }] },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const saved = user ? await db.favorite.findMany({ where: { userId: user.id, listing: { status: "PUBLISHED" } }, select: { listingId: true } }) : [];
  return <html lang="es-CO" data-scroll-behavior="smooth"><body><FavoriteProvider key={user?.id ?? "visitor"} userId={user?.id ?? null} ids={saved.map(item => item.listingId)}><a className="skip-link" href="#contenido">Saltar al contenido</a><div className="development-notice">Versión de desarrollo <span>·</span> Los espacios marcados como ejemplo no son oferta comercial.</div><Header/><main id="contenido">{children}</main><Footer/></FavoriteProvider></body></html>;
}
