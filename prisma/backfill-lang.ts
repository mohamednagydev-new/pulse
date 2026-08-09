/**
 * One-off: flip every account's preferredLang to Arabic.
 *
 * Until Aug 2026 nothing ever wrote preferredLang, so every user sat on the old
 * "en" default and got English pushes/reminders — wrong for an Egyptian
 * audience. After this runs, the app self-corrects per user: the client now
 * syncs the device's real UI language to the account on every login/app open,
 * so anyone who actually uses English gets switched back automatically.
 *
 * Run on the server:  node node_modules\tsx\dist\cli.mjs prisma\backfill-lang.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.user.updateMany({
    where: { preferredLang: 'en' },
    data: { preferredLang: 'ar' },
  });
  console.log(`preferredLang en → ar for ${count} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
