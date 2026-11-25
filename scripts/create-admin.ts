import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();
async function main() {
  // Accept credentials on stdin, never in command arguments or the repository.
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const { name, email, password } = JSON.parse(input) as { name: string; email: string; password: string };
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) throw new Error("Nombre, correo y contraseña de al menos 12 caracteres requeridos.");
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new Error("El correo ya existe. Este comando no modifica cuentas existentes.");
  await db.user.create({ data: { name, email: email.toLowerCase(), passwordHash: await hashPassword(password), role: "ADMIN" } });
  console.log("Administrador local creado. Las credenciales no se han mostrado.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
