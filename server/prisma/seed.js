const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始创建测试数据...');

  // 清理现有数据 - 小心地处理可能不存在的表
  try {
    await prisma.novelStatistics.deleteMany({});
  } catch (e) { console.log('NovelStatistics table might not exist yet') }
  
  try {
    await prisma.writingGoal.deleteMany({});
  } catch (e) { console.log('WritingGoal table might not exist yet') }
  
  await prisma.chapterCharacter.deleteMany({});
  await prisma.chapterSetting.deleteMany({});
  await prisma.consistencyCheck.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.worldSetting.deleteMany({});
  await prisma.aiConstraint.deleteMany({});
  await prisma.novel.deleteMany({});

  // 创建小说项目
  const novel1 = await prisma.novel.create({
    data: {
      title: '神秘森林的传说',
      description: '一个关于魔法森林中冒险的奇幻故事，主角是一位年轻的法师学徒，在寻找失踪师父的过程中，揭开了森林深处隐藏的古老秘密。',
      genre: '奇幻',
      rating: 'PG-13',
      status: 'writing',
      wordCount: 85600,
      targetWordCount: 200000,
      aiSettings: {
        create: {
          rating: 'PG-13',
          violence: 3,
          romance: 2,
          language: 1,
          customRules: JSON.stringify([
            '避免过度暴力描写',
            '保持魔法体系的一致性',
            '角色发展要符合逻辑'
          ])
        }
      }
    }
  });

  const novel2 = await prisma.novel.create({
    data: {
      title: '星际漂流者',
      description: '科幻背景下的太空探险故事，讲述一群太空探险家在未知星域中的生存与探索之旅。',
      genre: '科幻',
      rating: 'PG-13',
      status: 'completed',
      wordCount: 156000,
      targetWordCount: 150000,
      aiSettings: {
        create: {
          rating: 'PG-13',
          violence: 4,
          romance: 1,
          language: 2
        }
      }
    }
  });

  const novel3 = await prisma.novel.create({
    data: {
      title: '都市夜行者',
      description: '现代都市中的悬疑推理小说，私人侦探追查连环案件的故事。',
      genre: '悬疑',
      rating: 'R',
      status: 'draft',
      wordCount: 12000,
      targetWordCount: 180000,
      aiSettings: {
        create: {
          rating: 'R',
          violence: 6,
          romance: 3,
          language: 4
        }
      }
    }
  });

  // 为第一个小说创建角色
  const characters = await Promise.all([
    prisma.character.create({
      data: {
        novelId: novel1.id,
        name: '艾莉亚·月影',
        description: '年轻的法师学徒，主人公',
        appearance: '银色长发，碧绿色眼睛，身材娇小但意志坚定',
        personality: '聪明好学，有些冲动，对魔法有强烈的好奇心',
        background: '出生在边境小镇，自幼展现出魔法天赋，被师父收为徒弟',
        relationships: JSON.stringify({
          '师父': '埃德温大法师 - 失踪的导师',
          '朋友': '托林 - 森林守护者',
          '敌人': '暗影教团'
        })
      }
    }),
    prisma.character.create({
      data: {
        novelId: novel1.id,
        name: '托林·绿叶',
        description: '森林守护者，艾莉亚的盟友',
        appearance: '高大魁梧，有着古铜色皮肤和深绿色眼睛',
        personality: '沉稳可靠，对自然有深深的敬畏',
        background: '森林中的古老种族后裔，世代守护着森林的秘密',
        relationships: JSON.stringify({
          '朋友': '艾莉亚 - 法师学徒',
          '守护': '神秘森林'
        })
      }
    })
  ]);

  // 创建世界设定
  const settings = await Promise.all([
    prisma.worldSetting.create({
      data: {
        novelId: novel1.id,
        type: 'location',
        name: '神秘森林',
        description: '古老而神秘的魔法森林，充满了未知的危险和奇迹',
        details: JSON.stringify({
          '地理': '面积广阔，深处人迹罕至',
          '魔法': '森林本身蕴含强大的魔法能量',
          '生物': '各种神奇的魔法生物栖息地',
          '历史': '传说中古代法师的试验场'
        })
      }
    }),
    prisma.worldSetting.create({
      data: {
        novelId: novel1.id,
        type: 'rule',
        name: '魔法体系',
        description: '世界中魔法运作的基本规则',
        details: JSON.stringify({
          '元素': '火、水、土、气、光、暗六大元素',
          '法术等级': '初级、中级、高级、大师级',
          '魔法源泉': '需要从自然或魔法物品中汲取能量',
          '限制': '过度使用会导致魔法透支'
        })
      }
    })
  ]);

  // 创建章节
  const chapters = await Promise.all([
    prisma.chapter.create({
      data: {
        novelId: novel1.id,
        chapterNumber: 1,
        title: '第一章：神秘的开始',
        outline: '艾莉亚发现师父失踪，开始寻找线索的故事开端',
        content: '晨光透过窗棂洒进小屋，艾莉亚醒来发现师父埃德温已经不见踪影...',
        plotPoints: JSON.stringify([
          '艾莉亚醒来发现师父失踪',
          '在师父的房间发现神秘符文',
          '决定前往森林寻找师父'
        ]),
        status: 'completed',
        wordCount: 4200,
        progress: 100
      }
    }),
    prisma.chapter.create({
      data: {
        novelId: novel1.id,
        chapterNumber: 2,
        title: '第二章：初次遭遇',
        outline: '艾莉亚进入森林，遇到托林，了解森林的危险',
        content: '森林比艾莉亚想象的更加神秘和危险...',
        plotPoints: JSON.stringify([
          '艾莉亚进入神秘森林',
          '遭遇魔法生物的攻击',
          '被托林救下并结为盟友'
        ]),
        status: 'completed',
        wordCount: 3800,
        progress: 100
      }
    }),
    prisma.chapter.create({
      data: {
        novelId: novel1.id,
        chapterNumber: 3,
        title: '第三章：隐藏的真相',
        outline: '发现师父失踪与古老秘密有关',
        content: '在托林的帮助下，艾莉亚逐渐揭开了师父失踪背后的真相...',
        plotPoints: JSON.stringify([
          '在古老遗迹中发现线索',
          '了解到暗影教团的存在',
          '师父可能是被绑架的'
        ]),
        status: 'writing',
        wordCount: 2100,
        progress: 65
      }
    }),
    prisma.chapter.create({
      data: {
        novelId: novel1.id,
        chapterNumber: 4,
        title: '第四章：意外的盟友',
        outline: '遇到新的伙伴，准备深入调查',
        status: 'planning',
        wordCount: 0,
        progress: 0
      }
    })
  ]);

  // 创建章节-角色关联
  await Promise.all([
    prisma.chapterCharacter.create({
      data: {
        chapterId: chapters[0].id,
        characterId: characters[0].id,
        role: 'main'
      }
    }),
    prisma.chapterCharacter.create({
      data: {
        chapterId: chapters[1].id,
        characterId: characters[0].id,
        role: 'main'
      }
    }),
    prisma.chapterCharacter.create({
      data: {
        chapterId: chapters[1].id,
        characterId: characters[1].id,
        role: 'supporting'
      }
    })
  ]);

  // 创建章节-设定关联
  await Promise.all([
    prisma.chapterSetting.create({
      data: {
        chapterId: chapters[1].id,
        settingId: settings[0].id,
        usage: '故事发生的主要场景'
      }
    }),
    prisma.chapterSetting.create({
      data: {
        chapterId: chapters[2].id,
        settingId: settings[1].id,
        usage: '魔法战斗场面'
      }
    })
  ]);

  // 创建写作统计数据
  const today = new Date();
  const statisticsData = [];
  
  // 生成过去30天的统计数据
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const wordCount = Math.floor(Math.random() * 2000) + 500; // 500-2500字
    const timeSpent = Math.floor(Math.random() * 180) + 60; // 60-240分钟
    
    statisticsData.push({
      novelId: novel1.id,
      date: date,
      wordCount: wordCount,
      timeSpent: timeSpent
    });
  }

  await prisma.novelStatistics.createMany({
    data: statisticsData
  });

  // 创建写作目标
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const currentWeek = getWeekNumber(currentDate);

  await Promise.all([
    prisma.writingGoal.create({
      data: {
        novelId: novel1.id,
        type: 'daily',
        target: 1000,
        period: currentDate.toISOString().split('T')[0],
        achieved: 1200
      }
    }),
    prisma.writingGoal.create({
      data: {
        novelId: novel1.id,
        type: 'weekly',
        target: 7000,
        period: `${currentYear}-W${currentWeek}`,
        achieved: 8500
      }
    }),
    prisma.writingGoal.create({
      data: {
        novelId: novel1.id,
        type: 'monthly',
        target: 30000,
        period: `${currentYear}-${currentMonth}`,
        achieved: 25600
      }
    })
  ]);

  // 为其他小说创建基本章节
  await prisma.chapter.createMany({
    data: [
      {
        novelId: novel2.id,
        chapterNumber: 1,
        title: '第一章：太空启航',
        status: 'completed',
        wordCount: 5200,
        progress: 100
      },
      {
        novelId: novel2.id,
        chapterNumber: 2,
        title: '第二章：未知星域',
        status: 'completed',
        wordCount: 4800,
        progress: 100
      },
      {
        novelId: novel3.id,
        chapterNumber: 1,
        title: '第一章：夜幕降临',
        status: 'writing',
        wordCount: 2400,
        progress: 30
      }
    ]
  });

  console.log('测试数据创建完成！');
  console.log(`创建了 ${await prisma.novel.count()} 个小说项目`);
  console.log(`创建了 ${await prisma.character.count()} 个角色`);
  console.log(`创建了 ${await prisma.chapter.count()} 个章节`);
  console.log(`创建了 ${await prisma.novelStatistics.count()} 条统计记录`);
}

// 获取周数的辅助函数
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

main()
  .catch((e) => {
    console.error('创建测试数据时出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });