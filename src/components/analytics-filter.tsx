import { dateKey, type AnalyticsFilter } from "@/lib/analytics-math";
export function AnalyticsFilterForm({ filter, hostOnly = false }: { filter: AnalyticsFilter; hostOnly?: boolean }) {
  return <form className="analytics-filter" method="get"><label>Desde<input type="date" name="desde" defaultValue={filter.from} max={dateKey(new Date())} required/></label><label>Hasta<input type="date" name="hasta" defaultValue={filter.to} max={dateKey(new Date())} required/></label>{hostOnly ? <input type="hidden" name="datos" value={filter.scope}/> : <label>Datos<select name="datos" defaultValue={filter.scope}><option value="reales">Datos reales</option><option value="prueba">Datos de prueba</option></select></label>}<button className="button button-primary">Aplicar período</button></form>;
}
