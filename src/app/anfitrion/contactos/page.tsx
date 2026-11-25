import { requireUser } from "@/lib/auth";
import { analyticsFilter, filterQuery, type AnalyticsParams } from "@/lib/analytics-math";
import { PortalNav } from "@/components/portal-nav";
import { ContactBoard } from "@/components/contact-board";
export default async function HostContacts({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const user = await requireUser(); const params = await searchParams;
  const filter = analyticsFilter({ ...params, datos: user.isTest ? "prueba" : "reales" }, user.isTest);
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  return <div className="container page-space"><div className="workspace-header"><div><p className="eyebrow">TU PANEL DE ANFITRIÓN</p><h1>Cada consulta merece respuesta.</h1><p>Gestiona únicamente los contactos de tus espacios.</p></div></div><PortalNav active="/anfitrion/contactos" query={filterQuery(filter)}/><ContactBoard filter={filter} hostId={user.id} page={page}/></div>;
}
