# 字数统计优化

## 概述

优化了系统中的字数统计功能，现在能够更准确地计算有效字数，忽略空格、换行等无意义字符。

## 主要改进

### 1. 新的字数统计算法

- **忽略空白字符**：自动过滤空格、制表符、换行符等
- **支持Markdown**：可选择移除Markdown标记（如 `#`, `**`, `*` 等）
- **支持HTML**：可选择移除HTML标签
- **支持标点过滤**：可选择移除中英文标点符号

### 2. 统一的工具函数

```typescript
// 基本用法
import { countValidWords } from '@/utils/textUtils'

const text = "这是   一段   有   很多   空格   的   文本。"
const count = countValidWords(text)  // 返回: 13

// 高级用法
const count = countValidWords(text, {
  removeMarkdown: true,  // 移除Markdown标记
  removeHtml: true,      // 移除HTML标签
  removePunctuation: false // 保留标点符号
})
```

### 3. 应用范围

已更新以下组件使用新的字数统计：

- `useChapter.ts` - 章节字数统计
- `useMarkdown.ts` - Markdown文档字数统计  
- `NovelTextEditor.vue` - 编辑器字数显示
- `TiptapEditor.vue` - 富文本编辑器字数统计
- `MainLayout.vue` - 项目总字数显示
- `ProgressStats.vue` - 进度统计页面
- `chapters.js` (服务器端) - 章节保存时自动计算字数

### 4. 格式化显示

提供了友好的字数格式化：

```typescript
formatWordCount(1500)    // "1.5千字"
formatWordCount(15000)   // "1.5万字"
formatWordCount(500)     // "500字"
```

### 5. 阅读时间估算

```typescript
estimateReadingTime(3000)  
// 返回: { minutes: 10, text: "约10分钟" }
```

## 测试验证

运行以下命令可以测试字数统计功能：

```bash
cd client
node -e "
const { countValidWords } = require('./src/utils/textUtils.ts');
console.log(countValidWords('这是   测试   文本！'));  // 输出: 7
"
```

## 向后兼容

- 保持了与现有API的兼容性
- 服务器端自动使用新算法计算章节字数
- 前端显示会自动更新为更准确的字数