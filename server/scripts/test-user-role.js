const { PrismaClient } = require('@prisma/client');
const AuthUtils = require('../utils/auth');

const prisma = new PrismaClient();

async function testUserRole() {
  try {
    // 获取普通用户
    const normalUser = await prisma.user.findFirst({
      where: { role: 'user' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!normalUser) {
      console.log('没有找到普通用户');
      return;
    }

    console.log('=== 普通用户信息 ===');
    console.log(`ID: ${normalUser.id}`);
    console.log(`用户名: ${normalUser.username}`);
    console.log(`邮箱: ${normalUser.email}`);
    console.log(`角色: ${normalUser.role}`);
    console.log(`状态: ${normalUser.isActive ? '活跃' : '禁用'}`);

    // 创建会话测试
    const session = await AuthUtils.createUserSession(
      normalUser.id,
      'test-script/1.0',
      '127.0.0.1'
    );

    console.log('\n=== 会话信息 ===');
    console.log(`Session Token: ${session.sessionToken}`);

    // 验证会话
    const validatedSession = await AuthUtils.validateSession(session.sessionToken);

    if (validatedSession) {
      console.log('\n=== 验证后的用户信息 ===');
      console.log(`ID: ${validatedSession.user.id}`);
      console.log(`用户名: ${validatedSession.user.username}`);
      console.log(`邮箱: ${validatedSession.user.email}`);
      console.log(`角色: ${validatedSession.user.role}`);
      console.log(`权限检查: ${validatedSession.user.role === 'admin' ? '✅ 有管理员权限' : '❌ 无管理员权限'}`);
    } else {
      console.log('❌ 会话验证失败');
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserRole();