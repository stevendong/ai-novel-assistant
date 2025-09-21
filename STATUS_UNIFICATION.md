# 小说项目状态字段和枚举统一方案

## 统一后的状态定义

### 1. 小说状态 (NovelStatus)
```typescript
enum NovelStatus {
  CONCEPT = 'concept',      // 构思中
  DRAFT = 'draft',          // 草稿
  PLANNING = 'planning',    // 策划中
  WRITING = 'writing',      // 写作中
  EDITING = 'editing',      // 编辑中
  COMPLETED = 'completed',  // 已完成
  PUBLISHED = 'published'   // 已发布
}
```

### 2. 章节状态 (ChapterStatus)
```typescript
enum ChapterStatus {
  PLANNING = 'planning',    // 策划中
  OUTLINED = 'outlined',    // 大纲完成
  WRITING = 'writing',      // 写作中
  REVIEWING = 'reviewing',  // 审阅中
  EDITING = 'editing',      // 编辑中
  COMPLETED = 'completed'   // 已完成
}
```

## 已更新的文件

### 1. 核心配置文件
- **新建**: `client/src/constants/status.ts` - 统一的状态管理配置
  - 包含所有状态枚举定义
  - 中文文本映射
  - 颜色映射
  - 状态过渡规则
  - 工具函数

### 2. 类型定义
- **更新**: `client/src/types/index.ts`
  - Novel 接口的 status 字段使用 NovelStatus 枚举
  - Chapter 接口的 status 字段使用 ChapterStatus 枚举
  - ChapterProgress 接口的 status 字段使用 ChapterStatus 枚举

### 3. 组件层
- **更新**: `client/src/components/novel/ProjectManagement.vue`
  - getStatusText() 函数使用统一的 getNovelStatusText()
  - getStatusColor() 函数使用统一的 getNovelStatusColor()
  - 导入统一的状态管理配置

### 4. 服务层
- **更新**: `client/src/services/workflowService.ts`
  - getStatusText() 方法使用统一的状态文本获取函数
  - getStatusColor() 方法使用统一的状态颜色获取函数
  - 导入统一的状态管理配置

## 状态映射对照表

### 小说状态变化
| 原状态 | 新状态 | 中文名称 |
|--------|--------|----------|
| draft | draft | 草稿 |
| writing | writing | 写作中 |
| completed | completed | 已完成 |
| (新增) | concept | 构思中 |
| (新增) | planning | 策划中 |
| (新增) | editing | 编辑中 |
| (新增) | published | 已发布 |

### 章节状态变化
| 原状态 | 新状态 | 中文名称 |
|--------|--------|----------|
| planning | planning | 策划中 |
| writing | writing | 写作中 |
| reviewing | reviewing | 审阅中 |
| completed | completed | 已完成 |
| (新增) | outlined | 大纲完成 |
| (新增) | editing | 编辑中 |

## 优势和改进

### 1. 类型安全
- 使用 TypeScript 枚举，提供编译时类型检查
- 防止状态值拼写错误
- IDE 自动补全支持

### 2. 维护性
- 集中管理所有状态相关配置
- 统一的文本和颜色映射
- 易于添加新状态或修改现有状态

### 3. 一致性
- 前后端状态定义保持一致
- 所有组件使用相同的状态文本和颜色
- 规范化的状态过渡规则

### 4. 扩展性
- 提供状态过渡规则定义
- 支持状态权重排序
- 便于实现状态验证和工作流

## 向后兼容性

- 保持现有的字符串状态值不变
- 现有的数据库数据无需迁移
- 新增状态通过工作流系统逐步引入

## 使用示例

```typescript
import { NovelStatus, getNovelStatusText, getNovelStatusColor } from '@/constants/status'

// 使用枚举
const status: NovelStatus = NovelStatus.WRITING

// 获取显示文本
const text = getNovelStatusText(status) // "写作中"

// 获取颜色
const color = getNovelStatusColor(status) // "#1890ff"

// 验证状态
const isValid = isValidNovelStatus('writing') // true
```

## 后续工作

1. **后端同步**: 更新服务端的状态枚举定义
2. **工作流完善**: 基于新的状态定义完善工作流逻辑
3. **组件迁移**: 逐步迁移其他使用状态的组件
4. **文档更新**: 更新API文档和开发文档