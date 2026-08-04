const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'posdonca@gmail.com';
  
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log(`User ${email} is already registered.`);
  } else {
    const newUser = await prisma.user.create({
      data: {
        email: email,
        username: 'posdonca',
        namaLengkap: 'Administrator',
        role: 'ADMIN',
        isActive: true,
      }
    });
    console.log('Successfully created admin user:', newUser);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
