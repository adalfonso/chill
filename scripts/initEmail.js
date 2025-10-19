import { PrismaClient, UserType } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const emailArg = process.argv[2];

  if (!emailArg) {
    console.error("❌ Please provide an email argument.");
    process.exit(1);
  }

  const url = process?.env?.DATABASE_URL ?? "";

  if (url.includes("@postgres:")) {
    // Replace docker host with localhost
    process.env.DATABASE_URL = url.replace("@postgres:", "@localhost:");
  }

  try {
    const count = await prisma.user.count();

    if (count > 0) {
      console.error(
        `❌ There are already ${count} user(s) in the database. Aborting.`,
      );
      process.exit(1);
    }

    const result = await prisma.user.create({
      data: { email: emailArg, type: UserType.Admin },
    });

    console.info(`✅ Added email: ${result.email}`);
  } catch (err) {
    console.error("❌ Error inserting email:", err?.message);
  } finally {
    await prisma.$disconnect();
  }
})();
