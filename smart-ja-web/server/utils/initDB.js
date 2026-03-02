const prisma = require('./prisma');
const { hashPassword } = require('./auth');
const { migrateLegacyData } = require('./legacyMigration');
const { toServicePersistence, toUserPersistence } = require('./dataMappers');

const initDB = async () => {
  console.log('Starting initDB...');
  try {
    const migrationResult = await migrateLegacyData();

    if (!migrationResult.skipped) {
      console.log('Imported legacy data into Prisma models.');
      console.log(migrationResult);
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
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test'
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
