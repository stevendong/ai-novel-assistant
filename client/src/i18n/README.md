# 国际化 (i18n) 使用指南

## 概述

本项目已集成 Vue I18n 国际化支持，目前支持中文（zh）和英文（en）两种语言。

## 文件结构

```
src/i18n/
├── index.ts          # i18n 配置文件
├── locales/
│   ├── zh.json      # 中文语言包
│   └── en.json      # 英文语言包
└── README.md        # 使用指南
```

## 使用方法

### 1. 在模板中使用

```vue
<template>
  <!-- 基本用法 -->
  <h1>{{ $t('app.title') }}</h1>

  <!-- 在属性中使用 -->
  <a-input :placeholder="$t('common.search')" />

  <!-- 带参数的翻译 -->
  <span>{{ $t('chapter.selectedChapters', { count: 5 }) }}</span>
</template>
```

### 2. 在脚本中使用

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const message = t('message.saveSuccess')
</script>
```

### 3. 切换语言

```typescript
import { setLocale } from '@/i18n'

// 切换到英文
setLocale('en')

// 切换到中文
setLocale('zh')
```

## 语言包结构

语言包按功能模块组织：

- `common`: 通用词汇（确定、取消、保存等）
- `app`: 应用程序标题和描述
- `nav`: 导航菜单项
- `project`: 项目管理相关
- `chapter`: 章节管理相关
- `character`: 人物设定相关
- `worldSetting`: 世界设定相关
- `ai`: AI助手相关
- `export`: 导出功能相关
- `theme`: 主题相关
- `language`: 语言设置相关
- `message`: 提示消息相关

## 添加新翻译

1. 在 `zh.json` 中添加中文翻译
2. 在 `en.json` 中添加对应的英文翻译
3. 确保两个文件的键名结构一致

## 注意事项

- 语言设置会自动保存到 localStorage
- 默认语言为中文（zh）
- 当翻译缺失时会回退到中文
- 使用 `$t()` 进行翻译，避免硬编码文本