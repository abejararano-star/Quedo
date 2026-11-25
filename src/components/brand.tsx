import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Quedo, inicio">
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M35 36C29 43 16 43 9 34C1 24 6 9 18 6C28 3 40 10 40 22C40 29 36 33 30 34H22L39 44" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 17C11 9 18 5 26 6" stroke="#D9A541" strokeWidth="6" strokeLinecap="round"/></svg>
    <span>quedo<span className="brand-dot">.</span></span>
  </Link>;
}
