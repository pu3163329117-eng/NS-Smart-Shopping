const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
  const targetId = 'svc-1774965666421';
  const stableImage = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80'; // Futurism Tech
  
  console.log(`[Repair] Force updating ${targetId} with stable visual...`);

  try {
    await prisma.service.update({
      where: { id: targetId },
      data: { image: stableImage }
    });
    
    await prisma.serviceSku.updateMany({
      where: { serviceId: targetId },
      data: { image: stableImage }
    });

    console.log(`[Repair] Done. Stable image set: ${stableImage}`);
  } catch (error) {
    console.error('[Repair] Failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

repair();
