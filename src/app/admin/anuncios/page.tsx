import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsFilter, filterQuery, type AnalyticsParams } from "@/lib/analytics-math";
import { listingScope } from "@/lib/analytics";
import { money, shortDate, statusLabels } from "@/lib/format";
import { moderateListing, resolveReport } from "@/app/actions";
import { PortalNav } from "@/components/portal-nav";

export default async function Moderation({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const user = await requireAdmin();
  const params = await searchParams;
  const filter = analyticsFilter(params, user.isTest);
  const query = filterQuery(filter);
  const where = listingScope(filter);
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const [listings, count, pending, reports, audits] = await Promise.all([
    db.listing.findMany({ where, include: { host: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 20, skip: (page - 1) * 20 }),
    db.listing.count({ where }), db.listing.count({ where: { ...where, status: "PENDING" } }),
    db.report.findMany({ where: { resolved: false, listing: where }, include: { listing: { select: { title: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.auditLog.findMany({ where: { actor: { isTest: filter.isTest } }, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return <div className="container page-space"><div className="workspace-header"><div><p className="eyebrow">ADMINISTRACIÓN DE QUEDO</p><h1>Cuida cada publicación.</h1><p>{pending} anuncios en revisión · {count} anuncios en esta vista.</p></div></div><PortalNav admin active="/admin/anuncios" query={query}/><form className="scope-switch" method="get"><label>Vista de anuncios<select name="datos" defaultValue={filter.scope}><option value="reales">Datos reales</option><option value="prueba">Datos de prueba</option></select></label><button className="button button-secondary">Cambiar vista</button></form>{filter.isTest && <div className="notice">Estás gestionando ejemplos. Puedes aprobarlos y publicarlos como demostración; el contacto comercial permanece deshabilitado.</div>}{!listings.length && <div className="empty-state"><h2>No hay anuncios en esta vista.</h2><p>Cambia a datos de prueba para explorar el escenario preparado.</p></div>}
    {listings.map(item => <article className="moderation-card" key={item.id}><span className={`badge ${item.status === "PENDING" ? "badge-pending" : ""}`}>{statusLabels[item.status]}</span><h2><Link href={`/estadias/${item.slug}`}>{item.title}</Link></h2><p>{item.host.name} · {item.host.email} · {item.district} · {money(item.priceNight)} COP / noche</p><p>{item.isDemo ? "Anuncio de demostración, sin contacto ni RNT real." : `RNT aportado: ${item.rnt ?? "No aportado"}`}</p>{item.reviewNote && <p>Última revisión: {item.reviewNote}</p>}<div className="button-row"><Link href={`/estadias/${item.slug}`} className="text-link">Inspeccionar ficha</Link><Link href={`/anfitrion/${item.id}/editar`} className="text-link">Editar anuncio</Link></div><form action={moderateListing}><input type="hidden" name="id" value={item.id}/><div className="filters-fields"><label>Decisión<select name="status" required defaultValue="REJECTED"><option value="REJECTED">Solicitar cambios</option><option value="PUBLISHED">Publicar</option><option value="PAUSED">Suspender publicación</option></select></label><label>Alcance y resultado de la revisión<textarea name="note" required minLength={10} maxLength={500} rows={2} placeholder="Documenta qué revisaste y qué debe cambiar."/></label></div><label className="check-label"><input name="reviewed" type="checkbox" required/>He revisado la ficha y las condiciones de publicación.</label><button className="button button-primary" style={{ marginTop: 18 }}>Guardar decisión</button></form></article>)}
    {count > 20 && <nav className="pagination" aria-label="Páginas de anuncios">{page > 1 && <Link href={`/admin/anuncios?${query}&pagina=${page - 1}`}>Anterior</Link>}<span>Página {page} de {Math.ceil(count / 20)}</span>{page * 20 < count && <Link href={`/admin/anuncios?${query}&pagina=${page + 1}`}>Siguiente</Link>}</nav>}
    <section className="analytics-card"><h2>Reportes abiertos</h2><p className="analytics-note">Hasta veinte reportes pendientes de esta vista.</p>{!reports.length && <p className="workspace-note">No hay reportes pendientes.</p>}{reports.map(report => <article className="report-item" key={report.id}><Link className="text-link" href={`/estadias/${report.listing.slug}`}>{report.listing.title}</Link><p>{report.reason}</p><p>{shortDate(report.createdAt)}</p><form action={resolveReport}><input type="hidden" name="id" value={report.id}/><button className="button button-secondary">Marcar como atendido</button></form></article>)}</section><section className="analytics-card"><h2>Actividad reciente de estas cuentas</h2><ul className="audit-list">{audits.map(item => <li key={item.id}>{shortDate(item.createdAt)} · {item.actor.name} · {item.action}{item.note ? ` · ${item.note}` : ""}</li>)}</ul></section>
  </div>;
}
