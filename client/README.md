# AI小说创作协作工具 - 前端客户端

基于设计文档实现的AI小说创作协作工具前端界面，使用Vue 3 + TypeScript + Ant Design + Tailwind CSS技术栈。

## 🚀 技术栈

- **Vue 3**: 使用Composition API的现代Vue.js框架
- **TypeScript**: 类型安全的JavaScript超集
- **Ant Design Vue**: 企业级UI组件库
- **Tailwind CSS**: 实用优先的CSS框架
- **Monaco Editor**: VSCode同款代码编辑器，用于章节内容编辑
- **Vite**: 快速的构建工具和开发服务器

## 📁 项目结构

```
src/
├── components/           # 组件目录
│   ├── layout/          # 布局组件
│   │   └── MainLayout.vue
│   ├── novel/           # 小说项目管理
│   │   ├── ProjectManagement.vue
│   │   └── ProgressStats.vue
│   ├── character/       # 角色管理
│   │   └── CharacterManagement.vue
│   ├── worldsetting/    # 世界设定管理
│   │   └── WorldSettingManagement.vue
│   ├── chapter/         # 章节编辑
│   │   └── ChapterEditor.vue
│   └── ai/              # AI助手
│       └── AIAssistantPanel.vue
├── types/               # TypeScript类型定义
│   └── index.ts
├── stores/              # Pinia状态管理
├── composables/         # Vue组合式函数
├── assets/              # 静态资源
└── main.ts              # 应用入口
```

## 🎯 功能特性

### 🏠 主界面布局
- **顶部菜单栏**: 应用标题和设置按钮
- **左侧导航面板**: 项目信息、角色库、世界设定、章节列表、进度统计
- **中央内容区域**: 可切换的内容编辑区域
- **右侧AI助手面板**: 智能创作助手，可收缩
- **底部状态栏**: 项目状态和AI连接状态

### 📚 项目管理
- 创建、编辑、删除小说项目
- 项目信息管理（标题、描述、类型、分级）
- 最近项目列表
- 项目统计数据

### 👥 角色管理
- 角色库管理和搜索
- 详细角色信息编辑：
  - 基本信息（姓名、外貌、性格）
  - 背景故事
  - 人际关系网络
- 角色锁定功能防止误修改
- AI智能建议

### 🌍 世界设定管理
- 分类管理：世界观、地理位置、规则体系、文化背景
- 详细设定编辑和关联关系
- 设定间的关联管理
- 创作笔记功能

### ✍️ 章节编辑
- **大纲编辑**: 结构化章节规划
- **正文编辑**: Monaco编辑器提供专业编写体验
- **角色管理**: 添加和管理章节相关角色
- **设定引用**: 关联相关世界设定
- **插图标记**: 标记插图位置和描述
- 自动保存功能

### 🤖 AI助手面板
- **多模式支持**: 对话、完善、检查三种模式
- **智能对话**: 自然语言交互
- **快捷操作**: 一键完善、检查、生成
- **智能建议**: 基于内容的改进建议
- **一致性检查**: 自动发现内容矛盾

### 📊 进度统计
- 写作进度追踪（字数、章节、天数）
- 写作目标设定和进度监控
- 写作活跃度可视化
- 成就徽章系统

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本
```bash
npm run build
```

## 📝 使用说明

1. **项目管理**: 点击左侧"项目信息"创建或管理小说项目
2. **角色创建**: 在"角色库"中添加和完善角色信息
3. **世界设定**: 在"世界设定"中构建小说的世界观
4. **章节写作**: 在"章节列表"中创建章节并使用编辑器写作
5. **AI协助**: 使用右侧AI助手获取创作建议和检查内容
6. **进度跟踪**: 在"进度统计"中查看写作进展

## 🛠️ 开发指南

### 推荐IDE配置
- [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

### TypeScript支持
- 项目使用 `vue-tsc` 进行类型检查
- 编辑器需要 Volar 插件支持 `.vue` 文件的类型提示

### 自定义配置
参考 [Vite配置文档](https://vite.dev/config/)

## 🎯 下一步开发

- [ ] 集成后端API接口
- [ ] 实现AI服务集成
- [ ] 添加数据持久化
- [ ] 实现导出功能
- [ ] 优化移动端适配

## 📄 许可证

MIT License

---

**注意**: 这是前端演示版本，AI功能为模拟实现，需要集成实际的后端服务和AI接口。
