# Server Logging System

本服务器实现了完整的日志记录系统，用于调试和问题定位。

## 日志功能特性

### 1. 请求日志记录
- 记录所有HTTP请求的详细信息
- 包含请求ID、方法、URL、用户代理、IP地址等
- 记录响应状态码、响应时间和数据大小
- 性能监控（慢请求警告）

### 2. AI接口调用日志
- 记录OpenAI和Claude等AI服务的API调用
- 包含模型参数、token使用量、响应时间
- 错误追踪和重试机制记录
- 一致性检查的专门日志

### 3. 错误追踪
- 详细的错误堆栈信息
- 请求上下文关联
- 错误分类和严重程度标记

## 日志配置

### 环境变量
```bash
LOG_LEVEL=debug  # 可选: error, warn, info, http, debug
```

### 日志级别说明
- **error**: 错误信息（红色）
- **warn**: 警告信息（黄色）
- **info**: 一般信息（绿色）
- **http**: HTTP请求日志（紫色）
- **debug**: 调试信息（白色）

## 日志文件

日志文件存储在 `server/logs/` 目录：

- `combined.log` - 所有日志信息
- `error.log` - 仅错误日志
- `api.log` - HTTP请求日志

每个日志文件最大5MB，保留5个备份文件。

## 日志格式

### JSON格式（文件日志）
```json
{
  "level": "info",
  "message": "API call completed",
  "service": "ai-novel-assistant",
  "timestamp": "2025-09-16 16:54:26",
  "provider": "openai",
  "endpoint": "/chat/completions",
  "duration": "1234ms",
  "request": {
    "model": "gpt-3.5-turbo",
    "messageCount": 2,
    "temperature": 0.7
  },
  "response": {
    "usage": {
      "prompt_tokens": 50,
      "completion_tokens": 100,
      "total_tokens": 150
    }
  }
}
```

### 控制台格式（开发模式）
```
2025-09-16 16:54:26 info: API call completed
2025-09-16 16:54:26 http: Incoming request
2025-09-16 16:54:26 error: OpenAI API Error
```

## 使用方式

### 基础日志记录
```javascript
const logger = require('./utils/logger');

logger.info('操作完成');
logger.warn('警告信息');
logger.error('错误信息', { error: error.message });
```

### API调用日志
```javascript
// 在aiService.js中自动记录
logger.logApiCall('openai', '/chat/completions', requestData, response, duration);
```

### 一致性检查日志
```javascript
logger.logConsistencyCheck(novelId, scope, issues, duration);
```

## 调试指南

### 1. 查看实时日志
```bash
# 开发模式下控制台会显示彩色日志
npm run dev

# 生产模式查看日志文件
tail -f server/logs/combined.log
```

### 2. 筛选特定类型日志
```bash
# 查看错误日志
cat server/logs/error.log | grep "error"

# 查看API调用日志
cat server/logs/api.log | grep "API call"

# 查看特定请求ID的日志
cat server/logs/combined.log | grep "requestId":"abc123"
```

### 3. 性能监控
- 慢请求（>5秒）会标记为"SLOW"并生成警告
- 中等响应时间（2-5秒）标记为"MEDIUM"
- 快速响应（<2秒）标记为"FAST"

## 生产环境建议

1. 设置 `LOG_LEVEL=info` 减少日志量
2. 配置日志轮转避免磁盘满
3. 考虑使用ELK Stack或类似工具进行日志分析
4. 定期清理旧日志文件
5. 监控日志文件大小和数量

## 故障排查

### 常见问题

1. **日志文件未生成**
   - 检查 `server/logs/` 目录权限
   - 确认winston依赖正确安装

2. **控制台无彩色输出**
   - 确认 `NODE_ENV` 不是 `production`
   - 检查终端是否支持颜色

3. **日志级别不生效**
   - 检查 `LOG_LEVEL` 环境变量设置
   - 重启服务器使配置生效

### 日志示例

成功的HTTP请求：
```json
{
  "headers": {
    "content-type": "application/json"
  },
  "ip": "::1",
  "level": "http",
  "message": "Incoming request",
  "method": "POST",
  "requestBody": {
    "data": {
      "email": "test@example.com",
      "name": "test user",
      "password": "[REDACTED]",
      "apiKey": "[REDACTED]"
    },
    "size": 121
  },
  "requestId": "av84l7nps",
  "timestamp": "2025-09-16 17:08:56",
  "url": "/api/test",
  "userAgent": "curl/8.7.1"
}
```

AI API调用日志：
```json
{
  "duration": "1234ms",
  "endpoint": "/chat/completions",
  "level": "info",
  "message": "API call completed",
  "provider": "openai",
  "request": {
    "maxTokens": 2000,
    "messageCount": 2,
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "messages": [
      {
        "role": "system",
        "contentLength": 150,
        "contentPreview": "你是一个专业的小说创作助手..."
      }
    ]
  },
  "response": {
    "model": "gpt-3.5-turbo",
    "usage": {
      "prompt_tokens": 50,
      "completion_tokens": 100,
      "total_tokens": 150
    },
    "finishReason": "stop",
    "contentLength": 200,
    "contentPreview": "这是一个很好的想法..."
  },
  "timestamp": "2025-09-16 17:00:00"
}
```

错误日志：
```json
{
  "level": "error",
  "message": "Request completed with error",
  "method": "POST",
  "requestId": "abc123",
  "statusCode": 500,
  "responseBody": {
    "data": "{\"error\":\"Internal Server Error\"}",
    "size": 35
  },
  "duration": "15ms",
  "timestamp": "2025-09-16 17:00:00"
}
```