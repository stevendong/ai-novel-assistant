const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // 获取第一个用户
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!firstUser) {
      console.log('没有找到任何用户');
      return;
    }

    // 将第一个用户设为管理员
    const updatedUser = await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'admin' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    console.log('管理员创建成功:');
    console.log(`用户ID: ${updatedUser.id}`);
    console.log(`用户名: ${updatedUser.username}`);
    console.log(`邮箱: ${updatedUser.email}`);
    console.log(`角色: ${updatedUser.role}`);

  } catch (error) {
    console.error('创建管理员失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();