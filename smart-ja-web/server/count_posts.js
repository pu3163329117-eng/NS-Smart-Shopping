const prisma = require('./utils/prisma');
async function main() {
  const count = await prisma.post.count();
  console.log('Posts count:', count);
  await prisma.$disconnect();
}
main();
