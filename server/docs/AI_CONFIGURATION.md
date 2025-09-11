# AI服务配置文档

本文档详细说明了AI小说助手的AI服务配置选项。

## 概述

AI小说助手支持多种AI提供商，包括：
- **OpenAI** (GPT系列模型)
- **Claude** (Anthropic的Claude模型)  
- **自定义OpenAI兼容服务** (如本地部署的LLM服务)

## 基础配置

### 必需环境变量

```bash
# 默认AI提供商 (openai/claude/自定义名称)
DEFAULT_AI_PROVIDER=openai

# OpenAI API配置 (必需)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
```

### 推荐模型选择

| 模型 | 用途 | 特点 | 成本 |
|------|------|------|------|
| gpt-3.5-turbo | 通用对话、快速生成 | 速度快、成本低 | 低 |
| gpt-4 | 高质量创作、复杂分析 | 质量高、理解力强 | 高 |
| gpt-4-turbo | 平衡性能与成本 | 性能好、相对经济 | 中等 |

## 详细配置选项

### OpenAI配置

```bash
# 基础设置
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1  # 默认值
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# 请求参数 (影响所有任务的默认行为)
OPENAI_TEMPERATURE=0.7           # 创造性 (0-2，越高越创新)
OPENAI_MAX_TOKENS=2000          # 最大输出长度
OPENAI_TOP_P=1                  # 核采样 (0-1)
OPENAI_FREQUENCY_PENALTY=0      # 频率惩罚 (-2到2)
OPENAI_PRESENCE_PENALTY=0       # 存在惩罚 (-2到2)

# 任务特定参数 (覆盖默认值)
OPENAI_CONSISTENCY_TEMPERATURE=0.3    # 一致性检查：更保守
OPENAI_CONSISTENCY_MAX_TOKENS=1500    # 一致性检查：较短输出
OPENAI_CREATIVE_TEMPERATURE=0.9       # 创意写作：更有创造性
OPENAI_CREATIVE_MAX_TOKENS=3000       # 创意写作：更长输出
OPENAI_ANALYSIS_TEMPERATURE=0.2       # 分析任务：更精确
OPENAI_ANALYSIS_MAX_TOKENS=2000       # 分析任务：适中长度

# 重试和超时设置
OPENAI_RETRY_ATTEMPTS=3         # 重试次数
OPENAI_BACKOFF_MULTIPLIER=2     # 重试延迟倍数
OPENAI_INITIAL_DELAY=1000       # 首次重试延迟(毫秒)
OPENAI_TIMEOUT=60000           # 请求超时(毫秒)
```

### Claude配置

```bash
# 基础设置
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_BASE_URL=https://api.anthropic.com    # 默认值
CLAUDE_MODEL=claude-3-sonnet-20240229

# 请求参数
CLAUDE_MAX_TOKENS=2000
CLAUDE_TEMPERATURE=0.7

# 重试和超时设置
CLAUDE_RETRY_ATTEMPTS=3
CLAUDE_BACKOFF_MULTIPLIER=2
CLAUDE_INITIAL_DELAY=1000
CLAUDE_TIMEOUT=60000
```

### 自定义提供商配置

```bash
# 自定义OpenAI兼容服务 (如Ollama、vLLM等)
CUSTOM_PROVIDER_NAME=my-local-llm
CUSTOM_API_KEY=optional-api-key
CUSTOM_BASE_URL=http://localhost:11434/v1
CUSTOM_MODEL=llama2:7b
CUSTOM_TEMPERATURE=0.7
CUSTOM_MAX_TOKENS=2000
```

### 全局AI设置

```bash
# 日志和监控
AI_LOG_LEVEL=info              # debug/info/warn/error
AI_ENABLE_CACHE=false          # 启用响应缓存
AI_CACHE_TTL=3600             # 缓存过期时间(秒)
AI_ENABLE_USAGE_STATS=true    # 启用使用统计
```

