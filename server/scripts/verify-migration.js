/**
 * 验证数据库迁移结果
 *
 * 使用方法：
 * node scripts/verify-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('='.repeat(60));
  console.log('🔍 验证数据库迁移结果');
  console.log('='.repeat(60));
  console.log(`数据库: ${process.env.DATABASE_URL}`);
  console.log('');

  try {
    await prisma.$connect();
    console.log('✓ 数据库连接成功\n');

    // 1. 统计所有表的记录数
    console.log('📊 数据统计:');
    console.log('─'.repeat(60));

    const counts = {
      '用户': await prisma.user.count(),
      '小说': await prisma.novel.count(),
      '角色': await prisma.character.count(),
      '世界设定': await prisma.worldSetting.count(),
      '章节': await prisma.chapter.count(),
      'AI约束': await prisma.aIConstraint.count(),
      '一致性检查': await prisma.consistencyCheck.count(),
      '章节-角色关联': await prisma.chapterCharacter.count(),
      '章节-设定关联': await prisma.chapterSetting.count(),
      '写作统计': await prisma.novelStatistics.count(),
      '写作目标': await prisma.writingGoal.count(),
      '状态历史': await prisma.statusHistory.count(),
      '工作流配置': await prisma.workflowConfig.count(),
      '用户会话': await prisma.userSession.count(),
      'AI对话会话': await prisma.aIConversation.count(),
      'AI消息': await prisma.aIMessage.count(),
      '邀请码': await prisma.inviteCode.count(),
      '邀请使用记录': await prisma.inviteUsage.count(),
      '记忆备份': await prisma.memoryBackup.count(),
      '批量生成': await prisma.batchChapterGeneration.count(),
      '生成章节': await prisma.generatedChapter.count(),
      '用户AI偏好': await prisma.userAIPreferences.count(),
      '文件': await prisma.file.count(),
    };

    Object.entries(counts).forEach(([name, count]) => {
      console.log(`${name.padEnd(20)}: ${count.toString().padStart(6)}`);
    });

    // 2. 验证关联关系
    console.log('\n🔗 验证关联关系:');
    console.log('─'.repeat(60));

    // 检查用户-小说关联
    const userWithNovels = await prisma.user.findFirst({
      include: {
        novels: true
      }
    });

    if (userWithNovels && userWithNovels.novels.length > 0) {
      console.log('✓ 用户-小说关联正常');
    } else {
      console.log('⚠️  未找到用户-小说关联数据');
    }

    // 检查小说-角色关联
    const novelWithCharacters = await prisma.novel.findFirst({
      include: {
        characters: true
      }
    });

    if (novelWithCharacters && novelWithCharacters.characters.length > 0) {
      console.log('✓ 小说-角色关联正常');
    } else {
      console.log('⚠️  未找到小说-角色关联数据');
    }

    // 检查小说-章节关联
    const novelWithChapters = await prisma.novel.findFirst({
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        }
      }
    });

    if (novelWithChapters && novelWithChapters.chapters.length > 0) {
      console.log('✓ 小说-章节关联正常');
    } else {
      console.log('⚠️  未找到小说-章节关联数据');
    }

    // 检查章节-角色关联
    const chapterWithRelations = await prisma.chapter.findFirst({
      include: {
        characters: {
          include: {
            character: true
          }
        }
      }
    });

    if (chapterWithRelations && chapterWithRelations.characters.length > 0) {
      console.log('✓ 章节-角色关联正常');
    } else {
      console.log('⚠️  未找到章节-角色关联数据');
    }

    // 3. 数据完整性检查
    console.log('\n🔍 数据完整性检查:');
    console.log('─'.repeat(60));

    // 检查孤立的角色（没有关联小说的角色）
    const orphanedCharacters = await prisma.character.findMany({
      where: {
        novel: null
      }
    });

    if (orphanedCharacters.length === 0) {
      console.log('✓ 无孤立角色');
    } else {
      console.log(`⚠️  发现 ${orphanedCharacters.length} 个孤立角色`);
    }

    // 检查孤立的章节
    const orphanedChapters = await prisma.chapter.findMany({
      where: {
        novel: null
      }
    });

    if (orphanedChapters.length === 0) {
      console.log('✓ 无孤立章节');
    } else {
      console.log(`⚠️  发现 ${orphanedChapters.length} 个孤立章节`);
    }

    // 检查重复的章节号
    const duplicateChapters = await prisma.$queryRaw`
      SELECT "novelId", "chapterNumber", COUNT(*) as count
      FROM "Chapter"
      GROUP BY "novelId", "chapterNumber"
      HAVING COUNT(*) > 1
    `;

    if (duplicateChapters.length === 0) {
      console.log('✓ 无重复章节号');
    } else {
      console.log(`⚠️  发现 ${duplicateChapters.length} 组重复章节号`);
    }

    // 4. 示例数据展示
    console.log('\n📝 示例数据:');
    console.log('─'.repeat(60));

    const sampleNovel = await prisma.novel.findFirst({
      include: {
        user: true,
        characters: {
          take: 3
        },
        chapters: {
          take: 3,
          orderBy: { chapterNumber: 'asc' }
        },
        settings: {
          take: 3
        }
      }
    });

    if (sampleNovel) {
      console.log(`小说标题: ${sampleNovel.title}`);
      console.log(`作者: ${sampleNovel.user.username} (${sampleNovel.user.email})`);
      console.log(`状态: ${sampleNovel.status}`);
      console.log(`字数: ${sampleNovel.wordCount.toLocaleString()}`);
      console.log(`创建时间: ${sampleNovel.createdAt.toISOString()}`);

      if (sampleNovel.characters.length > 0) {
        console.log('\n角色列表:');
        sampleNovel.characters.forEach((char, idx) => {
          console.log(`  ${idx + 1}. ${char.name} - ${char.description || '无描述'}`);
        });
      }

      if (sampleNovel.chapters.length > 0) {
        console.log('\n章节列表:');
        sampleNovel.chapters.forEach((chapter) => {
          console.log(`  第${chapter.chapterNumber}章: ${chapter.title} (${chapter.wordCount}字, ${chapter.status})`);
        });
      }

      if (sampleNovel.settings.length > 0) {
        console.log('\n世界设定:');
        sampleNovel.settings.forEach((setting, idx) => {
          console.log(`  ${idx + 1}. [${setting.type}] ${setting.name}`);
        });
      }
    } else {
      console.log('⚠️  未找到示例数据');
    }

    // 5. 性能测试
    console.log('\n⚡ 性能测试:');
    console.log('─'.repeat(60));

    const perfTests = [
      {
        name: '查询用户列表',
        fn: () => prisma.user.findMany({ take: 100 })
      },
      {
        name: '查询小说列表（含关联）',
        fn: () => prisma.novel.findMany({
          take: 50,
          include: {
            user: true,
            _count: {
              select: {
                characters: true,
                chapters: true
              }
            }
          }
        })
      },
      {
        name: '查询章节详情（含关联）',
        fn: () => prisma.chapter.findFirst({
          include: {
            novel: true,
            characters: {
              include: {
                character: true
              }
            },
            settings: {
              include: {
                setting: true
              }
            }
          }
        })
      }
    ];

    for (const test of perfTests) {
      const start = Date.now();
      await test.fn();
      const duration = Date.now() - start;
      console.log(`${test.name}: ${duration}ms`);
    }

    // 6. 最终结论
    console.log('\n' + '='.repeat(60));
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`✅ 验证完成！共 ${totalRecords.toLocaleString()} 条记录`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 验证失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行验证
verify()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证过程出错:', error);
    process.exit(1);
  });
