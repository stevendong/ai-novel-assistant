const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试用户管理功能
async function testUserManagement() {
  console.log('开始测试用户管理功能...\n');

  try {
    // 1. 测试获取用户列表
    console.log('1. 测试获取用户列表');
    const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      },
      params: {
        page: 1,
        limit: 10
      }
    });
    console.log('✓ 用户列表获取成功');
    console.log(`  - 总用户数: ${usersResponse.data.pagination.total}`);
    console.log(`  - 当前页用户数: ${usersResponse.data.users.length}\n`);

    // 2. 测试创建用户
    console.log('2. 测试创建用户');
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testPassword123',
      nickname: '测试用户',
      role: 'user'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/admin/users`, testUser, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 用户创建成功');
    console.log(`  - 用户ID: ${createResponse.data.user.id}`);
    const createdUserId = createResponse.data.user.id;

    // 3. 测试获取单个用户详情
    console.log('\n3. 测试获取用户详情');
    const userDetailResponse = await axios.get(`${BASE_URL}/api/admin/users/${createdUserId}`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 用户详情获取成功');
    console.log(`  - 用户名: ${userDetailResponse.data.username}`);
    console.log(`  - 邮箱: ${userDetailResponse.data.email}`);

    // 4. 测试更新用户信息
    console.log('\n4. 测试更新用户信息');
    const updateData = {
      username: testUser.username,
      email: testUser.email,
      nickname: '更新后的昵称'
    };

    const updateResponse = await axios.put(`${BASE_URL}/api/admin/users/${createdUserId}`, updateData, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 用户信息更新成功');
    console.log(`  - 新昵称: ${updateResponse.data.user.nickname}`);

    // 5. 测试更新用户状态
    console.log('\n5. 测试更新用户状态');
    const statusResponse = await axios.patch(`${BASE_URL}/api/admin/users/${createdUserId}/status`, {
      isActive: false
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 用户状态更新成功');
    console.log(`  - 用户状态: ${statusResponse.data.isActive ? '活跃' : '禁用'}`);

    // 6. 测试更新用户角色
    console.log('\n6. 测试更新用户角色');
    const roleResponse = await axios.patch(`${BASE_URL}/api/admin/users/${createdUserId}/role`, {
      role: 'admin'
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 用户角色更新成功');
    console.log(`  - 用户角色: ${roleResponse.data.role}`);

    // 7. 测试重置密码
    console.log('\n7. 测试重置密码');
    const passwordResponse = await axios.patch(`${BASE_URL}/api/admin/users/${createdUserId}/password`, {
      newPassword: 'newPassword123'
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 密码重置成功');

    // 8. 测试搜索建议
    console.log('\n8. 测试搜索建议');
    const searchResponse = await axios.get(`${BASE_URL}/api/admin/users/search/suggestions`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      },
      params: {
        q: testUser.username.substring(0, 5)
      }
    });
    console.log('✓ 搜索建议获取成功');
    console.log(`  - 建议数量: ${searchResponse.data.length}`);

    // 9. 测试批量操作
    console.log('\n9. 测试批量操作');
    const batchResponse = await axios.patch(`${BASE_URL}/api/admin/users/batch`, {
      userIds: [createdUserId],
      action: 'activate'
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 批量操作成功');
    console.log(`  - 影响用户数: ${batchResponse.data.affectedCount}`);

    // 10. 测试导出功能
    console.log('\n10. 测试导出功能');
    const exportResponse = await axios.get(`${BASE_URL}/api/admin/users/export`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      },
      params: {
        format: 'json'
      }
    });
    console.log('✓ 数据导出成功');
    console.log(`  - 导出用户数: ${exportResponse.data.totalUsers}`);

    // 11. 测试获取统计信息
    console.log('\n11. 测试获取统计信息');
    const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 统计信息获取成功');
    console.log(`  - 总用户数: ${statsResponse.data.users.total}`);
    console.log(`  - 活跃用户数: ${statsResponse.data.users.active}`);
    console.log(`  - 管理员数: ${statsResponse.data.users.admins}`);

    // 12. 测试删除用户（软删除）
    console.log('\n12. 测试删除用户');
    const deleteResponse = await axios.delete(`${BASE_URL}/api/admin/users/${createdUserId}`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✓ 用户删除成功');

    console.log('\n✅ 所有用户管理功能测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);

    // 显示详细错误信息
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testUserManagement();