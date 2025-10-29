/**
 * 数据迁移脚本：从 SQLite 迁移到 PostgreSQL/MySQL
 *
 * 使用方法：
 * 1. 确保新数据库已经创建并应用了 schema
 * 2. 配置环境变量：
 *    - OLD_DATABASE_URL: SQLite 数据库路径
 *    - DATABASE_URL: 新数据库连接字符串
 * 3. 运行: node scripts/migrate-data.js
 */

const { PrismaClient } = require('@prisma/client');

// SQLite 客户端
const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL || 'file:./prisma/novels.db'
    }
  }
});

// 新数据库客户端
const newDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// 迁移统计
const stats = {
  success: 0,
  failed: 0,
  errors: []
};

/**
 * 迁移表数据
 */
async function migrateTable(tableName, findManyFn, createFn) {
  try {
    console.log(`\n📦 迁移 ${tableName}...`);
    const records = await findManyFn();
    console.log(`   找到 ${records.length} 条记录`);

    let success = 0;
    let failed = 0;

    for (const record of records) {
      try {
        await createFn(record);
        success++;
        if (success % 100 === 0) {
          console.log(`   已处理 ${success}/${records.length}...`);
        }
      } catch (error) {
        failed++;
        stats.errors.push({
          table: tableName,
          record: record.id,
          error: error.message
        });
        console.error(`   ✗ 失败: ${record.id} - ${error.message}`);
      }
    }

    console.log(`   ✓ 成功: ${success}, 失败: ${failed}`);
    stats.success += success;
    stats.failed += failed;

    return { success, failed, total: records.length };
  } catch (error) {
    console.error(`   ✗ 迁移 ${tableName} 失败:`, error.message);
    throw error;
  }
}

/**
 * 主迁移函数
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('🚀 开始数据迁移');
  console.log('='.repeat(60));
  console.log(`源数据库: ${process.env.OLD_DATABASE_URL || 'file:./prisma/novels.db'}`);
  console.log(`目标数据库: ${process.env.DATABASE_URL}`);
  console.log('');

  const startTime = Date.now();

  try {
    // 测试连接
    console.log('🔌 测试数据库连接...');
    await oldDb.$connect();
    console.log('   ✓ 源数据库连接成功');
    await newDb.$connect();
    console.log('   ✓ 目标数据库连接成功');

    // 1. 迁移用户（必须最先迁移，因为其他表都依赖它）
    await migrateTable(
      'User',
      () => oldDb.user.findMany(),
      (user) => newDb.user.create({ data: user })
    );

    // 2. 迁移邀请码
    await migrateTable(
      'InviteCode',
      () => oldDb.inviteCode.findMany(),
      (code) => newDb.inviteCode.create({ data: code })
    );

    // 3. 迁移邀请码使用记录
    await migrateTable(
      'InviteUsage',
      () => oldDb.inviteUsage.findMany(),
      (usage) => newDb.inviteUsage.create({ data: usage })
    );

    // 4. 迁移用户会话
    await migrateTable(
      'UserSession',
      () => oldDb.userSession.findMany(),
      (session) => newDb.userSession.create({ data: session })
    );

    // 5. 迁移用户AI偏好
    await migrateTable(
      'UserAIPreferences',
      () => oldDb.userAIPreferences.findMany(),
      (pref) => newDb.userAIPreferences.create({ data: pref })
    );

    // 6. 迁移小说
    await migrateTable(
      'Novel',
      () => oldDb.novel.findMany(),
      (novel) => newDb.novel.create({ data: novel })
    );

    // 7. 迁移文件
    await migrateTable(
      'File',
      () => oldDb.file.findMany(),
      (file) => newDb.file.create({ data: file })
    );

    // 8. 迁移角色
    await migrateTable(
      'Character',
      () => oldDb.character.findMany(),
      (character) => newDb.character.create({ data: character })
    );

    // 9. 迁移世界设定
    await migrateTable(
      'WorldSetting',
      () => oldDb.worldSetting.findMany(),
      (setting) => newDb.worldSetting.create({ data: setting })
    );

    // 10. 迁移章节
    await migrateTable(
      'Chapter',
      () => oldDb.chapter.findMany(),
      (chapter) => newDb.chapter.create({ data: chapter })
    );

    // 11. 迁移AI约束
    await migrateTable(
      'AIConstraint',
      () => oldDb.aIConstraint.findMany(),
      (constraint) => newDb.aIConstraint.create({ data: constraint })
    );

    // 12. 迁移一致性检查
    await migrateTable(
      'ConsistencyCheck',
      () => oldDb.consistencyCheck.findMany(),
      (check) => newDb.consistencyCheck.create({ data: check })
    );

    // 13. 迁移章节-角色关联
    await migrateTable(
      'ChapterCharacter',
      () => oldDb.chapterCharacter.findMany(),
      (rel) => newDb.chapterCharacter.create({ data: rel })
    );

    // 14. 迁移章节-设定关联
    await migrateTable(
      'ChapterSetting',
      () => oldDb.chapterSetting.findMany(),
      (rel) => newDb.chapterSetting.create({ data: rel })
    );

    // 15. 迁移写作统计
    await migrateTable(
      'NovelStatistics',
      () => oldDb.novelStatistics.findMany(),
      (stat) => newDb.novelStatistics.create({ data: stat })
    );

    // 16. 迁移写作目标
    await migrateTable(
      'WritingGoal',
      () => oldDb.writingGoal.findMany(),
      (goal) => newDb.writingGoal.create({ data: goal })
    );

    // 17. 迁移状态变更历史
    await migrateTable(
      'StatusHistory',
      () => oldDb.statusHistory.findMany(),
      (history) => newDb.statusHistory.create({ data: history })
    );

    // 18. 迁移工作流配置
    await migrateTable(
      'WorkflowConfig',
      () => oldDb.workflowConfig.findMany(),
      (config) => newDb.workflowConfig.create({ data: config })
    );

    // 19. 迁移AI对话会话
    await migrateTable(
      'AIConversation',
      () => oldDb.aIConversation.findMany(),
      (conv) => newDb.aIConversation.create({ data: conv })
    );

    // 20. 迁移AI对话消息
    await migrateTable(
      'AIMessage',
      () => oldDb.aIMessage.findMany(),
      (msg) => newDb.aIMessage.create({ data: msg })
    );

    // 21. 迁移记忆备份
    await migrateTable(
      'MemoryBackup',
      () => oldDb.memoryBackup.findMany(),
      (backup) => newDb.memoryBackup.create({ data: backup })
    );

    // 22. 迁移批量章节生成
    await migrateTable(
      'BatchChapterGeneration',
      () => oldDb.batchChapterGeneration.findMany(),
      (batch) => newDb.batchChapterGeneration.create({ data: batch })
    );

    // 23. 迁移生成的章节
    await migrateTable(
      'GeneratedChapter',
      () => oldDb.generatedChapter.findMany(),
      (chapter) => newDb.generatedChapter.create({ data: chapter })
    );

    // 迁移完成
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 迁移完成！');
    console.log('='.repeat(60));
    console.log(`总耗时: ${duration} 秒`);
    console.log(`成功: ${stats.success} 条记录`);
    console.log(`失败: ${stats.failed} 条记录`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  错误详情:');
      stats.errors.forEach((err, idx) => {
        console.log(`${idx + 1}. [${err.table}] ${err.record}: ${err.error}`);
      });
    }

    // 验证数据
    await verifyMigration();

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    throw error;
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
}

/**
 * 验证迁移结果
 */
