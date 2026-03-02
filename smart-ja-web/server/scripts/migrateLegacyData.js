require('dotenv').config();

const prisma = require('../utils/prisma');
const { migrateLegacyData } = require('../utils/legacyMigration');

const main = async () => {
  try {
    const result = await migrateLegacyData();
    console.log('Legacy migration result:', result);
  } catch (error) {
    console.error('Legacy migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();
