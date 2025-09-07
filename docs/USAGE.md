# AI小说创作协作工具 - 使用指南

## 🚀 快速开始

### 1. 安装依赖
```bash
# 安装根目录依赖（开发工具）
npm install

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 2. 配置环境
```bash
# 复制环境变量配置文件
cp server/.env.example server/.env

# 编辑 server/.env 文件，配置OpenAI API密钥（可选）
# OPENAI_API_KEY=your_api_key_here
```

### 3. 初始化数据库
```bash
# 在 server 目录下运行
cd server
npx prisma generate
npx prisma db push
```

### 4. 启动应用
```bash
# 方式1：使用并发启动（推荐）
npm run dev

# 方式2：分别启动
# 终端1 - 启动后端
cd server && npm run dev

# 终端2 - 启动前端  
cd client && npm run dev
```

### 5. 访问应用
- 前端界面：http://localhost:5173
- 后端API：http://localhost:3001
- API文档：http://localhost:3001/api/health

## 📖 功能使用指南

### 项目管理
1. **创建新项目**
   - 点击「新建项目」按钮
   - 填写项目标题、简介、类型
   - 选择内容分级（G、PG、PG-13、R、NC-17）
   - 点击「创建」完成

2. **项目概览**
   - 查看项目基本信息和统计数据
   - 最新章节和AI建议

### 角色管理
1. **创建角色**
   - 进入「角色管理」标签
   - 点击「新建角色」
   - 填写角色姓名、简介、性格特征、外貌描述

2. **AI完善角色**
   - 点击角色卡片上的「AI完善」按钮
   - 在右侧AI助手面板查看建议

### 世界设定
1. **创建设定**
   - 选择设定类型（世界观、地点、规则、文化）
   - 填写设定名称和描述

2. **分类管理**
   - 使用标签切换不同类型的设定
   - 锁定重要设定防止意外修改

### 章节编辑
1. **创建章节**
   - 填写章节标题和章节号
   - 编写章节大纲

2. **章节编辑器**
   - 大纲编辑：规划章节结构
   - 正文编辑：撰写具体内容
   - 实时保存：每30秒自动保存
   - 状态管理：规划中 → 创作中 → 审阅中 → 已完成

### AI助手功能
1. **智能对话**
   - 右侧AI助手面板进行对话
   - 获取创作建议和灵感

2. **快捷操作**
   - 完善角色：AI分析并建议角色发展
   - 扩展设定：AI帮助完善世界观
   - 生成大纲：AI协助创建章节结构
   - 一致性检查：检测角色、设定、时间线一致性

3. **内容分级控制**
   - AI会根据项目分级限制生成内容
   - 确保输出符合设定的内容标准

## 🔧 高级功能

### 导出功能
```bash
# API调用示例
# 导出EPUB格式
curl -X POST http://localhost:3001/api/export/epub/[novel_id]

# 导出TXT格式  
curl -X POST http://localhost:3001/api/export/txt/[novel_id]
```

### 数据库管理
```bash
# 查看数据库
cd server && npx prisma studio

# 重置数据库
npx prisma db push --reset
```

### 一致性检查
- 角色行为一致性验证
- 世界观设定逻辑检查
- 时间线连贯性分析
- 支持单章节和全书检查

## 🛠 开发说明

### 技术栈
- **后端**：Node.js + Express + Prisma + SQLite
- **前端**：Vue 3 + Quasar + Vite
- **AI服务**：OpenAI API（可配置）
- **数据库**：SQLite（本地文件）

### 项目结构
```
ai-novel-assistant/
├── server/              # 后端API
│   ├── prisma/         # 数据库配置
│   ├── routes/         # API路由
│   └── index.js        # 服务器入口
├── client/             # 前端应用
│   ├── src/
│   │   ├── components/ # 组件
│   │   ├── views/      # 页面
│   │   ├── stores/     # 状态管理
│   │   └── utils/      # 工具函数
│   └── vite.config.js  # 构建配置
└── design.md           # 设计文档
```

### API接口
- `GET /api/novels` - 获取小说列表
- `POST /api/novels` - 创建新小说
- `GET /api/characters/novel/:id` - 获取角色列表
- `POST /api/ai/chat` - AI对话
- `POST /api/ai/consistency/check` - 一致性检查

## ⚠️ 注意事项

1. **首次使用**：需要创建至少一个项目才能使用其他功能
2. **AI功能**：需要配置OpenAI API密钥才能使用AI相关功能
3. **数据备份**：重要数据请及时备份 `server/prisma/novels.db` 文件
4. **浏览器兼容**：建议使用现代浏览器（Chrome、Firefox、Safari）

## 🔮 未来功能规划

- [ ] 实时协作编辑
- [ ] 更多AI模型支持
- [ ] 云端数据同步
- [ ] 移动端应用
- [ ] 插件系统
- [ ] 更丰富的导出格式

## 🐛 问题反馈

如果遇到问题，请检查：
1. Node.js版本 >= 16
2. 端口3001和5173是否被占用
3. 数据库文件权限
4. 浏览器控制台错误信息

---

享受AI协作创作的乐趣！✨