<template>
  <div class="h-screen overflow-hidden flex flex-col" v-if="chapter">
    <!-- Chapter Header -->
    <div class="theme-bg-container border-b theme-border p-4 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <a-avatar :size="40" class="theme-chapter-avatar">
            {{ chapter.chapterNumber }}
          </a-avatar>
          <div>
            <div class="flex items-center space-x-3 mb-1">
              <h1 class="text-xl font-bold theme-text-primary">
                第{{ chapter.chapterNumber }}章：{{ chapter.title }}
              </h1>
              <!-- 章节导航控件 -->
              <div class="flex items-center space-x-1">
                <a-button
                  size="small"
                  :disabled="!previousChapter"
                  @click="goToPreviousChapter"
                  title="上一章 (Ctrl+Left)"
                >
                  <template #icon>
                    <LeftOutlined />
                  </template>
                </a-button>
                <a-dropdown v-model:open="showChapterList" trigger="click">
                  <a-button size="small" :loading="loadingChapters">
                    <template #icon>
                      <MenuOutlined />
                    </template>
                    {{ currentChapterIndex + 1 }}/{{ totalChapters }}
                  </a-button>
                  <template #overlay>
                    <a-menu class="chapter-list-menu" style="max-height: 400px; overflow-y: auto;">
                      <a-menu-item
                        v-for="chap in allChapters"
                        :key="chap.id"
                        @click="switchToChapter(chap.id)"
                        :class="{ 'active-chapter': chap.id === chapter.id }"
                      >
                        <div class="flex items-center justify-between">
                          <span>第{{ chap.chapterNumber }}章：{{ chap.title }}</span>
                          <a-tag
                            v-if="chap.id === chapter.id"
                            color="blue"
                            size="small"
                            class="ml-2"
                          >
                            当前
                          </a-tag>
                        </div>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
                <a-button
                  size="small"
                  :disabled="!nextChapter"
                  @click="goToNextChapter"
                  title="下一章 (Ctrl+Right)"
                >
                  <template #icon>
                    <RightOutlined />
                  </template>
                </a-button>
              </div>
            </div>
            <div class="flex items-center space-x-4 text-sm theme-text-primary">
              <span>状态：{{ statusText }}</span>
              <span>字数：{{ wordCount }}</span>
              <span class="flex items-center space-x-2">
                <span>目标：</span>
                <a-input-number
                  v-if="isEditingTargetWords"
                  v-model:value="editingTargetWords"
                  :min="100"
                  :max="20000"
                  :step="100"
                  size="small"
                  style="width: 80px"
                  @blur="saveTargetWords"
                  @press-enter="saveTargetWords"
                />
                <span
                  v-else
                  class="cursor-pointer hover:text-blue-500 underline"
                  @click="startEditTargetWords"
                  title="点击编辑目标字数"
                >
                  {{ targetWordCount }}字
                </span>
              </span>
              <span>更新：{{ formatDate(chapter.updatedAt) }}</span>
              <span v-if="hasUnsavedChanges" class="theme-warning-text">● 有未保存的更改</span>
            </div>
          </div>
        </div>

        <a-space>
          <a-button @click="requestAIOutline" :loading="loading">
            <template #icon>
              <RobotOutlined />
            </template>
            AI大纲
          </a-button>
          <a-button @click="runConsistencyCheck" :loading="loading">
            <template #icon>
              <CheckCircleOutlined />
            </template>
            一致性检查
          </a-button>
          <a-button
            type="primary"
            @click="handleSaveChapter"
            :loading="saving"
            :disabled="!hasUnsavedChanges"
            title="保存章节 (Ctrl+S)"
          >
            <template #icon>
              <SaveOutlined />
            </template>
            保存
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="theme-bg-container border-b theme-border flex-shrink-0">
      <a-tabs v-model:activeKey="activeTab" type="card" class="px-4">
        <a-tab-pane key="outline" tab="大纲">
          <template #tab>
            <span class="flex items-center" title="大纲 (Ctrl+1)">
              <FileTextOutlined class="mr-2" />
              大纲
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="content" tab="正文">
          <template #tab>
            <span class="flex items-center" title="正文 (Ctrl+2)">
              <EditOutlined class="mr-2" />
              正文
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="workflow" tab="状态流转">
          <template #tab>
            <span class="flex items-center" title="状态流转 (Ctrl+3)">
              <BranchesOutlined class="mr-2" />
              状态流转
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="consistency" tab="一致性检查">
          <template #tab>
            <span class="flex items-center" title="一致性检查">
              <CheckCircleOutlined class="mr-2" />
              一致性检查
              <a-badge
                v-if="consistencyIssues.length > 0"
                :count="unresolvedIssuesCount"
                :number-style="{ backgroundColor: getSeverityColor(highestSeverity) }"
                class="ml-1"
              />
            </span>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <div class="w-80 border-r theme-border overflow-y-auto theme-bg-container">
        <div class="p-4">
          <h3 class="text-lg font-medium theme-text-primary mb-4">章节信息</h3>

          <!-- 章节角色 -->
          <a-collapse :bordered="false" class="mb-4" default-active-key="characters">
            <a-collapse-panel key="characters" header="章节角色">
              <div class="space-y-2">
                <div
                  v-for="chapterChar in chapter.characters"
                  :key="chapterChar.characterId"
                  class="p-2 border theme-border rounded"
                >
                  <div class="flex items-center space-x-2 mb-1">
                    <a-avatar :size="24">{{ chapterChar.character.name.charAt(0) }}</a-avatar>
                    <span class="text-sm font-medium theme-text-primary">{{ chapterChar.character.name }}</span>
                  </div>
                  <a-tag :color="getRoleColor(chapterChar.role)" size="small">
                    {{ getRoleText(chapterChar.role) }}
                  </a-tag>
                </div>
                <a-button type="dashed" block @click="showAddCharacterModal = true" size="small">
                  <PlusOutlined />
                  添加角色
                </a-button>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <!-- 相关设定 -->
          <a-collapse :bordered="false" class="mb-4" default-active-key="settings">
            <a-collapse-panel key="settings" header="相关设定">
              <div class="space-y-2">
                <div
                  v-for="chapterSetting in chapter.settings"
                  :key="chapterSetting.settingId"
                  class="p-2 border theme-border rounded"
                >
                  <a-tag :color="getSettingTypeColor(chapterSetting.setting.type)" size="small">
                    {{ getSettingTypeText(chapterSetting.setting.type) }}
                  </a-tag>
                  <div class="text-sm font-medium theme-text-primary mt-1">{{ chapterSetting.setting.name }}</div>
                </div>
                <a-button type="dashed" block @click="showAddSettingModal = true" size="small">
                  <PlusOutlined />
                  添加设定
                </a-button>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <!-- 情节要点 -->
          <a-collapse :bordered="false" default-active-key="plotPoints">
            <a-collapse-panel key="plotPoints" header="情节要点">
              <div class="space-y-2">
                <div
                  v-for="(point, index) in chapter.plotPoints"
                  :key="index"
                  class="p-2 border theme-border rounded"
                >
                  <div class="flex items-center justify-between mb-1">
                    <a-tag size="small">{{ point.type }}</a-tag>
                    <a-button type="text" danger size="small" @click="removePlotPoint(index)">
                      <DeleteOutlined />
                    </a-button>
                  </div>
                  <div class="text-xs theme-text-primary">{{ point.description }}</div>
                </div>
                <a-button type="dashed" block @click="handleAddPlotPoint" size="small">
                  <PlusOutlined />
                  添加要点
                </a-button>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>

      <!-- Main Editor Area -->
      <div class="flex-1 overflow-y-auto theme-bg-container">
        <!-- Outline Tab -->
        <div v-if="activeTab === 'outline'" class="p-6">
          <div class="mb-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-medium theme-text-primary">章节大纲</h3>
              <div class="space-x-2">
                <a-button size="small" @click="applyOutlineTemplate">
                  <template #icon>
                    <FileTextOutlined />
                  </template>
                  模板
                </a-button>
              </div>
            </div>
            <a-textarea
              v-model:value="outlineMarkdown"
              :rows="20"
              placeholder="在这里编写章节内容大纲...&#10;&#10;支持Markdown语法，例如：&#10;## 章节开头&#10;- 时间地点设定&#10;- 人物状态描述&#10;&#10;## 内容发展&#10;1. **开端** - 情况引入&#10;2. **发展** - 矛盾展开&#10;3. **转折** - 意外变化&#10;4. **结尾** - 解决冲突"
              class="font-mono"
            />
          </div>
        </div>

        <!-- Content Tab -->
        <div v-else-if="activeTab === 'content'" class="h-full flex flex-col" :class="{ 'fullscreen-content': isFullscreen }">
          <!-- 正文工具栏 -->
          <div class="content-toolbar theme-bg-container border-b theme-border p-3 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-sm theme-text-primary">正文编辑</span>
                <a-divider type="vertical" />
                <span class="text-xs theme-text-secondary">
                  字数：{{ contentWordCount }} | 目标：{{ targetWordCount || 2000 }}字
                </span>
              </div>

              <a-space>
                <a-dropdown>
                  <template #overlay>
                    <a-menu @click="handleAIGenerateLength">
                      <a-menu-item key="500">
                        <FileTextOutlined />
                        短篇续写 (~500字)
                      </a-menu-item>
                      <a-menu-item key="1000">
                        <BookOutlined />
                        中篇续写 (~1000字)
                      </a-menu-item>
                      <a-menu-item key="2000">
                        <ReadOutlined />
                        标准章节 (~2000字)
                      </a-menu-item>
                      <a-menu-item key="3000">
                        <ContainerOutlined />
                        长篇续写 (~3000字)
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="custom">
                        <SettingOutlined />
                        自定义长度
                      </a-menu-item>
                    </a-menu>
                  </template>
                  <a-button :loading="generatingContent" type="primary">
                    <template #icon>
                      <RobotOutlined />
                    </template>
                    AI生成正文
                    <DownOutlined />
                  </a-button>
                </a-dropdown>

                <a-button
                  @click="clearContent"
                  :disabled="!contentText"
                  title="清空内容"
                >
                  <template #icon>
                    <ClearOutlined />
                  </template>
                  清空
                </a-button>
                <a-button
                  @click="toggleFullscreen"
                  :title="isFullscreen ? '退出全屏' : '进入全屏'"
                >
                  <template #icon>
                    <FullscreenExitOutlined v-if="isFullscreen" />
                    <FullscreenOutlined v-else />
                  </template>
                  {{ isFullscreen ? '退出全屏' : '全屏' }}
                </a-button>
              </a-space>
            </div>
          </div>

          <!-- 编辑器区域 -->
          <div class="flex-1 overflow-hidden">
            <TiptapEditor
              ref="contentEditor"
              v-model="contentText"
              :show-toolbar="true"
              :show-status-bar="true"
              :auto-save="true"
              placeholder="在这里开始你的小说创作...支持快捷键操作，专注于写作本身。"
              @change="handleContentChange"
            />
          </div>
        </div>

        <!-- Workflow Tab -->
        <div v-else-if="activeTab === 'workflow'" class="p-6">
          <StatusFlowControl
            entity-type="chapter"
            :entity-id="chapter.id"
            :current-status="chapter.status"
            :novel-id="chapter.novelId"
            :show-batch-actions="false"
            :show-manual-change="true"
            @status-changed="handleStatusChanged"
          />
        </div>

        <!-- Consistency Check Tab -->
        <div v-else-if="activeTab === 'consistency'" class="p-6">
          <div class="max-w-6xl mx-auto">
            <!-- 检查操作栏 -->
            <div class="theme-bg-container border theme-border rounded-lg p-4 mb-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium theme-text-primary">一致性检查</h3>
                <a-space>
                  <a-button
                    type="primary"
                    @click="performConsistencyCheck"
                    :loading="consistencyChecking"
                  >
                    <CheckCircleOutlined />
                    重新检查
                  </a-button>
                  <a-button
                    v-if="unresolvedIssuesCount > 0"
                    @click="batchResolveIssues"
                    :loading="batchResolving"
                  >
                    批量解决
                  </a-button>
                </a-space>
              </div>

              <div class="text-center p-3 theme-bg-elevated rounded-lg">
                <div class="text-2xl font-bold" :style="{ color: healthGrade.color }">
                  {{ healthScore }}
                </div>
                <div class="text-sm theme-text-primary">健康度评分</div>
                <div class="text-xs mt-1" :style="{ color: healthGrade.color }">
                  {{ healthGrade.grade }}
                </div>
              </div>
              <!-- 健康度仪表板 -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div class="text-center p-4 consistency-stat-high rounded-lg">
                  <div class="text-2xl font-bold consistency-high-text">{{ severityCounts.high }}</div>
                  <div class="text-sm theme-text-primary">严重问题</div>
                </div>
                <div class="text-center p-4 consistency-stat-medium rounded-lg">
                  <div class="text-2xl font-bold consistency-medium-text">{{ severityCounts.medium }}</div>
                  <div class="text-sm theme-text-primary">中等问题</div>
                </div>
                <div class="text-center p-4 consistency-stat-low rounded-lg">
                  <div class="text-2xl font-bold consistency-low-text">{{ severityCounts.low }}</div>
                  <div class="text-sm theme-text-primary">轻微问题</div>
                </div>
              </div>

              <!-- 筛选器 -->
              <div class="flex items-center space-x-4">
                <a-select
                  v-model:value="issueFilters.type"
                  placeholder="按类型筛选"
                  style="width: 150px"
                  allow-clear
                >
                  <a-select-option value="character">角色一致性</a-select-option>
                  <a-select-option value="setting">设定一致性</a-select-option>
                  <a-select-option value="timeline">时间线一致性</a-select-option>
                  <a-select-option value="logic">逻辑一致性</a-select-option>
                </a-select>
                <a-select
                  v-model:value="issueFilters.severity"
                  placeholder="按严重程度筛选"
                  style="width: 150px"
                  allow-clear
                >
                  <a-select-option value="high">严重</a-select-option>
                  <a-select-option value="medium">中等</a-select-option>
                  <a-select-option value="low">轻微</a-select-option>
                </a-select>
                <a-select
                  v-model:value="issueFilters.resolved"
                  placeholder="按状态筛选"
                  style="width: 150px"
                  allow-clear
                >
                  <a-select-option :value="false">未解决</a-select-option>
                  <a-select-option :value="true">已解决</a-select-option>
                </a-select>
              </div>
            </div>

            <!-- 问题列表 -->
            <div class="space-y-4">
              <div
                v-for="issue in filteredIssues"
                :key="issue.id"
                class="theme-bg-container border rounded-lg p-4"
                :class="{
                  'border-red-200 bg-red-50': issue.severity === 'high' && !issue.resolved,
                  'border-orange-200 bg-orange-50': issue.severity === 'medium' && !issue.resolved,
                  'border-yellow-200 bg-yellow-50': issue.severity === 'low' && !issue.resolved,
                  'theme-border theme-bg-elevated': issue.resolved
                }"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <span class="text-lg">{{ getTypeIcon(issue.type) }}</span>
                      <a-tag :color="getSeverityColor(issue.severity)">
                        {{ getSeverityLabel(issue.severity) }}
                      </a-tag>
                      <a-tag>{{ getTypeLabel(issue.type) }}</a-tag>
                      <span v-if="issue.resolved" class="text-sm theme-text-primary">已解决</span>
                    </div>
                    <p class="theme-text-primary mb-2">{{ issue.issue }}</p>
                    <div class="text-xs theme-text-primary">
                      发现时间：{{ formatDate(issue.createdAt) }}
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <a-button
                      size="small"
                      @click="viewIssueDetails(issue)"
                    >
                      <EyeOutlined />
                      详情
                    </a-button>
                    <a-button
                      size="small"
                      :type="issue.resolved ? 'default' : 'primary'"
                      @click="toggleIssueResolved(issue)"
                      :loading="resolvingIssues.has(issue.id)"
                    >
                      {{ issue.resolved ? '标记未解决' : '标记已解决' }}
                    </a-button>
                    <a-button
                      size="small"
                      danger
                      @click="deleteIssue(issue)"
                      :loading="deletingIssues.has(issue.id)"
                    >
                      <DeleteOutlined />
                    </a-button>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="filteredIssues.length === 0" class="text-center py-12">
                <CheckCircleOutlined style="font-size: 48px; color: #52c41a; margin-bottom: 16px;" />
                <h4 class="text-lg font-medium theme-text-primary mb-2">
                  {{ consistencyIssues.length === 0 ? '暂无一致性问题' : '没有符合筛选条件的问题' }}
                </h4>
                <p class="theme-text-primary">
                  {{ consistencyIssues.length === 0 ? '点击"重新检查"按钮开始检查章节一致性' : '尝试调整筛选条件' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <div class="w-80 border-l theme-border overflow-y-auto theme-bg-container">
        <div class="p-4">
          <h3 class="text-lg font-medium theme-text-primary mb-4">预览与统计</h3>

          <!-- 大纲预览 -->
          <a-collapse :bordered="false" class="mb-4" default-active-key="outlinePreview">
            <a-collapse-panel key="outlinePreview" header="大纲预览">
              <div class="markdown-novel text-sm" v-html="outlineRenderedHtml"></div>
              <div class="mt-3 p-2 theme-bg-elevated rounded text-xs">
                <div class="space-y-1">
                  <div>字数：{{ outlineWordCount }}</div>
                  <div>段落：{{ outlineParagraphCount }}</div>
                  <div v-if="outlineHeadings.length > 0">标题：{{ outlineHeadings.length }}</div>
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <!-- 正文统计 -->
          <a-collapse :bordered="false" class="mb-4" default-active-key="contentStats">
            <a-collapse-panel key="contentStats" header="正文统计">
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-sm theme-text-primary">当前字数</span>
                  <span class="font-medium">{{ contentWordCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm theme-text-primary">目标字数</span>
                  <span class="font-medium">{{ targetWordCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm theme-text-primary">完成度</span>
                  <span class="font-medium">{{ Math.min(100, Math.round((contentWordCount / targetWordCount) * 100)) }}%</span>
                </div>
                <div class="mt-2">
                  <a-progress
                    :percent="Math.min(100, Math.round((contentWordCount / targetWordCount) * 100))"
                    :show-info="false"
                    size="small"
                  />
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <!-- 一致性检查 -->
          <a-collapse :bordered="false" default-active-key="consistency">
            <a-collapse-panel key="consistency" header="一致性检查">
              <div class="space-y-2">
                <div class="text-center p-2 theme-bg-elevated rounded">
                  <div class="text-lg font-bold" :style="{ color: healthGrade.color }">
                    {{ healthScore }}
                  </div>
                  <div class="text-xs theme-text-primary">健康度评分</div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div class="p-2 rounded consistency-stat-high">
                    <div class="text-sm font-bold consistency-high-text">{{ severityCounts.high }}</div>
                    <div class="text-xs">严重</div>
                  </div>
                  <div class="p-2 rounded consistency-stat-medium">
                    <div class="text-sm font-bold consistency-medium-text">{{ severityCounts.medium }}</div>
                    <div class="text-xs">中等</div>
                  </div>
                  <div class="p-2 rounded consistency-stat-low">
                    <div class="text-sm font-bold consistency-low-text">{{ severityCounts.low }}</div>
                    <div class="text-xs">轻微</div>
                  </div>
                </div>
                <a-button block size="small" @click="performConsistencyCheck" :loading="consistencyChecking">
                  <CheckCircleOutlined />
                  重新检查
                </a-button>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <a-modal v-model:open="showAddCharacterModal" title="添加角色到章节" @ok="addCharacterToChapter">
      <a-select
        v-model:value="selectedCharacterId"
        placeholder="选择角色"
        style="width: 100%"
        show-search
        :filter-option="filterCharacter"
      >
        <a-select-option
          v-for="character in filteredAvailableCharacters"
          :key="character.id"
          :value="character.id"
        >
          {{ character.name }} - {{ character.description }}
        </a-select-option>
      </a-select>
    </a-modal>

    <a-modal v-model:open="showAddSettingModal" title="添加设定到章节" @ok="addSettingToChapter">
      <a-select
        v-model:value="selectedSettingId"
        placeholder="选择设定"
        style="width: 100%"
        show-search
        :filter-option="filterSetting"
      >
        <a-select-option
          v-for="setting in filteredAvailableSettings"
          :key="setting.id"
          :value="setting.id"
        >
          {{ setting.name }} - {{ setting.description }}
        </a-select-option>
      </a-select>
    </a-modal>

    <!-- 问题详情模态框 -->
    <a-modal
      v-model:open="showIssueDetailModal"
      title="一致性问题详情"
      width="800px"
      :footer="null"
    >
      <div v-if="selectedIssue" class="space-y-4">
        <!-- 问题基本信息 -->
        <div class="p-4 theme-bg-elevated rounded-lg">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-lg">{{ getTypeIcon(selectedIssue.type) }}</span>
            <a-tag :color="getSeverityColor(selectedIssue.severity)">
              {{ getSeverityLabel(selectedIssue.severity) }}
            </a-tag>
            <a-tag>{{ getTypeLabel(selectedIssue.type) }}</a-tag>
            <span v-if="selectedIssue.resolved" class="text-sm text-green-600">已解决</span>
          </div>
          <h4 class="font-medium theme-text-primary mb-2">问题描述</h4>
          <p class="theme-text-primary">{{ selectedIssue.issue }}</p>
          <div class="mt-2 text-xs theme-text-primary">
            发现时间：{{ formatDate(selectedIssue.createdAt) }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-between">
          <a-space>
            <a-button
              :type="selectedIssue.resolved ? 'default' : 'primary'"
              @click="toggleIssueResolved(selectedIssue)"
              :loading="resolvingIssues.has(selectedIssue.id)"
            >
              {{ selectedIssue.resolved ? '标记未解决' : '标记已解决' }}
            </a-button>
            <a-button
              danger
              @click="deleteIssue(selectedIssue)"
              :loading="deletingIssues.has(selectedIssue.id)"
            >
              删除问题
            </a-button>
          </a-space>
          <a-button @click="showIssueDetailModal = false">
            关闭
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 自定义长度模态框 -->
    <a-modal
      v-model:open="showCustomLengthModal"
      title="自定义生成长度"
      @ok="handleCustomLengthSubmit"
      @cancel="showCustomLengthModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium theme-text-primary mb-2">
            目标字数
          </label>
          <a-input-number
            v-model:value="customLength"
            :min="100"
            :max="10000"
            :step="100"
            style="width: 100%"
            placeholder="请输入要生成的字数"
          />
          <div class="text-xs theme-text-secondary mt-1">
            建议范围：100-10000字
            <span v-if="contentWordCount > 0" class="ml-2">
              • 当前：{{ contentWordCount }}字 / 目标：{{ targetWordCount }}字
            </span>
          </div>
        </div>

        <div class="theme-bg-elevated p-3 rounded">
          <div class="text-sm theme-text-primary mb-2">快速设置：</div>
          <div class="grid grid-cols-2 gap-2 mb-2">
            <a-button size="small" @click="customLength = 500" class="text-xs">
              短篇 (500字)
            </a-button>
            <a-button size="small" @click="customLength = 1000" class="text-xs">
              中篇 (1000字)
            </a-button>
            <a-button size="small" @click="customLength = 2000" class="text-xs">
              标准 (2000字)
            </a-button>
            <a-button size="small" @click="customLength = 3000" class="text-xs">
              长篇 (3000字)
            </a-button>
          </div>
          <a-button
            size="small"
            type="primary"
            @click="customLength = suggestCustomLength"
            class="text-xs w-full"
            v-if="contentWordCount > 0 && targetWordCount > contentWordCount"
          >
            智能建议 ({{ suggestCustomLength }}字)
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, h } from 'vue'
import { useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  RobotOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  FileTextOutlined,
  EditOutlined,
  TeamOutlined,
  GlobalOutlined,
  PictureOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  BranchesOutlined,
  SettingOutlined,
  BookOutlined,
  ReadOutlined,
  ContainerOutlined,
  DownOutlined,
  ClearOutlined,
  PlusSquareOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  LeftOutlined,
  RightOutlined,
  MenuOutlined
} from '@ant-design/icons-vue'
import { useChapter } from '@/composables/useChapter'
import { useMarkdown } from '@/composables/useMarkdown'
import { chapterService } from '@/services/chapterService'
import { characterService } from '@/services/characterService'
import { settingService } from '@/services/settingService'
import { consistencyService } from '@/services/consistencyService'
import { aiService } from '@/services/aiService'
import { countValidWords } from '@/utils/textUtils'
import { useProjectStore } from '@/stores/project'
import StatusFlowControl from '@/components/workflow/StatusFlowControl.vue'
import TiptapEditor from './TiptapEditor.vue'
import type { Character, WorldSetting, PlotPoint, Illustration, ConsistencyCheck } from '@/types'
import '@/assets/markdown-novel.css'

interface Props {
  chapterId?: string
}

const props = defineProps<Props>()
const route = useRoute()

// 项目store
const projectStore = useProjectStore()

// 获取章节ID - 优先使用props，然后是路由参数
const chapterId = computed(() => props.chapterId || route.params.id as string)

// 使用章节组合函数
const {
  chapter,
  loading,
  saving,
  error,
  hasUnsavedChanges,
  wordCount,
  statusText,
  loadChapter,
  saveChapter,
  updateChapter,
  addPlotPoint,
  removePlotPoint,
  updatePlotPoint,
  addIllustration,
  removeIllustration,
  updateIllustration,
  checkConsistency,
  formatDate
} = useChapter()

const activeTab = ref('outline')

// Markdown 大纲功能
const {
  markdownText: outlineMarkdown,
  renderedHtml: outlineRenderedHtml,
  wordCount: outlineWordCount,
  paragraphCount: outlineParagraphCount,
  headings: outlineHeadings,
  setMarkdown: setOutlineMarkdown,
  applyTemplate
} = useMarkdown()

const isOutlinePreviewMode = ref(false)

// 正文编辑器内容
const contentText = ref('')
const contentEditor = ref()
const generatingContent = ref(false)

// 自定义长度输入相关状态
const showCustomLengthModal = ref(false)
const customLength = ref(2000)

// 全屏状态
const isFullscreen = ref(false)

// 模态框状态
const showAddCharacterModal = ref(false)
const showAddSettingModal = ref(false)
const selectedCharacterId = ref<string>()
const selectedSettingId = ref<string>()

// 可用角色和设定数据
const availableCharacters = ref<Character[]>([])
const availableSettings = ref<WorldSetting[]>([])

// 章节导航相关
const allChapters = ref<Chapter[]>([])
const loadingChapters = ref(false)
const showChapterList = ref(false)

// 目标字数编辑相关
const isEditingTargetWords = ref(false)
const editingTargetWords = ref<number>(2000)

// 一致性检查相关数据
const consistencyIssues = ref<ConsistencyCheck[]>([])
const consistencyChecking = ref(false)
const batchResolving = ref(false)
const resolvingIssues = ref(new Set<string>())
const deletingIssues = ref(new Set<string>())
const selectedIssue = ref<ConsistencyCheck | null>(null)
const showIssueDetailModal = ref(false)

// 筛选器
const issueFilters = ref({
  type: undefined as 'character' | 'setting' | 'timeline' | 'logic' | undefined,
  severity: undefined as 'low' | 'medium' | 'high' | undefined,
  resolved: undefined as boolean | undefined
})

// 加载可用角色和设定
const loadAvailableData = async () => {
  if (!chapter.value) return

  try {
    const [characters, settings] = await Promise.all([
      characterService.getCharactersByNovel(chapter.value.novelId),
      settingService.getByNovelId(chapter.value.novelId)
    ])

    availableCharacters.value = characters
    availableSettings.value = settings
  } catch (err) {
    console.error('Error loading available data:', err)
  }
}

// 加载所有章节
const loadAllChapters = async () => {
  if (!chapter.value) return

  try {
    loadingChapters.value = true
    const chapters = await chapterService.getChaptersByNovel(chapter.value.novelId)
    allChapters.value = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
  } catch (err) {
    console.error('Error loading chapters:', err)
  } finally {
    loadingChapters.value = false
  }
}

// 计算当前章节位置信息
const currentChapterIndex = computed(() => {
  if (!chapter.value) return -1
  return allChapters.value.findIndex(c => c.id === chapter.value!.id)
})

const previousChapter = computed(() => {
  if (currentChapterIndex.value <= 0) return null
  return allChapters.value[currentChapterIndex.value - 1]
})

const nextChapter = computed(() => {
  if (currentChapterIndex.value === -1 || currentChapterIndex.value >= allChapters.value.length - 1) return null
  return allChapters.value[currentChapterIndex.value + 1]
})

const totalChapters = computed(() => allChapters.value.length)

// 切换到指定章节
const switchToChapter = async (chapterId: string) => {
  if (!chapterId || chapterId === chapter.value?.id) return

  // 检查是否有未保存的更改
  if (hasUnsavedChanges.value) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '有未保存的更改',
        content: '当前章节有未保存的更改，是否先保存？',
        okText: '保存并切换',
        cancelText: '放弃更改',
        onOk: async () => {
          await handleSaveChapter()
          resolve(true)
        },
        onCancel: () => {
          resolve(true)
        }
      })
    })
    if (!confirmed) return
  }

  // 加载新章节
  await loadChapter(chapterId)

  // 关闭章节列表
  showChapterList.value = false

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 切换到上一章
const goToPreviousChapter = async () => {
  if (previousChapter.value) {
    await switchToChapter(previousChapter.value.id)
  }
}

// 切换到下一章
const goToNextChapter = async () => {
  if (nextChapter.value) {
    await switchToChapter(nextChapter.value.id)
  }
}

// 一致性检查计算属性
const filteredIssues = computed(() => {
  let filtered = consistencyIssues.value

  if (issueFilters.value.type) {
    filtered = filtered.filter(issue => issue.type === issueFilters.value.type)
  }

  if (issueFilters.value.severity) {
    filtered = filtered.filter(issue => issue.severity === issueFilters.value.severity)
  }

  if (issueFilters.value.resolved !== undefined) {
    filtered = filtered.filter(issue => issue.resolved === issueFilters.value.resolved)
  }

  return filtered.sort((a, b) => {
    // 按严重程度排序：high > medium > low
    const severityOrder = { high: 3, medium: 2, low: 1 }
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
    if (severityDiff !== 0) return severityDiff

    // 按解决状态排序：未解决优先
    if (a.resolved !== b.resolved) {
      return a.resolved ? 1 : -1
    }

    // 按创建时间排序：最新优先
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const unresolvedIssuesCount = computed(() => {
  return consistencyIssues.value.filter(issue => !issue.resolved).length
})

const severityCounts = computed(() => {
  const counts = { high: 0, medium: 0, low: 0 }
  consistencyIssues.value.forEach(issue => {
    if (!issue.resolved) {
      counts[issue.severity]++
    }
  })
  return counts
})

const highestSeverity = computed(() => {
  const unresolvedIssues = consistencyIssues.value.filter(issue => !issue.resolved)
  if (unresolvedIssues.some(issue => issue.severity === 'high')) return 'high'
  if (unresolvedIssues.some(issue => issue.severity === 'medium')) return 'medium'
  if (unresolvedIssues.some(issue => issue.severity === 'low')) return 'low'
  return 'low'
})

const healthScore = computed(() => {
  return consistencyService.calculateHealthScore(consistencyIssues.value)
})

const healthGrade = computed(() => {
  return consistencyService.getHealthGrade(healthScore.value)
})

// 正文字数统计
const contentWordCount = computed(() => {
  if (!contentText.value) return 0
  // 使用优化后的字数统计，忽略空格、换行等无意义字符
  return countValidWords(contentText.value, {
    removeMarkdown: true,
    removeHtml: true
  })
})

const targetWordCount = computed(() => {
  // 优先使用章节自己的目标字数
  if (chapter.value?.targetWordCount) {
    return chapter.value.targetWordCount
  }

  // 如果章节没有设置目标字数，尝试从小说总字数计算
  const currentProject = projectStore.currentProject
  if (currentProject?.targetWordCount) {
    // 获取当前小说的章节总数进行平均分配
    // 这里我们使用一个简单的估算：假设平均每章2000字
    const estimatedChapters = Math.ceil(currentProject.targetWordCount / 2000)
    const averagePerChapter = Math.round(currentProject.targetWordCount / estimatedChapters)

    // 设置合理的范围：最少500字，最多8000字
    const minWordCount = 500
    const maxWordCount = 8000

    return Math.max(minWordCount, Math.min(maxWordCount, averagePerChapter))
  }

  // 默认目标字数
  return 2000
})

// 工具函数
const getSettingTypeText = (type: string) => {
  const texts = {
    'worldview': '世界观',
    'location': '地理位置',
    'rule': '规则体系',
    'culture': '文化背景'
  }
  return texts[type as keyof typeof texts] || type
}

const getSettingTypeColor = (type: string) => {
  const colors = {
    'worldview': 'blue',
    'location': 'green',
    'rule': 'orange',
    'culture': 'purple'
  }
  return colors[type as keyof typeof colors] || 'default'
}

const getRoleText = (role: string) => {
  const texts = {
    'main': '主要',
    'supporting': '配角',
    'mentioned': '提及'
  }
  return texts[role as keyof typeof texts] || role
}

const getRoleColor = (role: string) => {
  const colors = {
    'main': 'red',
    'supporting': 'blue',
    'mentioned': 'gray'
  }
  return colors[role as keyof typeof colors] || 'default'
}

// 一致性检查工具函数
const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
  return consistencyService.getSeverityColor(severity)
}

const getSeverityLabel = (severity: 'low' | 'medium' | 'high') => {
  return consistencyService.getSeverityLabel(severity)
}

const getTypeIcon = (type: 'character' | 'setting' | 'timeline' | 'logic') => {
  return consistencyService.getTypeIcon(type)
}

const getTypeLabel = (type: 'character' | 'setting' | 'timeline' | 'logic') => {
  return consistencyService.getTypeLabel(type)
}

// 保存章节处理函数
const handleSaveChapter = async () => {
  try {
    const success = await saveChapter()
    if (success) {
      // 保存成功后，重置编辑器的未保存状态
      if (contentEditor.value) {
        contentEditor.value.markAsSaved()
      }
      message.success('章节保存成功')
    }
  } catch (err) {
    console.error('Save chapter error:', err)
    message.error('章节保存失败')
  }
}

// 事件处理函数
const handleAddPlotPoint = () => {
  addPlotPoint({
    type: 'action',
    description: ''
  })
}

const handleAddIllustration = () => {
  addIllustration({
    position: 'middle',
    description: ''
  })
}

// 角色管理
const addCharacterToChapter = async () => {
  if (!selectedCharacterId.value || !chapter.value) return

  try {
    // 调用API添加角色到章节
    await chapterService.addCharacterToChapter(chapter.value.id, selectedCharacterId.value, 'mentioned')

    // 重新加载章节数据
    await loadChapter(chapter.value.id)

    message.success('角色添加成功')
  } catch (err) {
    message.error('角色添加失败')
    console.error('Error adding character to chapter:', err)
  } finally {
    showAddCharacterModal.value = false
    selectedCharacterId.value = undefined
  }
}

const removeCharacterFromChapter = async (characterId: string) => {
  if (!chapter.value) return

  try {
    await chapterService.removeCharacterFromChapter(chapter.value.id, characterId)
    await loadChapter(chapter.value.id)
    message.success('角色移除成功')
  } catch (err) {
    message.error('角色移除失败')
    console.error('Error removing character from chapter:', err)
  }
}

const updateCharacterRole = async (characterId: string, role: string) => {
  if (!chapter.value) return

  try {
    await chapterService.updateCharacterRole(chapter.value.id, characterId, role)
    // 直接更新本地数据而不重新加载整个章节（性能优化）
    const chapterCharacter = chapter.value.characters.find(cc => cc.characterId === characterId)
    if (chapterCharacter) {
      chapterCharacter.role = role
    }
    message.success('角色关系更新成功')
  } catch (err) {
    message.error('角色关系更新失败')
    console.error('Error updating character role:', err)
  }
}

// 设定管理
const addSettingToChapter = async () => {
  if (!selectedSettingId.value || !chapter.value) return

  try {
    await chapterService.addSettingToChapter(chapter.value.id, selectedSettingId.value, '')
    await loadChapter(chapter.value.id)
    message.success('设定添加成功')
  } catch (err) {
    message.error('设定添加失败')
    console.error('Error adding setting to chapter:', err)
  } finally {
    showAddSettingModal.value = false
    selectedSettingId.value = undefined
  }
}

const removeSettingFromChapter = async (settingId: string) => {
  if (!chapter.value) return

  try {
    await chapterService.removeSettingFromChapter(chapter.value.id, settingId)
    await loadChapter(chapter.value.id)
    message.success('设定移除成功')
  } catch (err) {
    message.error('设定移除失败')
    console.error('Error removing setting from chapter:', err)
  }
}

const updateSettingUsage = async (settingId: string, usage: string) => {
  if (!chapter.value) return

  try {
    await chapterService.updateSettingUsage(chapter.value.id, settingId, usage)
    // 直接更新本地数据而不重新加载整个章节（性能优化）
    const chapterSetting = chapter.value.settings.find(cs => cs.settingId === settingId)
    if (chapterSetting) {
      chapterSetting.usage = usage
    }
    message.success('设定用法更新成功')
  } catch (err) {
    message.error('设定用法更新失败')
    console.error('Error updating setting usage:', err)
  }
}

// AI功能
const generateOutline = async () => {
  if (!chapter.value) return null

  try {
    // 构建单章节大纲生成参数
    const chapterCharacters = chapter.value.characters || []
    const chapterSettings = chapter.value.settings || []

    // 获取角色和设定的详细信息
    const characterDetails = chapterCharacters.map(cc => {
      const char = availableCharacters.value.find(c => c.id === cc.characterId)
      return char ? {
        name: char.name,
        description: char.description,
        personality: char.personality,
        background: char.background
      } : { name: '未知角色', description: '' }
    })

    const settingDetails = chapterSettings.map(cs => {
      const setting = availableSettings.value.find(s => s.id === cs.settingId)
      return setting ? {
        name: setting.name,
        type: setting.type,
        description: setting.description
      } : { name: '未知设定', type: '', description: '' }
    })

    const params = {
      novelId: chapter.value.novelId,
      chapterId: chapter.value.id,
      chapterNumber: chapter.value.chapterNumber,
      chapterTitle: chapter.value.title,
      existingOutline: chapter.value.outline || '',
      characters: characterDetails,
      settings: settingDetails,
      targetWords: targetWordCount.value
    }

    const outlineData = await aiService.generateChapterOutline(params)
    return outlineData
  } catch (error) {
    console.error('Generate chapter outline error:', error)
    throw error
  }
}

const requestAIOutline = async () => {
  if (!chapter.value) return

  try {
    message.loading({ content: '正在生成AI大纲...', key: 'ai-outline', duration: 0 })
    const outline = await generateOutline()
    if (outline) {
      // 将AI生成的章节大纲应用到章节的outline字段
      let newOutlineContent = `# ${outline.title}\n\n## 章节概述\n${outline.summary}\n\n## 内容结构\n`

      // 添加内容结构段落
      outline.contentStructure.forEach((section, index) => {
        newOutlineContent += `### ${index + 1}. ${section.title}\n${section.description}`
        if (section.estimatedWords > 0) {
          newOutlineContent += ` (约${section.estimatedWords}字)`
        }
        newOutlineContent += '\n\n'
      })

      // 添加章节重点
      if (outline.keyPoints && outline.keyPoints.length > 0) {
        newOutlineContent += `## 章节重点\n${outline.keyPoints.map(point => `- ${point}`).join('\n')}\n\n`
      }

      // 添加情感基调
      if (outline.emotionalTone) {
        newOutlineContent += `## 情感基调\n${outline.emotionalTone}\n\n`
      }

      // 添加字数目标
      newOutlineContent += `## 字数目标\n约 ${outline.targetWords} 字`

      // 更新章节大纲
      await updateChapter('outline', newOutlineContent)

      // 更新本地markdown内容
      setOutlineMarkdown(newOutlineContent)

      // 自动设置情节要点
      if (outline.plotPoints && outline.plotPoints.length > 0) {
        // 清空现有情节要点
        chapter.value.plotPoints = []

        // 添加新的情节要点
        outline.plotPoints.forEach(plotPoint => {
          addPlotPoint({
            type: plotPoint.type,
            description: plotPoint.description
          })
        })

        // 保存更新后的章节数据
        await saveChapter()
      }

      message.success({ content: 'AI章节大纲生成完成！已自动设置情节要点', key: 'ai-outline' })
    }
  } catch (err) {
    console.error('AI chapter outline generation failed:', err)
    message.error({ content: 'AI章节大纲生成失败', key: 'ai-outline' })
  }
}

const runConsistencyCheck = async () => {
  if (!chapter.value) return
  await performConsistencyCheck()
}

// 一致性检查相关函数
const loadConsistencyIssues = async () => {
  if (!chapter.value) return

  try {
    consistencyIssues.value = await consistencyService.getChapterIssues(chapter.value.id)
  } catch (err) {
    console.error('加载一致性检查结果失败:', err)
  }
}

const performConsistencyCheck = async () => {
  if (!chapter.value) return

  try {
    consistencyChecking.value = true
    const result = await consistencyService.checkChapter(chapter.value.id)

    if (result.success) {
      await loadConsistencyIssues()
      message.success(`一致性检查完成，发现 ${result.issuesFound} 个问题`)

      // 如果有严重问题，自动切换到一致性检查标签页
      if (result.issues.some(issue => issue.severity === 'high')) {
        activeTab.value = 'consistency'
      }
    }
  } catch (err) {
    console.error('一致性检查失败:', err)
    message.error('一致性检查失败')
  } finally {
    consistencyChecking.value = false
  }
}

const toggleIssueResolved = async (issue: ConsistencyCheck) => {
  try {
    resolvingIssues.value.add(issue.id)
    await consistencyService.resolveIssue(issue.id, !issue.resolved)
    await loadConsistencyIssues()
    message.success(issue.resolved ? '问题已标记为未解决' : '问题已标记为已解决')
  } catch (err) {
    console.error('更新问题状态失败:', err)
    message.error('更新问题状态失败')
  } finally {
    resolvingIssues.value.delete(issue.id)
  }
}

const batchResolveIssues = async () => {
  const unresolvedIssues = consistencyIssues.value.filter(issue => !issue.resolved)
  if (unresolvedIssues.length === 0) return

  try {
    batchResolving.value = true
    const issueIds = unresolvedIssues.map(issue => issue.id)
    await consistencyService.batchResolveIssues(issueIds, true)
    await loadConsistencyIssues()
    message.success(`已解决 ${unresolvedIssues.length} 个问题`)
  } catch (err) {
    console.error('批量解决问题失败:', err)
    message.error('批量解决问题失败')
  } finally {
    batchResolving.value = false
  }
}

const deleteIssue = async (issue: ConsistencyCheck) => {
  try {
    deletingIssues.value.add(issue.id)
    await consistencyService.deleteIssue(issue.id)
    await loadConsistencyIssues()
    message.success('问题已删除')
  } catch (err) {
    console.error('删除问题失败:', err)
    message.error('删除问题失败')
  } finally {
    deletingIssues.value.delete(issue.id)
  }
}

const viewIssueDetails = async (issue: ConsistencyCheck) => {
  selectedIssue.value = issue
  showIssueDetailModal.value = true
}

// 过滤函数
const filterCharacter = (input: string, option: any) => {
  return option.children.toLowerCase().includes(input.toLowerCase())
}

const filterSetting = (input: string, option: any) => {
  return option.children.toLowerCase().includes(input.toLowerCase())
}

// Markdown 大纲相关功能
const toggleOutlinePreview = () => {
  isOutlinePreviewMode.value = !isOutlinePreviewMode.value
}

const applyOutlineTemplate = () => {
  applyTemplate('chapterOutline')
}

// 正文内容处理
const handleContentChange = (value: string) => {
  contentText.value = value
  if (chapter.value) {
    updateChapter('content', value)
  }
}

// AI生成正文功能
const handleAIGenerateLength = async ({ key }: { key: string }) => {
  if (key === 'custom') {
    // 打开自定义长度模态框，使用智能建议
    openCustomLengthModal()
  } else {
    const targetLength = parseInt(key)
    await generateAIContent(targetLength)
  }
}

// 处理自定义长度提交
const handleCustomLengthSubmit = async () => {
  if (customLength.value < 100 || customLength.value > 10000) {
    message.error('字数必须在100-10000之间')
    return
  }

  showCustomLengthModal.value = false
  await generateAIContent(customLength.value)
}

// 智能建议自定义长度（基于目标字数和当前字数）
const suggestCustomLength = computed(() => {
  const target = targetWordCount.value
  const current = contentWordCount.value
  const remaining = target - current

  if (remaining > 0) {
    // 如果还需要更多字数，建议剩余字数或合理范围
    if (remaining <= 10000) {
      return Math.max(100, Math.min(remaining, 3000))
    }
    return 3000
  } else {
    // 如果已经超过目标，建议基础长度
    return 1000
  }
})

// 打开自定义长度模态框时设置智能建议
const openCustomLengthModal = () => {
  customLength.value = suggestCustomLength.value
  showCustomLengthModal.value = true
}

const generateAIContent = async (targetLength: number = 2000) => {
  if (!chapter.value) {
    message.error('章节信息未加载')
    return
  }

  try {
    generatingContent.value = true
    message.loading({ content: `正在生成约${targetLength}字的正文内容...`, key: 'ai-content', duration: 0 })

    // 获取相关角色和设定信息
    const chapterCharacters = chapter.value.characters || []
    const chapterSettings = chapter.value.settings || []

    const characterDetails = chapterCharacters.map(cc => {
      const char = availableCharacters.value.find(c => c.id === cc.characterId)
      return char ? {
        name: char.name,
        description: char.description,
        personality: char.personality,
        background: char.background
      } : null
    }).filter(Boolean)

    const settingDetails = chapterSettings.map(cs => {
      const setting = availableSettings.value.find(s => s.id === cs.settingId)
      return setting ? {
        name: setting.name,
        type: setting.type,
        description: setting.description
      } : null
    }).filter(Boolean)

    // 调用AI服务生成正文
    const response = await aiService.generateContent({
      novelId: chapter.value.novelId,
      chapterId: chapter.value.id,
      outline: chapter.value.outline || outlineMarkdown.value,
      existingContent: contentText.value,
      targetLength,
      style: 'modern',
      characters: characterDetails,
      settings: settingDetails
    })

    let generatedContent = ''
    if (typeof response === 'string') {
      generatedContent = response
    } else if (response && typeof response === 'object') {
      generatedContent = response.content || response.message || response.data || ''
    }

    if (!generatedContent) {
      message.error({ content: 'AI生成内容为空', key: 'ai-content' })
      return
    }

    // 处理生成的内容格式
    generatedContent = processGeneratedContent(generatedContent)

    // 判断是继续写还是重新写
    if (contentText.value.trim()) {
      // 有现有内容，询问用户选择
      const action = await showContentInsertOptions()
      if (action === 'append') {
        // 追加到现有内容
        const newContent = contentText.value + '\n\n' + generatedContent
        contentText.value = newContent
        if (contentEditor.value) {
          contentEditor.value.insertText('\n\n' + generatedContent)
        }
      } else if (action === 'replace') {
        // 替换现有内容
        contentText.value = generatedContent
        if (contentEditor.value) {
          contentEditor.value.clear()
          contentEditor.value.insertText(generatedContent)
        }
      }
    } else {
      // 没有现有内容，直接插入
      contentText.value = generatedContent
      if (contentEditor.value) {
        contentEditor.value.insertText(generatedContent)
      }
    }

    message.success({ content: `AI正文生成完成！已生成约${generatedContent.length}字`, key: 'ai-content' })

    // 触发保存
    if (chapter.value) {
      updateChapter('content', contentText.value)
    }

  } catch (err) {
    console.error('AI content generation failed:', err)
    message.error({ content: 'AI正文生成失败', key: 'ai-content' })
  } finally {
    generatingContent.value = false
  }
}

// 处理生成的内容格式
const processGeneratedContent = (content: string): string => {
  // 清理可能的markdown标记或其他格式标记，但保留换行符
  return content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
    .replace(/^\s*#+\s*/gm, '') // 移除标题标记
    .replace(/^\s*[-*]\s*/gm, '') // 移除列表标记
    .trim()
}

// 显示内容插入选项
const showContentInsertOptions = (): Promise<'append' | 'replace' | 'cancel'> => {
  return new Promise((resolve) => {
    const modal = Modal.confirm({
      title: '插入生成内容',
      content: '检测到已有正文内容，请选择插入方式：',
      okText: '追加到末尾',
      cancelText: '替换现有内容',
      onOk() {
        resolve('append')
      },
      onCancel() {
        // 添加第三个选项按钮
        const replaceModal = Modal.confirm({
          title: '确认替换',
          content: '是否要替换现有内容？此操作不可撤销。',
          okText: '确认替换',
          cancelText: '取消',
          onOk() {
            resolve('replace')
          },
          onCancel() {
            resolve('cancel')
          }
        })
      }
    })
  })
}

// 清空内容
const clearContent = () => {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空所有正文内容吗？此操作不可撤销。',
    okText: '确认清空',
    cancelText: '取消',
    onOk() {
      contentText.value = ''
      if (contentEditor.value) {
        contentEditor.value.clear()
      }
      if (chapter.value) {
        updateChapter('content', '')
      }
      message.success('内容已清空')
    }
  })
}

// 全屏切换功能
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 键盘快捷键处理
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+S / Cmd+S 保存
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (hasUnsavedChanges.value && !saving.value) {
      handleSaveChapter()
    }
  }

  // Ctrl+1-4 切换标签页
  if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '4') {
    event.preventDefault()
    const tabKeys = ['outline', 'content', 'workflow', 'consistency']
    const tabIndex = parseInt(event.key) - 1
    if (tabIndex < tabKeys.length) {
      activeTab.value = tabKeys[tabIndex]
    }
  }

  // Ctrl+Left 上一章
  if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
    event.preventDefault()
    if (previousChapter.value) {
      goToPreviousChapter()
    }
  }

  // Ctrl+Right 下一章
  if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
    event.preventDefault()
    if (nextChapter.value) {
      goToNextChapter()
    }
  }

  // F11 键切换全屏
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFullscreen()
  }

  // Escape 键退出全屏
  if (event.key === 'Escape' && isFullscreen.value) {
    event.preventDefault()
    isFullscreen.value = false
  }
}