async function verifyMigration() {
  console.log('\n📊 验证迁移结果...');

  try {
    const oldCounts = {
      users: await oldDb.user.count(),
      novels: await oldDb.novel.count(),
      characters: await oldDb.character.count(),
      chapters: await oldDb.chapter.count(),
      worldSettings: await oldDb.worldSetting.count(),
    };

    const newCounts = {
      users: await newDb.user.count(),
      novels: await newDb.novel.count(),
      characters: await newDb.character.count(),
      chapters: await newDb.chapter.count(),
      worldSettings: await newDb.worldSetting.count(),
    };

    console.log('\n数据对比:');
    console.log('┌─────────────────┬────────┬────────┬────────┐');
    console.log('│ 表名            │ 源数据 │ 目标   │ 状态   │');
    console.log('├─────────────────┼────────┼────────┼────────┤');

    Object.keys(oldCounts).forEach((key) => {
      const old = oldCounts[key];
      const new_ = newCounts[key];
      const status = old === new_ ? '✓' : '✗';
      console.log(`│ ${key.padEnd(15)} │ ${String(old).padStart(6)} │ ${String(new_).padStart(6)} │   ${status}    │`);
    });

    console.log('└─────────────────┴────────┴────────┴────────┘');

    // 验证关联关系
    const sampleNovel = await newDb.novel.findFirst({
      include: {
        user: true,
        characters: true,
        chapters: true,
        settings: true
      }
    });

    if (sampleNovel) {
      console.log('\n✓ 关联关系验证通过');
      console.log(`  示例小说: ${sampleNovel.title}`);
      console.log(`  作者: ${sampleNovel.user.username}`);
      console.log(`  角色数: ${sampleNovel.characters.length}`);
      console.log(`  章节数: ${sampleNovel.chapters.length}`);
      console.log(`  设定数: ${sampleNovel.settings.length}`);
    }

  } catch (error) {
    console.error('✗ 验证失败:', error.message);
  }
}

// 执行迁移
migrate()
  .then(() => {
    console.log('\n✅ 所有操作完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 迁移过程出错:', error);
    process.exit(1);
  });
