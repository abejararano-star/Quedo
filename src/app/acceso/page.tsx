import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accountPath, getUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Iniciar sesión" };
export default async function Login() {
  const user = await getUser();
  if (user) redirect(accountPath(user.role));
  return <div className="auth-layout"><div className="auth-intro"><p className="eyebrow">TU CUENTA QUEDO</p><h1>Qué bueno<br/>verte de nuevo.</h1><p>Entra para recuperar tus guardados o gestionar tus espacios.</p></div><div className="auth-form-wrap"><AuthForm mode="login"/></div></div>;
}
