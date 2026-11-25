import { requireAdmin } from "@/lib/auth";
import { analyticsFilter, filterQuery, type AnalyticsParams } from "@/lib/analytics-math";
import { PortalNav } from "@/components/portal-nav";
import { ContactBoard } from "@/components/contact-board";
export default async function AdminContacts({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const user = await requireAdmin(); const params = await searchParams;
  const filter = analyticsFilter(params, user.isTest);
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  return <div className="container page-space"><div className="workspace-header"><div><p className="eyebrow">ADMINISTRACIÓN DE QUEDO</p><h1>Del interés al resultado.</h1><p>Revisa y da seguimiento a las consultas de todos los anfitriones.</p></div></div><PortalNav admin active="/admin/contactos" query={filterQuery(filter)}/><ContactBoard filter={filter} page={page}/></div>;
}
