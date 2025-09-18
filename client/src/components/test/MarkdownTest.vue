<template>
  <div class="markdown-test">
    <h2>Markdown渲染测试</h2>

    <div class="test-section">
      <h3>测试内容</h3>
      <a-button @click="switchContent" type="primary">切换测试内容</a-button>

      <div class="content-display">
        <MarkdownRenderer
          :content="currentContent"
          :enable-highlight="true"
          :enable-tables="true"
          :enable-task-lists="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue'

const contentIndex = ref(0)

const testContents = [
  // 基础markdown测试
  `# 基础Markdown测试

## 文本格式
这是**粗体文本**，这是*斜体文本*，这是~~删除线文本~~。

这是一个\`内联代码\`示例。

## 列表
- 列表项1
- 列表项2
  - 嵌套项1
  - 嵌套项2

### 有序列表
1. 第一项
2. 第二项
3. 第三项

## 引用
> 这是一个引用块
>
> 可以有多行内容

## 链接
[这是一个链接](https://www.example.com)`,

  // 代码块测试
  `# 代码块测试

## JavaScript代码
\`\`\`javascript
function createNovel(title, genre) {
  return {
    title,
    genre,
    chapters: [],
    characters: [],

    addChapter(chapterTitle, content) {
      this.chapters.push({
        title: chapterTitle,
        content,
        wordCount: content.split(' ').length
      })
    },

    addCharacter(name, description) {
      this.characters.push({ name, description })
    }
  }
}

const myNovel = createNovel("AI小说助手", "科幻")
myNovel.addChapter("第一章", "在遥远的未来...")
\`\`\`

## Python代码
\`\`\`python
import openai
from typing import List, Dict

class AINovelAssistant:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)

    def generate_character(self, prompt: str) -> Dict[str, str]:
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个专业的角色设计师"},
                {"role": "user", "content": prompt}
            ]
        )
        return {"content": response.choices[0].message.content}
\`\`\``,

  // 表格和任务列表测试
  `# 表格和任务列表测试

## 小说角色表格
| 角色名 | 性别 | 年龄 | 职业 | 性格特点 |
|--------|------|------|------|----------|
| 李明 | 男 | 25 | 程序员 | 内向、聪明、执着 |
| 王小红 | 女 | 23 | 设计师 | 外向、创意、热情 |
| 张教授 | 男 | 45 | 教授 | 博学、严谨、神秘 |

## 写作任务清单
- [x] 完成角色设定
- [x] 设计世界观
- [ ] 编写第一章大纲
- [ ] 撰写开场场景
- [ ] 进行一致性检查
- [ ] 修改和润色

## 章节进度
- [x] 第一章：引子 (已完成)
- [x] 第二章：初遇 (已完成)
- [ ] 第三章：冲突 (进行中)
- [ ] 第四章：高潮 (待开始)
- [ ] 第五章：结局 (待开始)`,

  // 复杂混合内容测试
  `# 🎭 AI小说创作指南

## 📖 概述
这是一个**全面的小说创作指南**，旨在帮助作者利用AI技术提升创作效率。

### 🎯 核心功能

#### 1. 角色生成
使用AI生成丰富的角色背景：

\`\`\`prompt
请为我创建一个奇幻小说中的法师角色，包含以下要素：
- 基本信息（姓名、年龄、外貌）
- 魔法专长和能力
- 性格特点和缺陷
- 背景故事
\`\`\`

> **提示**: 记住给角色添加缺陷，这让他们更真实

#### 2. 世界观构建
| 要素 | 重要性 | 说明 |
|------|--------|------|
| 地理环境 | ⭐⭐⭐⭐⭐ | 影响故事发展的基础 |
| 政治体系 | ⭐⭐⭐⭐ | 产生冲突的源泉 |
| 魔法系统 | ⭐⭐⭐⭐⭐ | 奇幻小说的核心 |
| 历史背景 | ⭐⭐⭐ | 增加深度和真实感 |

### ✅ 创作检查清单
- [x] 确定小说类型和目标读者
- [x] 设计主要角色（至少3个）
- [ ] 构建完整的世界观设定
- [ ] 制定详细的情节大纲
- [ ] 完成第一章草稿
- [ ] 进行一致性检查
- [ ] 语言润色和修改

---

## 💡 高级技巧

### 对话写作
好的对话应该：
1. **推动情节发展**
2. **展现角色性格**
3. **增加戏剧张力**

示例：
\`\`\`
"你真的相信魔法能解决一切问题吗？"艾莉丝质疑道。

马库斯摇了摇头，"魔法只是工具，真正重要的是使用它的人。"

"那么，"艾莉丝的眼中闪过一丝危险的光芒，"如果这个人本身就是问题呢？"
\`\`\`

### 场景描写要点
- 使用**五感描写**（视觉、听觉、嗅觉、触觉、味觉）
- 适度使用*比喻和象征*
- 控制描写篇幅，避免~~过度冗长~~

> **记住**: 好的描写像调料，适量即可，过多会掩盖故事本身的味道。`
]

const currentContent = ref(testContents[0])

const switchContent = () => {
  contentIndex.value = (contentIndex.value + 1) % testContents.length
  currentContent.value = testContents[contentIndex.value]
}
</script>

<style scoped>
.markdown-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-top: 20px;
}

.content-display {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-bg-container);
}
</style>