// 插入内容模板
const insertContentTemplate = () => {
  const templates = [
    {
      name: '对话场景',
      content: '　　"在这里输入对话内容。"角色甲说道。\n\n　　角色乙听了，若有所思地点点头："你说得对。"'
    },
    {
      name: '环境描写',
      content: '　　夜幕降临，街道上的灯光逐一亮起。微风轻抚过面庞，带来阵阵凉意。'
    },
    {
      name: '动作描写',
      content: '　　他缓缓起身，目光坚定地望向远方。脚步声在空旷的走廊中回响。'
    },
    {
      name: '心理描写',
      content: '　　【这件事情不对劲，】他心中暗想，【必须要小心行事。】'
    }
  ]

  // 创建模板选择菜单
  Modal.info({
    title: '选择内容模板',
    width: 500,
    content: h('div', { class: 'space-y-3' }, [
      ...templates.map(template =>
        h('div', {
          class: 'p-3 border rounded cursor-pointer hover:bg-gray-50',
          onClick: () => {
            if (contentEditor.value) {
              contentEditor.value.insertText('\n\n' + template.content)
            }
            Modal.destroyAll()
            message.success(`已插入${template.name}模板`)
          }
        }, [
          h('div', { class: 'font-medium mb-1' }, template.name),
          h('div', { class: 'text-sm text-gray-600' }, template.content.slice(0, 50) + '...')
        ])
      )
    ])
  })
}

