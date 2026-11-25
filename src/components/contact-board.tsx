import Link from "next/link";
import { db } from "@/lib/db";
import { listingScope } from "@/lib/analytics";
import { filterQuery, leadLabels, type AnalyticsFilter } from "@/lib/analytics-math";
import { shortDate } from "@/lib/format";
import { AnalyticsFilterForm } from "./analytics-filter";
import { ContactFollowup } from "./contact-followup";

export async function ContactBoard({ filter, hostId, page = 1 }: { filter: AnalyticsFilter; hostId?: string; page?: number }) {
  const where = { listing: { ...listingScope(filter), ...(hostId ? { hostId } : {}) }, isSimulated: filter.isTest, createdAt: { gte: filter.start, lt: filter.end } };
  const [contacts, count] = await Promise.all([
    db.contact.findMany({ where, include: { listing: { select: { title: true, slug: true } }, events: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20 }), db.contact.count({ where }),
  ]);
  const root = hostId ? "/anfitrion" : "/admin";
  const query = filterQuery(filter);
  return <><AnalyticsFilterForm filter={filter} hostOnly={Boolean(hostId)}/>{filter.error && <div className="notice">{filter.error}</div>}<div className="analytics-scope"><strong>{filter.isTest ? "Contactos simulados de prueba" : "Contactos reales"}</strong><p>{count} contactos iniciados en el período. Aquí gestionas su estado actual; el CSV permite analizar el estado al corte seleccionado.</p></div><div className="button-row"><a className="button button-secondary" href={`${root}/exportar/contactos?${query}`}>Exportar contactos al corte CSV</a><a className="button button-secondary" href={`${root}/exportar/eventos?${query}`}>Exportar historial CSV</a></div>{!contacts.length && <div className="empty-state"><h2>Todavía no hay contactos en este período.</h2><p>{filter.isTest ? "Desde un anuncio de prueba publicado puedes simular una consulta." : "Aparecerán cuando alguien abra el contacto desde una ficha publicada."}</p></div>}{contacts.map(contact => <article className="analytics-card contact-management" key={contact.id}><div className="analytics-card-heading"><div><Link href={`/estadias/${contact.listing.slug}`}><h2>{contact.listing.title}</h2></Link><p className="analytics-note">Referencia: {contact.id} · {shortDate(contact.createdAt)}</p></div><span className="badge">{leadLabels[contact.status]}</span></div><ContactFollowup id={contact.id} status={contact.status}/><details className="metric-definitions"><summary>Historial del contacto</summary>{contact.events.map(event => <p key={event.id}>{shortDate(event.createdAt)} · {leadLabels[event.status]}{event.lossReason ? ` · ${event.lossReason}` : ""}{event.note ? ` · ${event.note}` : ""}</p>)}</details></article>)}{count > 20 && <nav className="pagination" aria-label="Páginas de contactos">{page > 1 && <Link href={`${root}/contactos?${query}&pagina=${page - 1}`}>Anterior</Link>}<span>Página {page} de {Math.ceil(count / 20)}</span>{page * 20 < count && <Link href={`${root}/contactos?${query}&pagina=${page + 1}`}>Siguiente</Link>}</nav>}</>;
}
