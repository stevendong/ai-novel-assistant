const { PrismaClient } = require('@prisma/client');
const { initTestData } = require('./initTestData');
const prisma = new PrismaClient();

// 获取命令行参数
const command = process.argv[2];

async function clearAllData() {
  console.log('🗑️  开始清空所有数据...');
  
  try {
    // 按照外键依赖顺序删除
    await prisma.consistencyCheck.deleteMany({});
    console.log('✅ 清空一致性检查记录');
    
    await prisma.chapterCharacter.deleteMany({});
    console.log('✅ 清空章节角色关联');
    
    await prisma.chapterSetting.deleteMany({});
    console.log('✅ 清空章节设定关联');
    
    await prisma.chapter.deleteMany({});
    console.log('✅ 清空章节数据');
    
    await prisma.aIConstraint.deleteMany({});
    console.log('✅ 清空AI约束设置');
    
    await prisma.character.deleteMany({});
    console.log('✅ 清空角色数据');
    
    await prisma.worldSetting.deleteMany({});
    console.log('✅ 清空世界设定');
    
    await prisma.novel.deleteMany({});
    console.log('✅ 清空小说数据');
    
    console.log('🎉 所有数据清空完成！');
  } catch (error) {
    console.error('❌ 清空数据失败:', error);
  }
}

async function showDataStatus() {
  console.log('📊 数据库状态统计：\n');
  
  try {
    const novels = await prisma.novel.count();
    const characters = await prisma.character.count();
    const settings = await prisma.worldSetting.count();
    const chapters = await prisma.chapter.count();
    const aiConstraints = await prisma.aIConstraint.count();
    
    console.log(`📚 小说数量: ${novels}`);
    console.log(`👥 角色数量: ${characters}`);
    console.log(`🌍 设定数量: ${settings}`);
    console.log(`📖 章节数量: ${chapters}`);
    console.log(`🤖 AI约束: ${aiConstraints}`);
    
    if (novels > 0) {
      console.log('\n📋 小说列表:');
      const novelList = await prisma.novel.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          _count: {
            select: {
              chapters: true,
              characters: true,
              settings: true
            }
          }
        }
      });
      
      novelList.forEach(novel => {
        console.log(`  - ${novel.title} (ID: ${novel.id})`);
        console.log(`    状态: ${novel.status}, 章节: ${novel._count.chapters}, 角色: ${novel._count.characters}, 设定: ${novel._count.settings}`);
      });
    }
    
    if (chapters > 0) {
      console.log('\n📖 章节列表:');
      const chapterList = await prisma.chapter.findMany({
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          status: true
        },
        orderBy: {
          chapterNumber: 'asc'
        }
      });
      
      chapterList.forEach(chapter => {
        console.log(`  - 第${chapter.chapterNumber}章: ${chapter.title} (${chapter.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 获取状态失败:', error);
  }
}

async function testAPIs() {
  console.log('🧪 开始API测试...\n');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const testUrls = [
    { url: 'http://localhost:3001/api/health', name: '健康检查' },
    { url: 'http://localhost:3001/api/novels', name: '小说列表' },
    { url: 'http://localhost:3001/api/novels/1', name: '小说详情' },
    { url: 'http://localhost:3001/api/chapters/1', name: '章节1' },
    { url: 'http://localhost:3001/api/chapters/2', name: '章节2' },
    { url: 'http://localhost:3001/api/characters/novel/1', name: '小说角色' }
  ];
  
  for (const test of testUrls) {
    try {
      console.log(`🔍 测试: ${test.name} (${test.url})`);
      const { stdout, stderr } = await execAsync(`curl -s -w "HTTP_STATUS:%{http_code}" "${test.url}"`);
      
      const lines = stdout.split('HTTP_STATUS:');
      const responseBody = lines[0];
      const statusCode = lines[1] || '000';
      
      if (statusCode.startsWith('2')) {
        console.log(`✅ 成功 - 状态码: ${statusCode}`);
        
        try {
          const data = JSON.parse(responseBody);
          
          if (test.url.includes('/chapters/1')) {
            console.log(`   章节标题: ${data.title}`);
            console.log(`   字数: ${data.content ? data.content.length : 0} 字符`);
            console.log(`   状态: ${data.status}`);
          } else if (test.url.includes('/novels/1')) {
            console.log(`   小说标题: ${data.title}`);
            console.log(`   角色数: ${data.characters ? data.characters.length : 0}`);
            console.log(`   章节数: ${data.chapters ? data.chapters.length : 0}`);
          } else if (test.url.includes('/health')) {
            console.log(`   服务状态: ${data.status}`);
          }
        } catch (parseError) {
          console.log('   响应内容: 非JSON格式');
        }
      } else {
        console.log(`❌ 失败 - 状态码: ${statusCode}`);
        if (responseBody) {
          console.log(`   错误信息: ${responseBody.substring(0, 100)}`);
        }
      }
    } catch (error) {
      console.log(`❌ 错误: ${error.message}`);
    }
    console.log('');
  }
}

async function main() {
  try {
    switch (command) {
      case 'init':
        await initTestData();
        break;
        
      case 'clear':
        await clearAllData();
        break;
        
      case 'reset':
        await clearAllData();
        console.log('');
        await initTestData();
        break;
        
      case 'status':
        await showDataStatus();
        break;
        
      case 'test':
        await testAPIs();
        break;
        
      default:
        console.log(`
📋 测试数据管理工具

用法: node scripts/manageTestData.js <command>

可用命令:
  init     - 初始化测试数据
  clear    - 清空所有数据  
  reset    - 重置数据（清空后重新初始化）
  status   - 查看数据库状态
  test     - 测试API接口

示例:
  node scripts/manageTestData.js init     # 创建测试数据
  node scripts/manageTestData.js status   # 查看状态
  node scripts/manageTestData.js test     # 测试API
  node scripts/manageTestData.js reset    # 重置所有数据
        `);
        break;
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
