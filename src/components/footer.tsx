import Link from "next/link";
import { Brand } from "./brand";

export function Footer() {
  return <footer className="site-footer"><div className="container"><div className="footer-main"><div><Brand light/><p>Un lugar para llegar.<br/>Una razón para quedarte.</p><span className="footer-origin">Hecho desde el Chocó.</span></div><div><h3>Explora Quedo</h3><Link href="/estadias">Encuentra una estadía</Link><Link href="/guardados">Tus espacios guardados</Link><Link href="/como-funciona">Cómo funciona</Link></div><div><h3>Abre tus puertas</h3><Link href="/registro">Conviértete en anfitrión</Link><Link href="/anfitrion">Gestiona tus anuncios</Link><Link href="/privacidad">Privacidad y condiciones</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Quedo</span><span>Quibdó, Chocó · Colombia</span><span>Español · COP</span></div></div></footer>;
}
