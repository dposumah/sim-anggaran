const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Running prebuild script to fix database schema inconsistencies...");
  try {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;`);
    console.log("Successfully dropped trigger on_auth_user_created.");
  } catch (err) {
    console.error("Warning: Failed to drop trigger:", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;`);
    console.log("Successfully dropped function public.handle_new_user().");
  } catch (err) {
    console.error("Warning: Failed to drop function:", err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public.profiles CASCADE;`);
    console.log("Successfully dropped public.profiles table.");
  } catch (err) {
    console.error("Warning: Failed to drop public.profiles:", err.message);
  } 

  await prisma.$disconnect();
}

main();
