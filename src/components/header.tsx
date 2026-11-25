import Link from "next/link";
import { Heart, Menu, UserRound } from "lucide-react";
import { accountPath, getUser } from "@/lib/auth";
import { Brand } from "./brand";

export async function Header() {
  const user = await getUser();
  return <header className="site-header"><div className="container header-inner">
    <Brand />
    <nav className="desktop-nav" aria-label="Navegación principal"><Link href="/estadias">Encuentra tu estadía</Link><Link href="/como-funciona">Así funciona Quedo</Link></nav>
    <div className="header-actions"><Link href="/guardados" className="icon-button" aria-label="Estadías guardadas"><Heart size={20}/></Link><Link className="host-link" href={user?.role === "GUEST" ? "/guardados" : "/anfitrion"}>{user?.role === "GUEST" ? "Mis guardados" : "Publica tu espacio"}</Link><Link className="account-link" href={user ? accountPath(user.role) : "/acceso"} aria-label={user ? "Mi cuenta" : "Iniciar sesión"}><Menu size={18}/><span className="account-avatar"><UserRound size={17}/></span></Link></div>
  </div></header>;
}
