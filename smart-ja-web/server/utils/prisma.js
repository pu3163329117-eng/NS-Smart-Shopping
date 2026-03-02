const { PrismaClient } = require('@prisma/client');

let prisma = global.__smartJaPrisma;

if (!prisma) {
  prisma = new PrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    global.__smartJaPrisma = prisma;
  }
}

module.exports = prisma;
