const prisma = require('./prisma');

const withTransaction = (handler) => prisma.$transaction(handler);

module.exports = {
  prisma,
  withTransaction
};