// 目标字数编辑功能
const startEditTargetWords = () => {
  isEditingTargetWords.value = true
  editingTargetWords.value = chapter.value?.targetWordCount || targetWordCount.value
}

const saveTargetWords = async () => {
  if (!chapter.value || !editingTargetWords.value) {
    isEditingTargetWords.value = false
    return
  }

  try {
    // 调用API更新章节目标字数
    await updateChapter('targetWordCount', editingTargetWords.value)
    message.success('目标字数更新成功')
  } catch (err) {
    message.error('目标字数更新失败')
    console.error('Error updating target word count:', err)
  } finally {
    isEditingTargetWords.value = false
  }
}

// 状态流转处理
const handleStatusChanged = (newStatus: string) => {
  if (chapter.value) {
    chapter.value.status = newStatus as any
    // 重新加载章节数据以获取最新信息
    if (chapter.value.id) {
      loadChapter(chapter.value.id)
    }
  }
}

// 监听大纲内容变化，同步到章节数据
watch(outlineMarkdown, (newValue) => {
  if (chapter.value) {
    updateChapter('outline', newValue)
  }
})

// 监听章节大纲变化，同步到Markdown
watch(() => chapter.value?.outline, (newValue) => {
  if (newValue !== outlineMarkdown.value) {
    setOutlineMarkdown(newValue || '')
  }
}, { immediate: true })

