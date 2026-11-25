"use client";
import { Heart } from "lucide-react";
import { createContext, useActionState, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { setFavorite } from "@/app/favorite-actions";

const key = "quedo:favorites:v1";
const Favorites = createContext<{ userId: string | null; ids: string[] | null }>({ userId: null, ids: null });

function readLocal(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string").slice(-200) : [];
  } catch { return []; }
}

export function FavoriteProvider({ userId, ids, children }: { userId: string | null; ids: string[]; children: ReactNode }) {
  const [local, setLocal] = useState<string[] | null>(null);
  useEffect(() => {
    if (userId) return;
    const sync = () => setLocal(readLocal());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("quedo:favorites", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("quedo:favorites", sync); };
  }, [userId]);
  return <Favorites.Provider value={{ userId, ids: userId ? ids : local }}>{children}</Favorites.Provider>;
}
export function useFavorites() { return useContext(Favorites); }

export function FavoriteButton({ id, large = false }: { id: string; large?: boolean }) {
  const { userId, ids } = useFavorites();
  const saved = ids?.includes(id) ?? false;
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [serverError, action, saving] = useActionState(setFavorite, "");
  const label = saved ? "Quitar de guardados" : "Guardar estadía";
  const className = `favorite ${large ? "favorite-large" : ""} ${saved ? "is-saved" : ""}`;
  const contents = <><Heart size={large ? 20 : 19} fill={saved ? "currentColor" : "none"}/>{large && <span>{saved ? "Guardado" : "Guardar"}</span>}</>;
  if (userId) return <form action={action} style={{ display: "contents" }}>
    <input type="hidden" name="account" value={userId}/><input type="hidden" name="listing" value={id}/>
    <input type="hidden" name="saved" value={saved ? "no" : "yes"}/>
    <button type="submit" disabled={saving} className={className} aria-label={label} aria-pressed={saved}>{contents}</button>
    {serverError && <span role="alert">{serverError}</span>}</form>;
  function toggle() {
    setError("");
    start(async () => {
      try {
        const current = readLocal();
        const next = saved ? current.filter(item => item !== id) : [...new Set([...current, id])].slice(-200);
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event("quedo:favorites"));
      } catch { setError("No se pudo actualizar el guardado. Inténtalo de nuevo."); }
    });
  }
  return <><button type="button" disabled={pending || ids === null} onClick={toggle} className={className}
    aria-label={label} aria-pressed={saved}>{contents}</button>{error && <span role="alert">{error}</span>}</>;
}