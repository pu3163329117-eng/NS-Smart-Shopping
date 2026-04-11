const prisma = require('./utils/prisma');

async function seedSocial() {
  try {
    const user = await prisma.user.findFirst({ where: { id: 'user1' } });
    if (!user) {
      console.log('User user1 not found, skip seeding posts.');
      return;
    }

    const posts = [
      {
        userId: user.id,
        content: '👋 欢迎来到 NS Matrix 动态社区！在这里分享你的创客灵感和产品动态。',
        tags: ['#社区指南', '#创客'],
        status: 'published'
      },
      {
        userId: user.id,
        content: '刚刚完成了一个新的 AI 产品原型，准备在 AI 实验室进行孵化，有人感兴趣一起探讨吗？🚀',
        tags: ['#AI实验室', '#创业笔记'],
        status: 'published'
      },
      {
        userId: user.id,
        content: '这就是未来的智能购物体验吗？期待我们的平台正式上线！✨',
        tags: ['#产品情报', '#NSMatrix'],
        status: 'published'
      }
    ];

    for (const p of posts) {
      await prisma.post.create({ data: p });
    }

    console.log('Successfully seeded 3 posts for user1.');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedSocial();
