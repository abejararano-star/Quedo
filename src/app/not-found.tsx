import Link from "next/link";
export default function NotFound() {
  return <div className="container not-found"><p className="eyebrow">ESTE LUGAR CAMBIÓ DE DIRECCIÓN</p><h1>No encontramos esta página.</h1><p>El anuncio puede estar pausado o todavía en revisión.</p><Link href="/estadias" className="button button-primary">Explorar estadías</Link></div>;
}
