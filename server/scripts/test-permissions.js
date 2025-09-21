const { PrismaClient } = require('@prisma/client');
const AuthUtils = require('../utils/auth');

const prisma = new PrismaClient();

async function testPermissions() {
  try {
    // 检查现有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('=== 现有用户列表 ===');
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`角色: ${user.role}`);
      console.log(`状态: ${user.isActive ? '活跃' : '禁用'}`);
      console.log('---');
    });

    // 如果没有普通用户，创建一个测试用户
    const normalUser = users.find(u => u.role === 'user');
    if (!normalUser) {
      console.log('\n=== 创建测试普通用户 ===');
      const hashedPassword = await AuthUtils.hashPassword('test123');

      const newUser = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password: hashedPassword,
          nickname: '测试用户',
          role: 'user', // 明确设置为普通用户
          isActive: true,
          inviteVerified: true
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      console.log('测试用户创建成功:');
      console.log(`ID: ${newUser.id}`);
      console.log(`用户名: ${newUser.username}`);
      console.log(`邮箱: ${newUser.email}`);
      console.log(`角色: ${newUser.role}`);
      console.log('密码: test123');
    } else {
      console.log('\n=== 已存在普通用户 ===');
      console.log(`用户名: ${normalUser.username}`);
      console.log(`邮箱: ${normalUser.email}`);
      console.log(`角色: ${normalUser.role}`);
    }

    console.log('\n=== 权限测试说明 ===');
    console.log('1. 管理员用户可以看到：项目管理、角色库、世界设定、章节管理、进度统计、管理面板、邀请码管理、用户管理');
    console.log('2. 普通用户可以看到：项目管理、角色库、世界设定、章节管理、进度统计');
    console.log('3. 普通用户无法看到：管理面板、邀请码管理、用户管理');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissions();