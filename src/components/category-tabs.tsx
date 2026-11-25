import Link from "next/link";
import { Building2, House, BedDouble, LayoutGrid, Coffee, BriefcaseBusiness } from "lucide-react";
const categories = [
  { label: "Todos los espacios", href: "/estadias", icon: LayoutGrid, value: "" },
  { label: "Apartaestudios", href: "/estadias?tipo=Apartaestudio", icon: Building2, value: "Apartaestudio" },
  { label: "Apartamentos", href: "/estadias?tipo=Apartamento", icon: House, value: "Apartamento" },
  { label: "Habitaciones", href: "/estadias?tipo=Habitaci%C3%B3n", icon: BedDouble, value: "Habitación" },
  { label: "Con cocina", href: "/estadias?servicio=Cocina", icon: Coffee, value: "Cocina" },
  { label: "Para trabajar", href: "/estadias?servicio=Zona%20de%20trabajo", icon: BriefcaseBusiness, value: "Zona de trabajo" },
];
export function CategoryTabs({ selected = "", params = {} }: { selected?: string; params?: Record<string, string | string[] | undefined> }) {
  function href(path: string) {
    const query = new URLSearchParams(path.split("?")[1]);
    for (const key of ["q", "personas", "llegada", "salida", "precio", "orden"]) {
      const value = params[key];
      if (typeof value === "string" && value) query.set(key, value);
    }
    return query.size ? "/estadias?" + query : "/estadias";
  }
  return <nav className="category-tabs" aria-label="Tipos de estadía">{categories.map(item => <Link className={`category-tab ${selected === item.value ? "active" : ""}`} href={href(item.href)} key={item.label} aria-current={selected === item.value ? "page" : undefined}><item.icon size={23} strokeWidth={1.5}/><span>{item.label}</span></Link>)}</nav>;
}
