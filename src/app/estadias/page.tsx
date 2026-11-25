import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { getCatalog, type CatalogParams } from "@/lib/catalog";
import { amenities, types } from "@/lib/format";
import { SearchBar } from "@/components/search-bar";
import { CategoryTabs } from "@/components/category-tabs";
import { ListingCard } from "@/components/listing-card";
import { parseConsultation } from "@/lib/validation";

export const metadata: Metadata = { title: "Encuentra tu estadía" };
export default async function Catalog({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  const { items, count, page } = await getCatalog(params);
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const selectedServices = typeof params.servicio === "string" ? [params.servicio] : params.servicio ?? [];
  const consultation = { ...parseConsultation(value("llegada"), value("personas")), departure: parseConsultation(value("salida"), "").arrival };
  const pageHref = (number: number) => { const query = new URLSearchParams(); Object.entries(params).forEach(([key, val]) => { if (typeof val === "string") query.set(key, val); else val?.forEach(item => query.append(key, item)); }); query.set("pagina", String(number)); return `/estadias?${query}`; };
  return <div className="container page-space"><p className="breadcrumb"><Link href="/">Inicio</Link><span>/</span>Estadías</p><div className="section-heading"><div><p className="eyebrow">TU PRÓXIMO LUGAR ESTÁ POR AQUÍ</p><h1 className="page-title">Quédate en Quibdó.</h1></div><span className="result-count">{count} {count === 1 ? "espacio" : "espacios"} para explorar</span></div><SearchBar compact q={value("q")} people={value("personas")} date={value("llegada")} departure={value("salida")}/><p className="search-hint">Consulta las fechas directamente con el anfitrión. Los ejemplos no representan oferta real.</p><CategoryTabs params={params} selected={value("tipo") || selectedServices[0] || ""}/>
    <details id="filtros" className="filter-panel" open={Boolean(value("precio") || selectedServices.length || value("orden"))}><summary><SlidersHorizontal size={18}/>Personaliza tu búsqueda<span>Servicios, presupuesto y orden</span></summary><form action="/estadias" className="filters-form"><input type="hidden" name="q" value={value("q")}/><input type="hidden" name="personas" value={value("personas")}/><input type="hidden" name="salida" value={value("salida")}/><input type="hidden" name="llegada" value={value("llegada")}/><div className="filters-fields"><label>Tipo de espacio<select name="tipo" defaultValue={value("tipo")}><option value="">Todos los espacios</option>{types.map(item => <option key={item}>{item}</option>)}</select></label><label>Máximo por noche (COP)<input type="number" name="precio" min="10000" max="20000000" step="1000" defaultValue={value("precio")} placeholder="Sin límite"/></label><label>Ordenar por<select name="orden" defaultValue={value("orden")}><option value="">Recomendados</option><option value="precio-asc">Menor precio</option><option value="precio-desc">Mayor precio</option></select></label></div><fieldset><legend>Lo que necesitas en tu estadía</legend><div className="checkbox-grid">{amenities.map(item => <label className="check-label" key={item}><input type="checkbox" name="servicio" value={item} defaultChecked={selectedServices.includes(item)}/>{item}</label>)}</div></fieldset><div className="button-row"><button className="button button-primary">Aplicar filtros</button><Link href="/estadias" className="text-link">Limpiar filtros</Link></div></form></details>
    {items.length ? <div className="listing-grid catalog-grid">{items.map(item => <ListingCard item={item} key={item.id} consultation={consultation}/>)}</div> : <div className="empty-state"><SearchX size={40} strokeWidth={1.3}/><h2>No encontramos espacios con esos filtros.</h2><p>Prueba otra zona, un presupuesto diferente o menos servicios.</p><Link href="/estadias" className="button button-primary">Ver todos los espacios</Link></div>}
    {count > 12 && <nav className="pagination" aria-label="Páginas de resultados">{page > 1 && <Link className="button button-secondary" href={pageHref(page - 1)}>Anterior</Link>}<span>Página {page} de {Math.ceil(count / 12)}</span>{page * 12 < count && <Link className="button button-secondary" href={pageHref(page + 1)}>Siguiente</Link>}</nav>}
  </div>;
}
