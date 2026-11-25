"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "./favorite-button";
import { ListingCard } from "./listing-card";
import type { CatalogItem } from "@/lib/catalog";
export function SavedCatalog({ items }: { items: CatalogItem[] }) {
  const { ids } = useFavorites();
  if (ids === null) return <p className="loading-message">Buscando tus espacios guardados…</p>;
  const saved = items.filter(item => ids.includes(item.id));
  return saved.length ? <div className="listing-grid catalog-grid">{saved.map(item => <ListingCard key={item.id} item={item}/>)}</div> : <div className="empty-state"><Heart size={42} strokeWidth={1.3}/><h2>Haz espacio para tus favoritos.</h2><p>Toca el corazón de una estadía para encontrarla aquí.</p><Link href="/estadias" className="button button-primary">Explorar estadías</Link></div>;
}
