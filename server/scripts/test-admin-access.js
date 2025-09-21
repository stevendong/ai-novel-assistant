const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAdminAccess() {
  console.log('🔐 测试管理员API访问...\n');

  try {
    // 首先创建管理员用户进行测试
    console.log('1. 创建测试管理员用户');
    const adminData = {
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@example.com`,
      password: 'adminPassword123',
      nickname: '测试管理员'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, adminData);
    const adminUser = registerResponse.data.user;
    const sessionToken = registerResponse.data.session.sessionToken;

    console.log('✅ 管理员用户创建成功');
    console.log(`   用户ID: ${adminUser.id}`);
    console.log(`   用户名: ${adminUser.username}\n`);

    // 需要手动设置为管理员（在实际应用中会通过数据库或管理员创建）
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'admin' }
    });

    console.log('✅ 用户角色已设置为管理员\n');

    // 设置认证头
    const headers = {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    };

    // 2. 测试管理员用户列表接口
    console.log('2. 测试管理员用户列表接口');
    console.log('   请求URL: GET /api/admin/users?page=1&limit=20&search=&role=');

    const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
      headers,
      params: {
        page: 1,
        limit: 20,
        search: '',
        role: ''
      }
    });

    console.log('✅ 管理员用户列表获取成功');
    console.log(`   用户总数: ${usersResponse.data.pagination.total}`);
    console.log(`   当前页用户数: ${usersResponse.data.users.length}`);
    console.log(`   分页信息: 第${usersResponse.data.pagination.page}页，共${usersResponse.data.pagination.totalPages}页\n`);

    // 3. 测试获取系统统计
    console.log('3. 测试系统统计接口');
    console.log('   请求URL: GET /api/admin/stats');

    const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`, { headers });

    console.log('✅ 系统统计获取成功');
    console.log(`   总用户数: ${statsResponse.data.users.total}`);
    console.log(`   活跃用户数: ${statsResponse.data.users.active}`);
    console.log(`   管理员数: ${statsResponse.data.users.admins}`);
    console.log(`   最近新用户: ${statsResponse.data.users.recent}\n`);

    // 4. 测试搜索建议
    console.log('4. 测试搜索建议接口');
    console.log('   请求URL: GET /api/admin/users/search/suggestions?q=admin');

    const searchResponse = await axios.get(`${BASE_URL}/api/admin/users/search/suggestions`, {
      headers,
      params: { q: 'admin' }
    });

    console.log('✅ 搜索建议获取成功');
    console.log(`   建议数量: ${searchResponse.data.length}\n`);

    console.log('🎉 所有管理员API测试完成！');
    console.log('\n📝 API使用说明:');
    console.log('1. 所有管理员API都需要 /api 前缀');
    console.log('2. 需要Bearer Token认证');
    console.log('3. 需要管理员权限 (role: "admin")');
    console.log('\n正确的API路径示例:');
    console.log('- GET /api/admin/users              // 获取用户列表');
    console.log('- GET /api/admin/users/:id          // 获取用户详情');
    console.log('- POST /api/admin/users             // 创建用户');
    console.log('- PUT /api/admin/users/:id          // 更新用户');
    console.log('- DELETE /api/admin/users/:id       // 删除用户');
    console.log('- GET /api/admin/stats              // 获取统计信息');

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);

    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAdminAccess();