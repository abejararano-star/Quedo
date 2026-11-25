import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const [sessions, limits] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  console.log(`Sesiones vencidas eliminadas: ${sessions.count}; límites vencidos: ${limits.count}.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
