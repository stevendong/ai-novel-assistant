# AI续写快捷键调试指南

## 问题：快捷键没有触发AI续写

已在代码中添加详细的调试日志，帮助你快速定位问题。

## 调试步骤

### 1. 打开浏览器开发者工具

- **Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
- **Firefox**: 按 `F12` 或 `Ctrl+Shift+K` (Windows/Linux) / `Cmd+Option+K` (Mac)
- **Safari**: 先在偏好设置中启用开发者菜单，然后按 `Cmd+Option+I`

### 2. 切换到 Console 标签页

所有调试信息都会输出到控制台。

### 3. 刷新页面并观察初始化日志

打开章节编辑器后，应该看到以下日志：

```
🎯 TiptapEditor 组件已挂载
📋 Props 配置: {
  novelId: "xxx",
  chapterId: "xxx",
  enableAiSuggestion: true,
  editable: true
}

🚀 AISuggestion 扩展已加载
⚙️ 配置参数: {
  novelId: "xxx",
  chapterId: "xxx",
  enabled: true,
  autoTrigger: true,
  triggerDelay: 800,
  maxSuggestions: 3,
  minContextLength: 50,
  hotkey: "Mod-Enter"
}
```

**检查点 1**:
- ✅ `novelId` 和 `chapterId` 是否有值（不是空字符串）
- ✅ `enableAiSuggestion` 是否为 `true`
- ✅ `hotkey` 是否是你期望的快捷键

### 4. 输入一些文本（至少50个字符）

在编辑器中输入至少50个字符的文本，因为这是触发AI建议的最小上下文长度。

### 5. 按下快捷键 (Ctrl/Cmd+Enter)

按下快捷键后，应该看到以下日志序列：

#### 情况A：快捷键被正确捕获

```
🔥 AI快捷键被按下: Mod-Enter
📋 当前配置: {
  enabled: true,
  novelId: "xxx",
  chapterId: "xxx",
  minContextLength: 50
}
📝 当前文本长度: 120 最小要求: 50
📝 文本内容预览: [最后100个字符]
✅ 所有条件满足，触发AI建议
```

如果看到这些日志，说明快捷键工作正常，继续看步骤6。

#### 情况B：配置问题

如果看到以下任一错误：

```
❌ AI建议功能未启用
```
**解决方案**: 检查 `ChapterEditor.vue:213` 确保 `:enable-ai-suggestion="true"`

```
❌ 上下文太短，无法触发AI建议
```
**解决方案**: 在编辑器中输入更多文本（至少50个字符）

#### 情况C：快捷键完全没反应

如果按下快捷键后**没有任何日志输出**，可能的原因：

1. **快捷键被其他程序占用**
   - 尝试改为其他快捷键，如 `Mod-k` 或 `Alt-Space`
   - 修改位置：`TiptapEditor.vue:256`

2. **浏览器焦点不在编辑器上**
   - 先点击编辑器内容区域，确保焦点在编辑器内

3. **Tiptap扩展未正确加载**
   - 检查是否有JavaScript错误
   - 查看是否有 "🚀 AISuggestion 扩展已加载" 日志

### 6. 观察建议获取流程

如果快捷键触发成功，会看到以下日志序列：

```
🔍 检查是否允许显示建议
✅ allow检查通过

📡 开始获取AI建议... { query: "" }
📄 上下文信息: {
  contextLength: 120,
  cursorPosition: 120,
  query: ""
}

📞 fetchSuggestions 被调用
🔑 请求参数: {
  novelId: "xxx",
  chapterId: "xxx",
  contextLength: 120,
  cursorPosition: 120,
  maxSuggestions: 3
}

📝 发送给AI的上下文长度: 120
🚀 调用 aiService.generateSuggestions...
```

#### 成功情况

```
📥 收到AI响应: { suggestions: [...] }
✨ 转换后的建议: [...]
✅ 获取到建议: 3 条
🎨 开始渲染建议UI, 建议数量: 3
```

#### 失败情况

```
❌ 获取AI建议失败: Error: ...
```

**常见错误及解决方案**：

1. **网络错误 / API错误**
   ```
   Error: Network request failed
   ```
   - 检查服务器是否运行（`npm run dev` 在根目录）
   - 检查 `.env` 中的 `OPENAI_API_KEY` 是否配置

2. **novelId 或 chapterId 无效**
   ```
   Error: Novel not found
   ```
   - 检查是否在正确的章节编辑页面
   - 查看URL参数是否正确

### 7. 测试斜杠触发

在编辑器中输入 `/` 也应该触发建议：

```
🔍 检查是否允许显示建议
✅ allow检查通过
📡 开始获取AI建议...
```

## 常见问题排查清单

### ✅ 检查项 1: Props传递
- [ ] `novelId` 不为空
- [ ] `chapterId` 不为空
- [ ] `enableAiSuggestion` 为 `true`

### ✅ 检查项 2: 文本长度
- [ ] 编辑器中有至少50个字符的内容

### ✅ 检查项 3: 编辑器状态
- [ ] 编辑器可编辑（`editable: true`）
- [ ] 焦点在编辑器内

### ✅ 检查项 4: 服务器配置
- [ ] 后端服务器正在运行
- [ ] `.env` 配置了 `OPENAI_API_KEY`
- [ ] API端点可访问

### ✅ 检查项 5: 快捷键
- [ ] 快捷键没有被其他程序占用
- [ ] 使用正确的修饰键（Mac用Cmd，Windows/Linux用Ctrl）

## 修改快捷键

如果当前快捷键 `Ctrl/Cmd+Enter` 与其他功能冲突，可以修改：

**文件位置**: `client/src/components/chapter/TiptapEditor.vue:256`

```typescript
hotkey: 'Mod-k'  // 改为 Ctrl/Cmd+K
// 或
hotkey: 'Alt-Space'  // 改为 Alt+Space
// 或
hotkey: 'Mod-Shift-a'  // 改为 Ctrl/Cmd+Shift+A
```

记得同时更新提示文字（第180行）：
```vue
<span class="ai-text">输入 <kbd>/</kbd> 或按 <kbd>Ctrl/Cmd+K</kbd> 触发AI续写</span>
```

## 清除缓存

如果修改了代码但没有生效：

1. **清除浏览器缓存**:
   - Chrome: `Ctrl+Shift+Delete` → 选择"缓存的图片和文件"
   - 或者硬刷新: `Ctrl+Shift+R` (Windows/Linux) / `Cmd+Shift+R` (Mac)

2. **重启开发服务器**:
   ```bash
   # 在项目根目录
   npm run dev
   ```

## 移除调试日志

问题解决后，如果想移除调试日志（提升性能），可以：

1. **全局搜索并删除**:
   - 在 `aiSuggestion.ts` 中搜索 `console.log`
   - 删除所有调试相关的 console 语句

2. **或者注释掉**:
   ```typescript
   // console.log('🔥 AI快捷键被按下:', this.options.hotkey)
   ```

## 需要帮助？

如果以上步骤无法解决问题，请：

1. 复制完整的控制台日志
2. 截图相关配置
3. 说明具体的操作步骤和期望结果
4. 提供错误信息
