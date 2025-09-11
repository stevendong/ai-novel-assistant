#!/usr/bin/env node

/**
 * 测试AI配置和连接的脚本
 * 使用方法: node scripts/test-ai-config.js
 */

require('dotenv').config();
const { aiConfig, validateConfig } = require('../config/aiConfig');
const { withRetry, buildRequestParams } = require('../utils/aiHelpers');
const OpenAI = require('openai');

async function testConfiguration() {
  console.log('🔧 AI配置测试\n');
  
  // 1. 验证配置
  console.log('1. 验证配置...');
  try {
    validateConfig();
    console.log('✅ 配置验证通过\n');
  } catch (error) {
    console.log('❌ 配置验证失败:', error.message, '\n');
    return;
  }
  
  // 2. 显示配置摘要
  console.log('2. 配置摘要:');
  console.log(`   默认提供商: ${aiConfig.global.defaultProvider}`);
  console.log(`   OpenAI模型: ${aiConfig.openai.model}`);
  console.log(`   OpenAI基础URL: ${aiConfig.openai.baseURL}`);
  console.log(`   日志级别: ${aiConfig.global.logLevel}`);
  console.log(`   启用使用统计: ${aiConfig.global.enableUsageStats}\n`);
  
  // 3. 测试参数构建
  console.log('3. 测试参数构建...');
  try {
    const consistencyParams = buildRequestParams('openai', 'consistency');
    const creativeParams = buildRequestParams('openai', 'creative');
    
    console.log('   一致性检查参数:', JSON.stringify(consistencyParams, null, 2));
    console.log('   创意写作参数:', JSON.stringify(creativeParams, null, 2));
    console.log('✅ 参数构建测试通过\n');
  } catch (error) {
    console.log('❌ 参数构建测试失败:', error.message, '\n');
  }
  
  // 4. 测试API连接 (如果有API密钥)
  if (aiConfig.openai.apiKey && aiConfig.openai.apiKey !== 'your_openai_api_key_here') {
    console.log('4. 测试API连接...');
    
    try {
      const openai = new OpenAI({
        baseURL: aiConfig.openai.baseURL,
        apiKey: aiConfig.openai.apiKey,
        timeout: Math.min(10000, aiConfig.openai.timeout) // 测试时使用较短的超时
      });
      
      const testRequest = async () => {
        const params = buildRequestParams('openai', 'analysis', {
          maxTokens: 50 // 测试时使用较少的token
        });
        
        const response = await openai.chat.completions.create({
          model: aiConfig.openai.model,
          messages: [
            {
              role: 'user',
              content: '请简单说"配置测试成功"'
            }
          ],
          ...params
        });
        
        return response;
      };
      
      const response = await withRetry(testRequest, 'openai');
      console.log('   API响应:', response.choices[0].message.content.trim());
      console.log('   使用的模型:', response.model);
      console.log('   Token使用:', JSON.stringify(response.usage));
      console.log('✅ API连接测试通过\n');
      
    } catch (error) {
      console.log('❌ API连接测试失败:', error.message, '\n');
    }
  } else {
    console.log('4. 跳过API连接测试 (未配置有效的API密钥)\n');
  }
  
  // 5. 环境变量检查
  console.log('5. 环境变量检查:');
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'DEFAULT_AI_PROVIDER'
  ];
  
  const optionalEnvVars = [
    'OPENAI_BASE_URL',
    'OPENAI_TEMPERATURE',
    'OPENAI_MAX_TOKENS',
    'AI_LOG_LEVEL'
  ];
  
  console.log('   必需变量:');
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value && value !== `your_${envVar.toLowerCase()}_here`) {
      console.log(`   ✅ ${envVar}: ${envVar.includes('KEY') ? '[已设置]' : value}`);
    } else {
      console.log(`   ❌ ${envVar}: 未设置或使用默认值`);
    }
  });
  
  console.log('   可选变量:');
  optionalEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`   ✅ ${envVar}: ${value}`);
    } else {
      console.log(`   ⚠️  ${envVar}: 使用默认值`);
    }
  });
  
  console.log('\n🎉 配置测试完成!');
}

// 运行测试
if (require.main === module) {
  testConfiguration().catch(error => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = { testConfiguration };