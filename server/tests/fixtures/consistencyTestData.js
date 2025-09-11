// 测试数据工厂

const createMockNovel = (overrides = {}) => ({
  id: 'novel-1',
  title: '测试小说',
  description: '这是一个测试小说',
  genre: 'fantasy',
  rating: 'PG',
  status: 'writing',
  wordCount: 10000,
  targetWordCount: 50000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const createMockCharacter = (overrides = {}) => ({
  id: 'char-1',
  novelId: 'novel-1',
  name: '张三',
  description: '勇敢的主角',
  appearance: '高大威猛',
  personality: '勇敢、正直、有时冲动',
  background: '武林世家出身，自幼习武',
  relationships: JSON.stringify({
    '李四': '好友',
    '王五': '师父'
  }),
  isLocked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const createMockWorldSetting = (overrides = {}) => ({
  id: 'setting-1',
  novelId: 'novel-1',
  type: 'location',
  name: '京城',
  description: '繁华的古代都城',
  details: JSON.stringify({
    population: '百万人',
    climate: '温带大陆性气候',
    landmarks: ['皇宫', '天坛', '长城']
  }),
  isLocked: false,
  ...overrides
});

const createMockChapter = (overrides = {}) => ({
  id: 'chapter-1',
  novelId: 'novel-1',
  chapterNumber: 2,
  title: '第二章：初入江湖',
  outline: '张三离开家乡，初次踏入江湖...',
  content: `张三背着行囊，踏出了家门。这是他第一次离开生活了十八年的小村庄。

阳光透过树叶洒在山道上，鸟儿在枝头欢快地歌唱。张三深深地吸了一口新鲜的空气，心中充满了对未来的憧憬。

"江湖，我张三来了！"他在心中默念着，脚步越发坚定。

不远处，一阵马蹄声传来...`,
  plotPoints: JSON.stringify([
    { type: 'action', description: '张三离开家乡' },
    { type: 'emotion', description: '对未来的憧憬' },
    { type: 'discovery', description: '遇到陌生人' }
  ]),
  illustrations: JSON.stringify([]),
  status: 'writing',
  wordCount: 150,
  progress: 0.6,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const createMockConsistencyCheck = (overrides = {}) => ({
  id: 'issue-1',
  chapterId: 'chapter-1',
  type: 'character',
  issue: '张三在此章节中表现出胆怯的性格，与之前章节中勇敢的设定不符',
  severity: 'high',
  resolved: false,
  createdAt: new Date().toISOString(),
  ...overrides
});

// 创建完整的章节数据，包含关联关系
const createMockChapterWithRelations = (chapterOverrides = {}, relations = {}) => {
  const chapter = createMockChapter(chapterOverrides);
  
  return {
    ...chapter,
    novel: relations.novel || {
      ...createMockNovel(),
      characters: relations.characters || [createMockCharacter()],
      settings: relations.settings || [createMockWorldSetting()]
    },
    characters: relations.chapterCharacters || [
      {
        characterId: 'char-1',
        character: createMockCharacter(),
        role: 'main'
      }
    ],
    settings: relations.chapterSettings || [
      {
        settingId: 'setting-1',
        setting: createMockWorldSetting(),
        usage: '故事发生的主要地点'
      }
    ],
    consistencyLog: relations.consistencyLog || [
      createMockConsistencyCheck()
    ]
  };
};

// AI 响应数据
const createMockAIResponse = (overrides = {}) => ({
  hasIssues: true,
  description: '发现一致性问题：角色行为与设定不符',
  severity: 'medium',
  relatedContent: '相关文本片段',
  relatedChapters: ['chapter-0'],
  logicChain: '逻辑分析链条',
  ...overrides
});

// 创建一致性检查结果统计
const createMockConsistencyStats = (overrides = {}) => ({
  totalIssues: 5,
  highSeverity: 1,
  mediumSeverity: 2,
  lowSeverity: 2,
  resolvedIssues: 1,
  unresolvedIssues: 4,
  typeDistribution: {
    character: 2,
    setting: 1,
    timeline: 1,
    logic: 1
  },
  ...overrides
});

// 测试场景数据
const testScenarios = {
  // 场景1: 角色性格不一致
  characterInconsistency: {
    chapter: createMockChapterWithRelations({
      content: '张三看到敌人后，吓得转身就跑，完全不敢应战...'
    }),
    previousChapters: [
      {
        id: 'chapter-0',
        chapterNumber: 1,
        title: '第一章',
        content: '张三勇敢地面对三个敌人，毫不畏惧地冲了上去...',
        characters: [{ character: { id: 'char-1', name: '张三' } }]
      }
    ],
    expectedIssue: {
      type: 'character',
      severity: 'high',
      issue: '张三的性格表现前后不一致'
    }
  },

  // 场景2: 世界设定矛盾
  settingInconsistency: {
    chapter: createMockChapterWithRelations({
      content: '张三来到京城，发现这里只是一个小村庄...'
    }),
    previousChapters: [
      {
        id: 'chapter-0',
        chapterNumber: 1,
        content: '京城是天下最繁华的都市，人口百万...',
        settings: [{ setting: { id: 'setting-1', name: '京城' } }]
      }
    ],
    expectedIssue: {
      type: 'setting',
      severity: 'high',
      issue: '京城的规模描述前后矛盾'
    }
  },

  // 场景3: 时间线问题
  timelineInconsistency: {
    chapter: createMockChapterWithRelations({
      content: '十年过去了，张三还是那个十八岁的少年...'
    }),
    previousChapters: [
      {
        id: 'chapter-0',
        chapterNumber: 1,
        content: '张三今年十八岁，正值青春年华...'
      }
    ],
    expectedIssue: {
      type: 'timeline',
      severity: 'medium',
      issue: '时间跨度与角色年龄不符'
    }
  },

  // 场景4: 逻辑矛盾
  logicInconsistency: {
    chapter: createMockChapterWithRelations({
      content: '张三使用了魔法攻击，火球呼啸而出...'
    }),
    previousChapters: [
      {
        id: 'chapter-0',
        chapterNumber: 1,
        content: '这个世界没有魔法，只有武功和兵器...'
      }
    ],
    expectedIssue: {
      type: 'logic',
      severity: 'high',
      issue: '世界观设定与情节发展矛盾'
    }
  }
};

module.exports = {
  createMockNovel,
  createMockCharacter,
  createMockWorldSetting,
  createMockChapter,
  createMockConsistencyCheck,
  createMockChapterWithRelations,
  createMockAIResponse,
  createMockConsistencyStats,
  testScenarios
};