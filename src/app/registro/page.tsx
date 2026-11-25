import Link from "next/link";
import { redirect } from "next/navigation";
import { accountPath, getUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Crear cuenta" };
export default async function Register({ searchParams }: { searchParams: Promise<{ perfil?: string }> }) {
  const user = await getUser();
  if (user) redirect(accountPath(user.role));
  const guest = (await searchParams).perfil === "huesped";
  return <div className="auth-layout"><div className="auth-intro"><p className="eyebrow">{guest ? "PARA HUÉSPEDES" : "PARA ANFITRIONES"}</p>
    <h1>{guest ? "Encuentra tu lugar en Quibdó." : "Abre tus puertas."}</h1>
    <p>{guest ? "Reúne los lugares que te gustan y vuelve a ellos cuando prepares tu viaje." : "Presenta tu alojamiento y conversa con tus futuros huéspedes."}</p></div>
    <div className="auth-form-wrap"><AuthForm mode="register" guest={guest}/><Link className="text-link" href={guest ? "/registro" : "/registro?perfil=huesped"}>{guest ? "Quiero publicar un alojamiento" : "Quiero una cuenta de huésped"}</Link></div></div>;
}