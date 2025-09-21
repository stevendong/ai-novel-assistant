const { PrismaClient } = require('@prisma/client');
const AuthUtils = require('../utils/auth');

const prisma = new PrismaClient();

async function testInviteVerification() {
  try {
    // 找一个已验证邀请码的用户
    const verifiedUser = await prisma.user.findFirst({
      where: { inviteVerified: true },
      select: {
        id: true,
        username: true,
        email: true,
        inviteVerified: true
      }
    });

    if (!verifiedUser) {
      console.log('没有找到已验证的用户');
      return;
    }

    console.log('=== 已验证用户信息 ===');
    console.log(`ID: ${verifiedUser.id}`);
    console.log(`用户名: ${verifiedUser.username}`);
    console.log(`邮箱: ${verifiedUser.email}`);
    console.log(`邀请码已验证: ${verifiedUser.inviteVerified ? '是' : '否'}`);

    // 创建会话
    const session = await AuthUtils.createUserSession(
      verifiedUser.id,
      'test-script/1.0',
      '127.0.0.1'
    );

    console.log('\n=== 测试重复验证邀请码 ===');
    console.log(`Session Token: ${session.sessionToken}`);

    // 模拟API调用测试
    const testResponse = {
      statusCode: null,
      data: null,
      error: null
    };

    // 模拟验证已验证用户的邀请码验证请求
    console.log('测试结果：如果已验证用户尝试验证邀请码，应该返回错误');
    console.log('前端应该在组件加载时检查 user.inviteVerified 状态并自动跳转');

    console.log('\n=== 预期行为 ===');
    console.log('1. 路由守卫应该阻止已验证用户访问 /invite-verification');
    console.log('2. 如果用户直接访问验证页面，组件的 onMounted 钩子应该检查状态并重定向');
    console.log('3. 如果用户尝试调用验证API，服务器应该返回 "您已经验证过邀请码了，无需重复验证"');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInviteVerification();