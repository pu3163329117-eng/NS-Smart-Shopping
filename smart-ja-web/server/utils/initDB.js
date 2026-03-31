const prisma = require('./prisma');
const { hashPassword } = require('./auth');
const { migrateLegacyData } = require('./legacyMigration');
const { toServicePersistence, toUserPersistence } = require('./dataMappers');

const isProduction = process.env.NODE_ENV === 'production';
const enableLegacyMigration =
  process.env.ENABLE_LEGACY_MIGRATION === 'true' ||
  (!isProduction && process.env.ENABLE_LEGACY_MIGRATION !== 'false');
const enableBootstrapSeed = process.env.ENABLE_BOOTSTRAP_SEED === 'true';

const initDB = async () => {
  console.log('Starting initDB...');
  try {
    if (enableLegacyMigration) {
      const migrationResult = await migrateLegacyData();

      if (!migrationResult.skipped) {
        console.log('Imported legacy data into Prisma models.');
        console.log(migrationResult);
        return;
      }
    } else {
      console.log('Legacy migration is disabled by configuration.');
    }

    if (!enableBootstrapSeed) {
      console.log('Bootstrap seed is disabled.');
      return;
    }

    const existingUsers = await prisma.user.count();
    if (existingUsers === 0) {
      const hashedPassword = await hashPassword('password');
      const seedUser = toUserPersistence({
        id: 'user1',
        email: 'test@example.com',
        password: hashedPassword,
        username: 'Test User',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=&backgroundColor=0a0a0c&textColor=ffffff'
      });

      await prisma.user.create({ data: seedUser });
      console.log('Initialized users');
    }

    const existingServices = await prisma.service.count();
    if (existingServices === 0) {
      const seedOwner =
        (await prisma.user.findUnique({ where: { id: 'user1' } })) ||
        (await prisma.user.findFirst());

      if (seedOwner) {
        await prisma.service.create({
          data: toServicePersistence(
            {
              id: '1',
              title: '3D Printing Service',
              description: 'High quality resin printing',
              price: 50,
              image: 'https://picsum.photos/300/200?random=1'
            },
            seedOwner
          )
        });
        console.log('Initialized services');
      }
    }

    console.log('Finished initDB');
  } catch (error) {
    console.error('Error in initDB:', error);
    throw error;
  }
};

module.exports = initDB;
