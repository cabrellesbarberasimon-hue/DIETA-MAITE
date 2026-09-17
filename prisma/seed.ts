import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { runSeed } from "../src/lib/seed-core";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await runSeed(prisma, {
    maiteEmail: process.env.SEED_MAITE_EMAIL ?? "maite@example.com",
    maitePassword: process.env.SEED_MAITE_PASSWORD ?? "maite1234",
    simonEmail: process.env.SEED_SIMON_EMAIL ?? "simon@example.com",
    simonPassword: process.env.SEED_SIMON_PASSWORD ?? "simon1234",
  });

  console.log(result.alreadySeeded ? "Ya estaba sembrado, datos actualizados:" : "Seed completado:");
  console.log(`  Usuaria: ${result.maiteEmail}`);
  console.log(`  Admin:   ${result.simonEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
