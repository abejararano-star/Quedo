import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions";
export const metadata = { title: "Mi perfil de huésped" };
export default async function GuestProfile() {
  const user = await getUser();
  if (!user) redirect("/acceso");
  return <div className="container page-space"><p className="eyebrow">MI PERFIL</p><h1 className="page-title">Hola, {user.name}.</h1>
    <p className="page-description">{user.email}</p><div className="button-row"><Link href="/guardados" className="button button-primary">Ver mis guardados</Link>
    <Link href="/estadias" className="button button-secondary">Explorar estadías</Link></div><form action={logout}><button className="text-link">Cerrar sesión</button></form></div>;
}