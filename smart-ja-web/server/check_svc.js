const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const sc = await prisma.service.findUnique({
      where: { id: 'svc-1774965666421' }
    });
    console.log('SERVICE_DATA:', JSON.stringify(sc, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
