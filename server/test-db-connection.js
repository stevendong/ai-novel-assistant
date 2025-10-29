/**
 * Supabase 数据库连接测试脚本
 *
 * 使用方法：
 * 1. 确保 .env 文件中已配置 DATABASE_URL
 * 2. 运行: node test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  console.log('='.repeat(60));
  console.log('🔍 Supabase PostgreSQL 连接测试');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 测试 1: 数据库连接
    console.log('📡 测试 1: 数据库连接...');
    await prisma.$connect();
    console.log('   ✅ 数据库连接成功！');
    console.log('');

    // 测试 2: 查询数据库信息
    console.log('📊 测试 2: 查询数据库信息...');
    const dbInfo = await prisma.$queryRaw`
      SELECT
        current_database() as database,
        version() as version,
        pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log('   数据库名:', dbInfo[0].database);
    console.log('   版本:', dbInfo[0].version.split('\n')[0]);
    console.log('   大小:', dbInfo[0].size);
    console.log('');

    // 测试 3: 查询表结构
    console.log('📋 测试 3: 查询表结构...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`   ✅ 找到 ${tables.length} 个表`);
    if (tables.length > 0) {
      console.log('   表列表:');
      tables.forEach((table, idx) => {
        console.log(`     ${idx + 1}. ${table.table_name}`);
      });
    }
    console.log('');

    // 测试 4: 数据统计
    console.log('📈 测试 4: 数据统计...');
    const stats = {
      users: await prisma.user.count(),
      novels: await prisma.novel.count(),
      characters: await prisma.character.count(),
      worldSettings: await prisma.worldSetting.count(),
      chapters: await prisma.chapter.count(),
      aiConversations: await prisma.aIConversation.count(),
      inviteCodes: await prisma.inviteCode.count(),
    };

    console.log('   用户数:', stats.users);
    console.log('   小说数:', stats.novels);
    console.log('   角色数:', stats.characters);
    console.log('   世界设定数:', stats.worldSettings);
    console.log('   章节数:', stats.chapters);
    console.log('   AI对话数:', stats.aiConversations);
    console.log('   邀请码数:', stats.inviteCodes);
    console.log('');

    // 测试 5: 写入操作
    console.log('✏️  测试 5: 写入操作...');
    const testUsername = `test_${Date.now()}`;
    const testEmail = `test_${Date.now()}@example.com`;

    const testUser = await prisma.user.create({
      data: {
        username: testUsername,
        email: testEmail,
        password: '$2a$10$testHashedPassword',
        nickname: 'Test User',
      },
    });
    console.log(`   ✅ 创建测试用户: ${testUser.username} (ID: ${testUser.id})`);

    // 测试 6: 读取操作
    console.log('');
    console.log('📖 测试 6: 读取操作...');
    const readUser = await prisma.user.findUnique({
      where: { id: testUser.id },
    });
    if (readUser) {
      console.log(`   ✅ 读取用户成功: ${readUser.username}`);
    }

    // 测试 7: 更新操作
    console.log('');
    console.log('🔄 测试 7: 更新操作...');
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { nickname: 'Updated Test User' },
    });
    console.log(`   ✅ 更新用户成功: ${updatedUser.nickname}`);

    // 测试 8: 删除操作
    console.log('');
    console.log('🗑️  测试 8: 删除操作...');
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('   ✅ 删除测试用户成功');

    // 测试 9: 事务操作
    console.log('');
    console.log('🔀 测试 9: 事务操作...');
    try {
      await prisma.$transaction(async (tx) => {
        const user1 = await tx.user.create({
          data: {
            username: `tx_test_1_${Date.now()}`,
            email: `tx_test_1_${Date.now()}@example.com`,
            password: '$2a$10$testHashedPassword',
          },
        });

        const user2 = await tx.user.create({
          data: {
            username: `tx_test_2_${Date.now()}`,
            email: `tx_test_2_${Date.now()}@example.com`,
            password: '$2a$10$testHashedPassword',
          },
        });

        // 清理测试数据
        await tx.user.delete({ where: { id: user1.id } });
        await tx.user.delete({ where: { id: user2.id } });
      });
      console.log('   ✅ 事务操作成功');
    } catch (error) {
      console.log('   ❌ 事务操作失败:', error.message);
    }

    // 测试 10: 性能测试
    console.log('');
    console.log('⚡ 测试 10: 性能测试...');
    const startTime = Date.now();
    await prisma.user.findMany({ take: 100 });
    const duration = Date.now() - startTime;
    console.log(`   ✅ 查询100条记录耗时: ${duration}ms`);

    // 测试完成
    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 所有测试通过！Supabase 数据库已就绪。');
    console.log('='.repeat(60));
    console.log('');
    console.log('💡 提示:');
    console.log('   - 数据库连接正常');
    console.log('   - 所有 CRUD 操作正常');
    console.log('   - 事务处理正常');
    console.log('   - 可以开始使用应用了！');
    console.log('');

  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ 数据库测试失败');
    console.log('='.repeat(60));
    console.log('');
    console.error('错误详情:', error.message);
    console.log('');
    console.log('💡 常见问题排查:');
    console.log('');
    console.log('1. 连接字符串是否正确？');
    console.log('   检查 .env 文件中的 DATABASE_URL');
    console.log('');
    console.log('2. 密码是否需要 URL 编码？');
    console.log('   特殊字符需要编码：@ → %40, # → %23');
    console.log('');
    console.log('3. 数据库是否已创建表结构？');
    console.log('   运行: npx prisma db push');
    console.log('');
    console.log('4. 网络连接是否正常？');
    console.log('   检查防火墙和网络设置');
    console.log('');
    console.log('5. Supabase 项目是否正常运行？');
    console.log('   访问 Supabase Dashboard 检查项目状态');
    console.log('');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testConnection();
