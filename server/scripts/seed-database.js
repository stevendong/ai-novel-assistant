#!/usr/bin/env node

/**
 * 数据库种子数据脚本
 * 清空所有数据并创建测试数据
 * 使用方法: node scripts/seed-database.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  清空数据库...');
  
  // 按依赖关系逆序删除数据
  await prisma.statusHistory.deleteMany({});
  await prisma.consistencyCheck.deleteMany({});
  await prisma.chapterCharacter.deleteMany({});
  await prisma.chapterSetting.deleteMany({});
  await prisma.novelStatistics.deleteMany({});
  await prisma.writingGoal.deleteMany({});
  await prisma.workflowConfig.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.worldSetting.deleteMany({});
  await prisma.aIConstraint.deleteMany({});
  await prisma.novel.deleteMany({});
  
  console.log('✅ 数据库已清空');
}

async function createTestData() {
  console.log('📝 创建测试数据...');
  
  // 创建测试小说
  const novel1 = await prisma.novel.create({
    data: {
      title: '仙剑奇缘传',
      description: '一个关于仙侠世界的故事，讲述了一个普通少年的修仙之路，充满了友情、爱情和成长的历程。',
      genre: 'fantasy',
      rating: 'PG-13',
      status: 'writing',
      wordCount: 85000,
      targetWordCount: 200000,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date()
    }
  });

  const novel2 = await prisma.novel.create({
    data: {
      title: '都市修真录',
      description: '现代都市背景下的修真故事，主角在繁华都市中隐藏身份，修炼古老的功法。',
      genre: 'urban-fantasy',
      rating: 'PG-13',
      status: 'writing',
      wordCount: 45000,
      targetWordCount: 150000,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date()
    }
  });

  const novel3 = await prisma.novel.create({
    data: {
      title: '星际战争编年史',
      description: '未来科幻背景，人类与外星种族的战争史诗。',
      genre: 'sci-fi',
      rating: 'R',
      status: 'draft',
      wordCount: 12000,
      targetWordCount: 300000,
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date()
    }
  });

  console.log('✅ 创建了3部小说');

  // 为仙剑奇缘传创建角色
  const characters = await Promise.all([
    prisma.character.create({
      data: {
        novelId: novel1.id,
        name: '张无忌',
        description: '天赋异禀的修仙天才，性格纯真善良',
        appearance: '身材修长，面容清秀，眼神坚毅',
        personality: '善良正直，重情重义，有时过于天真',
        background: '出身普通农家，偶然获得修仙机缘',
        relationships: JSON.stringify({
          '周芷若': '青梅竹马',
          '赵敏': '红颜知己',
          '张三丰': '师父'
        })
      }
    }),
    prisma.character.create({
      data: {
        novelId: novel1.id,
        name: '周芷若',
        description: '美丽聪慧的女修士，张无忌的青梅竹马',
        appearance: '倾国倾城，气质出尘',
        personality: '聪明伶俐，内心强韧，有时显得冷漠',
        background: '名门世家出身，自幼修炼',
        relationships: JSON.stringify({
          '张无忌': '青梅竹马',
          '灭绝师太': '师父'
        })
      }
    }),
    prisma.character.create({
      data: {
        novelId: novel1.id,
        name: '张三丰',
        description: '武当派创始人，德高望重的修真大能',
        appearance: '仙风道骨，白发白须',
        personality: '慈祥和蔼，智慧深邃，武功高强',
        background: '修真界传奇人物，创立武当一脉',
        relationships: JSON.stringify({
          '张无忌': '师父'
        })
      }
    })
  ]);

  // 为都市修真录创建角色
  await Promise.all([
    prisma.character.create({
      data: {
        novelId: novel2.id,
        name: '林天',
        description: '隐藏在都市中的修真者',
        appearance: '普通上班族外表，实则身怀绝技',
        personality: '低调内敛，深藏不露',
        background: '古老修真世家后裔'
      }
    }),
    prisma.character.create({
      data: {
        novelId: novel2.id,
        name: '苏雨薇',
        description: '都市白领，意外卷入修真世界',
        appearance: '都市丽人，时尚靓丽',
        personality: '聪明独立，适应能力强',
        background: '普通白领，后觉醒特殊体质'
      }
    })
  ]);

  console.log('✅ 创建了角色信息');

  // 创建世界设定
  const worldSettings = await Promise.all([
    prisma.worldSetting.create({
      data: {
        novelId: novel1.id,
        type: 'worldview',
        name: '修真等级体系',
        description: '修真者的境界划分和修炼体系',
        details: JSON.stringify({
          levels: [
            '炼气期', '筑基期', '金丹期', '元婴期', '化神期', '合体期', '大乘期', '渡劫期'
          ],
          description: '每个境界分为初期、中期、后期、大圆满四个小境界',
          advancement: '需要积累灵力和感悟天道'
        })
      }
    }),
    prisma.worldSetting.create({
      data: {
        novelId: novel1.id,
        type: 'location',
        name: '蜀山剑派',
        description: '天下第一剑修门派，位于蜀山之巅',
        details: JSON.stringify({
          location: '四川蜀山',
          established: '三千年前',
          specialties: ['剑法', '剑意', '御剑术'],
          famous_disciples: ['剑圣', '剑仙']
        })
      }
    }),
    prisma.worldSetting.create({
      data: {
        novelId: novel1.id,
        type: 'rule',
        name: '天劫规则',
        description: '修真者突破大境界时必须面对的天道考验',
        details: JSON.stringify({
          trigger_condition: '从金丹期开始，每次大境界突破',
          types: ['雷劫', '心魔劫', '风火劫'],
          consequences: '成功则境界突破，失败则灰飞烟灭'
        })
      }
    }),
    prisma.worldSetting.create({
      data: {
        novelId: novel2.id,
        type: 'worldview',
        name: '现代修真体系',
        description: '隐藏在现代社会中的修真体系',
        details: JSON.stringify({
          concealment: '使用现代科技掩饰修真活动',
          organizations: ['修真者协会', '异能管理局'],
          resources: '灵石伪装成宝石，符箓制成护身符'
        })
      }
    })
  ]);

  console.log('✅ 创建了世界设定');

  // 创建章节
  const chapters = [];
  
  // 为仙剑奇缘传创建章节
  for (let i = 1; i <= 8; i++) {
    const chapterData = getChapterData(novel1.id, i);
    const chapter = await prisma.chapter.create({
      data: chapterData
    });
    chapters.push(chapter);
  }

  // 为都市修真录创建章节
  for (let i = 1; i <= 5; i++) {
    const chapterData = getUrbanChapterData(novel2.id, i);
    const chapter = await prisma.chapter.create({
      data: chapterData
    });
    chapters.push(chapter);
  }

  console.log('✅ 创建了章节信息');

  // 创建章节-角色关联
  await prisma.chapterCharacter.createMany({
    data: [
      { chapterId: chapters[0].id, characterId: characters[0].id, role: 'main' },
      { chapterId: chapters[0].id, characterId: characters[1].id, role: 'supporting' },
      { chapterId: chapters[1].id, characterId: characters[0].id, role: 'main' },
      { chapterId: chapters[1].id, characterId: characters[2].id, role: 'supporting' },
      { chapterId: chapters[2].id, characterId: characters[0].id, role: 'main' },
      { chapterId: chapters[2].id, characterId: characters[1].id, role: 'main' },
      { chapterId: chapters[3].id, characterId: characters[0].id, role: 'main' },
      { chapterId: chapters[3].id, characterId: characters[2].id, role: 'main' }
    ]
  });

  // 创建章节-设定关联
  await prisma.chapterSetting.createMany({
    data: [
      { chapterId: chapters[0].id, settingId: worldSettings[0].id, usage: '介绍修真等级' },
      { chapterId: chapters[1].id, settingId: worldSettings[1].id, usage: '场景描述' },
      { chapterId: chapters[2].id, settingId: worldSettings[0].id, usage: '境界突破' },
      { chapterId: chapters[3].id, settingId: worldSettings[2].id, usage: '天劫描述' }
    ]
  });

  console.log('✅ 创建了关联关系');

  // 创建AI约束
  await Promise.all([
    prisma.aIConstraint.create({
      data: {
        novelId: novel1.id,
        rating: 'PG-13',
        violence: 3,
        romance: 2,
        language: 1,
        customRules: JSON.stringify({
          forbidden_content: ['过度血腥', '不健康价值观'],
          preferred_style: '古典文雅',
          character_consistency: true
        })
      }
    }),
    prisma.aIConstraint.create({
      data: {
        novelId: novel2.id,
        rating: 'PG-13',
        violence: 2,
        romance: 3,
        language: 2,
        customRules: JSON.stringify({
          modern_elements: true,
          tech_integration: true
        })
      }
    })
  ]);

  // 创建一致性检查记录
  await prisma.consistencyCheck.createMany({
    data: [
      {
        chapterId: chapters[2].id,
        type: 'character',
        issue: '张无忌的性格在这章显得过于冲动，与之前的谨慎形象不符',
        severity: 'medium',
        resolved: false
      },
      {
        chapterId: chapters[3].id,
        type: 'timeline',
        issue: '修炼时间与实际年龄不匹配',
        severity: 'high',
        resolved: false
      },
      {
        chapterId: chapters[1].id,
        type: 'setting',
        issue: '蜀山剑派的地理位置描述前后不一致',
        severity: 'medium',
        resolved: true
      },
      {
        chapterId: chapters[4].id,
        type: 'logic',
        issue: '武功修为的提升速度过快，缺乏合理解释',
        severity: 'low',
        resolved: false
      }
    ]
  });

  console.log('✅ 创建了一致性检查记录');

  // 创建写作统计
  const now = new Date();
  const statisticsData = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    statisticsData.push({
      novelId: novel1.id,
      date: date,
      wordCount: Math.floor(Math.random() * 2000) + 500,
      timeSpent: Math.floor(Math.random() * 180) + 30
    });
  }

  for (let i = 0; i < 20; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    statisticsData.push({
      novelId: novel2.id,
      date: date,
      wordCount: Math.floor(Math.random() * 1500) + 300,
      timeSpent: Math.floor(Math.random() * 120) + 20
    });
  }

  await prisma.novelStatistics.createMany({
    data: statisticsData
  });

  console.log('✅ 创建了写作统计');

  // 创建写作目标
  await prisma.writingGoal.createMany({
    data: [
      {
        novelId: novel1.id,
        type: 'daily',
        target: 1000,
        period: '2024-03',
        achieved: 850
      },
      {
        novelId: novel1.id,
        type: 'weekly',
        target: 7000,
        period: '2024-W12',
        achieved: 6200
      },
      {
        novelId: novel1.id,
        type: 'monthly',
        target: 30000,
        period: '2024-03',
        achieved: 25000
      },
      {
        novelId: novel2.id,
        type: 'daily',
        target: 800,
        period: '2024-03',
        achieved: 720
      }
    ]
  });

  console.log('✅ 创建了写作目标');

  // 创建工作流配置
  await prisma.workflowConfig.createMany({
    data: [
      {
        novelId: novel1.id,
        entityType: 'chapter',
        transitions: JSON.stringify({
          planning: ['writing'],
          writing: ['reviewing', 'planning'],
          reviewing: ['completed', 'writing'],
          completed: ['reviewing']
        }),
        isActive: true
      },
      {
        novelId: novel1.id,
        entityType: 'novel',
        transitions: JSON.stringify({
          draft: ['writing'],
          writing: ['completed'],
          completed: ['writing']
        }),
        isActive: true
      }
    ]
  });

  // 创建状态历史记录
  await prisma.statusHistory.createMany({
    data: [
      {
        entityType: 'chapter',
        entityId: chapters[0].id,
        fromStatus: 'planning',
        toStatus: 'writing',
        triggeredBy: 'user',
        reason: '开始写作第一章'
      },
      {
        entityType: 'chapter',
        entityId: chapters[0].id,
        fromStatus: 'writing',
        toStatus: 'completed',
        triggeredBy: 'user',
        reason: '第一章写作完成'
      },
      {
        entityType: 'novel',
        entityId: novel1.id,
        fromStatus: 'draft',
        toStatus: 'writing',
        triggeredBy: 'system',
        reason: '第一章完成，小说进入写作状态'
      }
    ]
  });

  console.log('✅ 创建了工作流和历史记录');
  console.log('🎉 测试数据创建完成！');
}

function getChapterData(novelId, chapterNumber) {
  const chapterTitles = [
    '初入修真界',
    '师父张三丰',
    '蜀山论剑',
    '天劫降临',
    '情缘初现',
    '生死之战',
    '境界突破',
    '归隐山林'
  ];

  const chapterContents = [
    `张无忌自小在农村长大，过着平凡的生活。这一天，他如往常一样上山砍柴，却意外在山洞中发现了一本古籍。

古籍散发着淡淡的金光，封面写着"九阳神功"四个大字。张无忌好奇地翻开第一页，只见上面密密麻麻写满了修炼口诀。

"天地之间，阴阳二气，九阳归一，可得长生..."

张无忌仔细阅读着，不知不觉中按照口诀运转体内气息。突然，一股暖流从丹田升起，流遍全身。他惊讶地发现，自己的力气仿佛变大了许多。

就在这时，洞外传来脚步声。张无忌连忙收起古籍，走出山洞。只见一位白发老者站在洞口，正含笑看着他。

"小友，你与我武当有缘啊。"老者捋着胡须说道。

这位老者正是武当派掌门张三丰。他早已感应到山洞中的异象，特地前来查看。见张无忌天赋异禀，能够自悟修炼之法，不禁心生爱才之意。`,

    `"晚辈张无忌，见过张真人。"张无忌恭恭敬敬地行了一礼。

张三丰点了点头，眼中露出满意之色："你既得了九阳神功，说明与我武当有缘。不过这门功法博大精深，单凭你一人之力，恐怕难以完全领悟。"

"请张真人指点。"张无忌虚心求教。

张三丰伸出一指，轻点在张无忌的眉心。顿时，一股清凉的气息涌入脑海，无数修炼心得如醍醐灌顶般涌现。

"这是我武当的基础修炼法门，你先练好这些，再修炼九阳神功，事半功倍。"

张无忌感激不尽："多谢师父栽培！"

从这一天起，张无忌正式拜入武当门下，开始了他的修真之路。每日清晨，他都会在武当山上练功，体内的真气日渐浑厚。

三个月后，张无忌已经突破到了炼气期后期，这种修炼速度就连张三丰也感到惊讶。

"无忌，你的天赋确实不凡。明日蜀山剑派会举办论剑大会，你也去见识见识吧。"`,

    `蜀山剑派位于四川境内，乃是天下第一剑修门派。这次论剑大会，各派高手云集，场面十分壮观。

张无忌跟随张三丰来到蜀山，只见山峰入云，剑气冲霄。山门前已经聚集了数百名修真者，个个气息不凡。

"武当张三丰携弟子张无忌，前来参加论剑大会！"

随着张三丰的话音落下，全场顿时安静下来。张三丰的威名天下皆知，就连蜀山掌门也要亲自出迎。

"张真人大驾光临，蜀山蓬荜生辉啊！"蜀山掌门李逍遥拱手相迎。

论剑大会正式开始，各派弟子轮番上台切磋。张无忌作为新晋弟子，也被安排上场比试。

他的对手是峨眉派的女弟子周芷若。这位师姐容貌绝美，剑法更是精妙无比。

"请多指教。"周芷若淡淡一笑，手中长剑泛起寒光。

张无忌不敢大意，运转九阳神功，双掌带着炙热的内力迎向周芷若的剑招...`,

    `比试进行得十分激烈。周芷若的剑法如行云流水，每一剑都刁钻无比。而张无忌则以九阳神功的雄浑内力硬撼，两人你来我往，难分胜负。

就在比试进入白热化时，天空突然乌云密布，雷声阵阵。

"这是...天劫！"有人惊呼。

众人抬头望去，只见天空中聚集着厚厚的劫云，其中雷光闪烁，威势惊人。

"有人要突破大境界了！"张三丰眉头紧皱，"这劫云的规模，至少是金丹期的天劫！"

就在这时，一道身影从蜀山深处飞出，正是蜀山太上长老。只见他面色凝重，显然就是这次天劫的主角。

"诸位道友，老夫要渡劫了，请大家暂避！"太上长老的声音传遍全场。

众人纷纷后退，给太上长老留出渡劫的空间。张无忌第一次见到天劫，心中既紧张又兴奋。

轰隆！

第一道雷劫降下，粗如水桶的雷电直击太上长老。他运转全身功力抵抗，虽然挡住了这一击，但也受了不轻的伤。

"还有八道雷劫，太上长老能撑得住吗？"众人心中都在为他担心。`,

    `天劫持续了整整一个时辰。太上长老凭借深厚的修为和坚强的意志，硬生生抗下了九道雷劫，成功突破到元婴期。

这一幕深深震撼了张无忌。他暗暗发誓，总有一天也要拥有如此强大的力量。

论剑大会在天劫的插曲中继续进行。张无忌与周芷若的比试也重新开始。

经过刚才天劫的洗礼，两人都有所感悟。张无忌的九阳神功运转更加纯熟，而周芷若的剑意也更加凝练。

最终，这场比试以平局告终。但两人都对对方留下了深刻印象。

"张师弟的功力深厚，芷若佩服。"周芷若收剑入鞘，眼中闪过一丝异样的神色。

"周师姐剑法精妙，在下也是受益匪浅。"张无忌回礼道。

就这样，两人的缘分开始了。在之后的交流中，他们发现彼此都有着相似的经历和理想，渐渐产生了好感。

论剑大会结束后，张无忌回到武当，心中却时常想起周芷若的身影。师父张三丰看出了他的心思，只是微微一笑，并未多说什么。`,

    `修真界并非总是平静的。一个月后，邪教魔门突然大举入侵，各正道门派都受到了冲击。

张无忌正在山上修炼，突然感受到山下传来激烈的打斗声。他连忙赶去查看，只见数十名黑衣人正在围攻武当弟子。

"大胆魔徒，胆敢在武当撒野！"张无忌大喝一声，运转九阳神功冲入战圈。

这些魔教徒个个功力不俗，而且配合默契。武当弟子虽然人数不少，但一时间竟然处于下风。

张无忌以一敌三，九阳神功的威力在实战中展现得淋漓尽致。他的双掌带着炙热的内力，每一击都让魔教徒难以招架。

就在战斗最激烈时，突然传来一个熟悉的惊呼声："张师弟，小心！"

张无忌回头一看，竟然是周芷若！她正被两名魔教高手围攻，情况危急。

来不及多想，张无忌立即冲过去营救。但就在这时，身后传来破空声，一名魔教徒趁机偷袭。

千钧一发之际，张三丰的身影突然出现，一掌击退偷袭者。

"无忌，护法要紧，不可分心！"师父的话让张无忌冷静下来。

最终，在各派高手的联手下，魔教徒被击退。但这次战斗也让张无忌意识到，自己的修为还远远不够。`,

    `经历了生死之战，张无忌深深体会到了力量的重要性。他开始更加刻苦地修炼，日夜不休。

三个月后，张无忌终于感受到了突破的契机。体内的真气开始剧烈翻涌，丹田中仿佛有什么东西要破茧而出。

"要突破筑基期了！"张无忌兴奋不已。

他找了一个安静的山洞，开始全力冲击更高的境界。九阳神功在体内运转，每一个周天都比之前更加顺畅。

突然，一声轻响从丹田传来，仿佛什么东西破碎了。紧接着，一股前所未有的力量涌遍全身。

筑基成功！

张无忌睁开双眼，发现自己的感知能力大大增强，方圆百里的情况都能隐约感应到。这就是筑基期修真者的能力。

就在他准备出关时，洞外传来周芷若的声音："张师弟，你在里面吗？"

张无忌连忙出洞相迎："芷若师姐，你怎么来了？"

"我感应到这里有突破的气息，特地来看看。"周芷若笑道，"恭喜你突破筑基期。"

两人一起走出山洞，夕阳西下，把他们的身影拉得很长。在这美好的黄昏时光中，他们的感情也在悄悄升温。

张无忌突然鼓起勇气："芷若，我..."

"我知道你要说什么。"周芷若脸红如霞，"我也一样。"

就这样，两人确定了彼此的心意。`,

    `岁月如流，转眼间张无忌已经在修真界闯荡了十年。他的修为达到了金丹期，成为了武当的顶梁柱。

但是，随着修为的提高，张无忌却感到了前所未有的迷茫。修真的终极目的是什么？长生不老，然后呢？

这一天，他独自来到武当后山，看着远方的青山绿水，陷入了沉思。

"师父，您说修真是为了什么？"张无忌问张三丰。

张三丰笑了笑："修真修的是心，练的是性。外在的力量只是表象，真正重要的是内心的平静与智慧。"

"那如果有一天我厌倦了争斗，想要归隐山林呢？"

"那就归隐吧。"张三丰的回答很简单，"道在于自然，顺其自然便是道。"

张无忌若有所悟。也许，真正的修真不在于追求更高的境界，而在于找到内心的平静。

三个月后，张无忌做出了一个决定。他要和周芷若一起，远离纷争，在山中隐居。

"你真的决定了？"周芷若问道。

"嗯，我想过真正平静的生活。"张无忌握住她的手，"愿意和我一起吗？"

"当然愿意。"周芷若笑得很甜美。

就这样，两人告别了师门，在深山中建起了一座小屋，过起了神仙般的日子。他们种花养草，练功悟道，远离世俗的纷扰。

也许这才是修真的真正意义——不是为了获得强大的力量，而是为了找到内心的宁静与快乐。`
  ];

  const status = ['completed', 'completed', 'completed', 'writing', 'writing', 'reviewing', 'planning', 'planning'];
  const progress = [100, 100, 100, 75, 60, 90, 30, 10];

  return {
    novelId: novelId,
    chapterNumber: chapterNumber,
    title: `第${chapterNumber}章 ${chapterTitles[chapterNumber - 1]}`,
    outline: `第${chapterNumber}章的大纲：${chapterTitles[chapterNumber - 1]}的详细情节安排`,
    content: chapterContents[chapterNumber - 1] || `第${chapterNumber}章的内容正在创作中...`,
    plotPoints: JSON.stringify([
      { type: 'opening', description: '章节开场' },
      { type: 'development', description: '情节发展' },
      { type: 'climax', description: '高潮部分' },
      { type: 'ending', description: '章节结尾' }
    ]),
    status: status[chapterNumber - 1],
    wordCount: Math.floor(Math.random() * 3000) + 2000,
    progress: progress[chapterNumber - 1],
    createdAt: new Date(Date.now() - (8 - chapterNumber) * 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  };
}

function getUrbanChapterData(novelId, chapterNumber) {
  const chapterTitles = [
    '都市中的秘密',
    '觉醒的力量',
    '隐藏的世界',
    '第一次任务',
    '真相初现'
  ];

  const status = ['completed', 'completed', 'writing', 'planning', 'planning'];
  const progress = [100, 100, 45, 20, 5];

  return {
    novelId: novelId,
    chapterNumber: chapterNumber,
    title: `第${chapterNumber}章 ${chapterTitles[chapterNumber - 1]}`,
    outline: `第${chapterNumber}章大纲：${chapterTitles[chapterNumber - 1]}`,
    content: chapterNumber <= 2 ? `第${chapterNumber}章的完整内容...` : `第${chapterNumber}章内容创作中...`,
    plotPoints: JSON.stringify([
      { type: 'setup', description: '情节设置' },
      { type: 'conflict', description: '冲突展开' },
      { type: 'resolution', description: '问题解决' }
    ]),
    status: status[chapterNumber - 1],
    wordCount: chapterNumber <= 2 ? Math.floor(Math.random() * 2500) + 1500 : Math.floor(Math.random() * 1000) + 500,
    progress: progress[chapterNumber - 1],
    createdAt: new Date(Date.now() - (5 - chapterNumber) * 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
  };
}

async function main() {
  try {
    await clearDatabase();
    await createTestData();
    console.log('\n🎯 数据库种子数据创建成功！');
    console.log('\n📊 创建的数据统计：');
    console.log(`- 小说: 3部`);
    console.log(`- 角色: 5个`);
    console.log(`- 世界设定: 4项`);
    console.log(`- 章节: 13章`);
    console.log(`- 一致性检查: 4条记录`);
    console.log(`- 写作统计: 50天数据`);
    console.log(`- 写作目标: 4个目标`);
    console.log('\n现在可以启动应用程序查看测试数据了！');
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, clearDatabase, createTestData };