## 任务类型说明

系统根据不同任务类型使用不同的参数配置：

### consistency (一致性检查)
- **温度**: 较低 (0.3) - 确保分析的一致性
- **最大Token**: 较少 (1500) - 专注于问题识别
- **用途**: 检查角色、设定、时间线、逻辑一致性

### creative (创意写作)
- **温度**: 较高 (0.9) - 鼓励创新和多样性
- **最大Token**: 较多 (3000) - 允许更长的创作
- **用途**: 故事情节生成、角色对话创作

### analysis (分析任务)
- **温度**: 很低 (0.2) - 确保分析的准确性
- **最大Token**: 中等 (2000) - 平衡详细度和效率
- **用途**: 文本分析、结构评估

### default (默认)
- **温度**: 中等 (0.7) - 平衡创造性和准确性
- **最大Token**: 中等 (2000) - 适合大多数对话
- **用途**: 通用对话、问答

## 性能优化建议

### 成本控制
1. **选择合适的模型**：日常使用gpt-3.5-turbo，关键任务使用gpt-4
2. **限制Token数量**：根据需要调整`MAX_TOKENS`参数
3. **启用缓存**：对相似请求启用缓存减少API调用

### 响应质量
1. **调整温度参数**：
   - 事实性任务使用低温度 (0.1-0.3)
   - 创造性任务使用高温度 (0.7-1.0)
2. **优化提示词**：使用清晰、具体的指令
3. **设置合适的重试**：网络不稳定时增加重试次数

### 响应速度
1. **选择合适的超时时间**：平衡稳定性和响应速度
2. **使用流式响应**：对长文本生成启用流式输出
3. **并发控制**：避免同时发起过多请求

## 错误处理

系统内置了完善的错误处理机制：

### 自动重试
- **网络错误**：自动重试
- **限流错误 (429)**：指数退避重试
- **服务器错误 (5xx)**：自动重试
- **客户端错误 (4xx)**：不重试 (除429外)

### 错误日志
根据`AI_LOG_LEVEL`设置记录不同级别的日志：
- `debug`: 记录所有请求详情
- `info`: 记录错误和重试信息
- `warn`: 只记录警告和错误
- `error`: 只记录严重错误

## 测试配置

使用测试脚本验证配置：

```bash
# 运行配置测试
node scripts/test-ai-config.js
```

测试脚本会验证：
- 配置完整性
- 参数构建
- API连接性
- 环境变量设置

## 常见问题

### Q: 如何切换AI提供商？
A: 修改`DEFAULT_AI_PROVIDER`环境变量，重启服务即可。

### Q: 模型响应太慢怎么办？
A: 
1. 降低`MAX_TOKENS`参数
2. 减少`TIMEOUT`时间
3. 考虑使用更快的模型

### Q: 如何使用本地部署的模型？
A: 配置`CUSTOM_PROVIDER_NAME`、`CUSTOM_BASE_URL`等参数，确保服务兼容OpenAI API格式。

### Q: API成本过高怎么办？
A: 
1. 使用gpt-3.5-turbo替代gpt-4
2. 降低`MAX_TOKENS`参数
3. 启用响应缓存
4. 优化提示词减少不必要的输出

### Q: 一致性检查不够准确？
A: 
1. 降低`OPENAI_CONSISTENCY_TEMPERATURE`到0.1-0.2
2. 使用更高级的模型如gpt-4
3. 调整提示词增加更多上下文

## 安全注意事项

1. **API密钥安全**：
   - 不要将API密钥提交到版本控制
   - 使用环境变量或密钥管理服务
   - 定期轮换API密钥

2. **网络安全**：
   - 使用HTTPS连接
   - 验证自定义服务的SSL证书
   - 设置合理的超时时间

3. **数据隐私**：
   - 了解AI提供商的数据处理政策
   - 避免发送敏感信息
   - 考虑使用本地部署的模型处理敏感内容