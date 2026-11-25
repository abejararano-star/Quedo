import Link from "next/link";
export function PortalNav({ admin = false, active = "", query = "" }: { admin?: boolean; active?: string; query?: string }) {
  const links = admin ? [["Resumen", "/admin"], ["Anuncios y revisión", "/admin/anuncios"], ["Contactos", "/admin/contactos"], ["Anfitriones y planes", "/admin/anfitriones"]] : [["Mis anuncios", "/anfitrion"], ["Contactos", "/anfitrion/contactos"], ["Mis métricas", "/anfitrion/metricas"]];
  return <nav className="portal-nav" aria-label={admin ? "Panel de administración" : "Panel de anfitrión"}>{links.map(([label, href]) => <Link key={href} href={`${href}${query ? `?${query}` : ""}`} className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined}>{label}</Link>)}</nav>;
}