// 监听章节正文变化，同步到编辑器
watch(() => chapter.value?.content, (newValue) => {
  // 避免不必要的更新，特别是在内容只有微小差异时
  const currentContent = contentText.value || ''
  const newContent = newValue || ''

  // 如果内容确实不同，才进行更新
  if (newContent !== currentContent) {
    contentText.value = newContent
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  // 加载章节数据
  if (chapterId.value) {
    await loadChapter(chapterId.value)
    // 加载可用角色和设定
    await loadAvailableData()
    // 加载所有章节（用于导航）
    await loadAllChapters()
    // 加载一致性检查结果
    await loadConsistencyIssues()
  }

  // 初始化Markdown内容
  if (chapter.value?.outline) {
    setOutlineMarkdown(chapter.value.outline)
  }
  if (chapter.value?.content) {
    contentText.value = chapter.value.content
  }

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // 清理键盘事件监听
  document.removeEventListener('keydown', handleKeydown)
})

// 标签页切换处理（如果需要可以添加其他逻辑）

// 监听章节变化，重新加载可用数据
watch(() => chapter.value?.id, async (newChapterId, oldChapterId) => {
  if (newChapterId && newChapterId !== oldChapterId) {
    await loadAvailableData()
    await loadConsistencyIssues()
    // 如果章节列表为空或小说ID变化，重新加载章节列表
    if (allChapters.value.length === 0) {
      await loadAllChapters()
    }
  }
})

// 监听错误信息
watch(error, (newError) => {
  if (newError) {
    message.error(newError)
  }
})

// 计算属性：过滤后的可用角色和设定
const filteredAvailableCharacters = computed(() => {
  if (!chapter.value) return availableCharacters.value
  const chapterCharacterIds = chapter.value.characters.map(c => c.characterId)
  return availableCharacters.value.filter(c => !chapterCharacterIds.includes(c.id))
})

const filteredAvailableSettings = computed(() => {
  if (!chapter.value) return availableSettings.value
  const chapterSettingIds = chapter.value.settings.map(s => s.settingId)
  return availableSettings.value.filter(s => !chapterSettingIds.includes(s.id))
})

// 组件卸载时的清理工作（如需要可以添加）
</script>

<style scoped>
:deep(.ant-tabs-content-holder) {
  padding: 0;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
}

/* 一致性检查统计卡片样式 */
.consistency-stat-high {
  background-color: var(--theme-consistency-high-bg) !important;
  border: 1px solid var(--theme-consistency-high-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.consistency-stat-medium {
  background-color: var(--theme-consistency-medium-bg) !important;
  border: 1px solid var(--theme-consistency-medium-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.consistency-stat-low {
  background-color: var(--theme-consistency-low-bg) !important;
  border: 1px solid var(--theme-consistency-low-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 文本颜色样式 */
.consistency-high-text {
  color: var(--theme-consistency-high-text);
  transition: color 0.3s ease;
}

.consistency-medium-text {
  color: var(--theme-consistency-medium-text);
  transition: color 0.3s ease;
}

.consistency-low-text {
  color: var(--theme-consistency-low-text);
  transition: color 0.3s ease;
}

/* 正文工具栏样式 */
.content-toolbar {
  min-height: 48px;
  transition: all 0.3s ease;
}

.content-toolbar .ant-space {
  gap: 8px !important;
}

.content-toolbar .ant-btn {
  height: 32px;
  font-size: 12px;
}

.content-toolbar .ant-btn-primary {
  background: linear-gradient(135deg, #1890ff, #096dd9);
  border: none;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
}

.content-toolbar .ant-btn-primary:hover {
  background: linear-gradient(135deg, #40a9ff, #1890ff);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}

/* 全屏模式样式 */
.fullscreen-content {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999 !important;
  background-color: var(--theme-bg-container) !important;
  display: flex !important;
  flex-direction: column !important;
}

.fullscreen-content .content-toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--theme-border);
}

.fullscreen-content :deep(.tiptap-editor) {
  height: calc(100vh - 60px) !important; /* 减去工具栏高度 */
}

/* 章节列表菜单样式 */
.chapter-list-menu :deep(.ant-menu-item) {
  padding: 8px 16px !important;
  transition: background-color 0.2s ease;
}

.chapter-list-menu :deep(.ant-menu-item:hover) {
  background-color: var(--theme-bg-elevated) !important;
}

.chapter-list-menu :deep(.ant-menu-item.active-chapter) {
  background-color: rgba(24, 144, 255, 0.1) !important;
  font-weight: 500;
}

.chapter-list-menu :deep(.ant-menu-item > div) {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100%;
}

.chapter-list-menu :deep(.ant-menu-item > div > span:first-child) {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
