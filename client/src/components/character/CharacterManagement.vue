<template>
  <div class="h-full flex">
    <!-- Character List (30%) -->
    <div class="w-80 theme-bg-elevated border-r theme-border flex flex-col">
      <div class="p-4 border-b theme-border">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold theme-text-primary">角色库</h2>
          <a-button type="primary" size="small" @click="showAddCharacterModal = true">
            <template #icon>
              <PlusOutlined />
            </template>
            新增
          </a-button>
        </div>

        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索角色..."
          size="small"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        <div
          v-for="character in filteredCharacters"
          :key="character.id"
          @click="selectCharacter(character)"
          class="p-3 mb-2 rounded-lg cursor-pointer transition-colors"
          :class="selectedCharacter?.id === character.id
            ? 'theme-selected-bg border theme-selected-border'
            : 'theme-bg-container border theme-border theme-selected-hover'"
        >
          <div class="flex items-start space-x-3">
            <a-avatar :size="40" :style="{ backgroundColor: getCharacterColor(character.id) }">
              {{ character.name.charAt(0) }}
            </a-avatar>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium theme-text-primary truncate">
                  {{ character.name }}
                </h4>
                <a-tag v-if="character.isLocked" size="small" color="red">
                  锁定
                </a-tag>
              </div>
              <p class="text-xs theme-text-primary mt-1 line-clamp-2">
                {{ character.description }}
              </p>
              <div class="flex items-center mt-2 text-xs theme-text-primary">
                <span>{{ character.personality?.split('，')[0] || '未设定性格' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Details (70%) -->
    <div class="flex-1 flex flex-col">
      <div v-if="!selectedCharacter" class="flex-1 flex items-center justify-center theme-text-primary">
        <div class="text-center">
          <TeamOutlined style="font-size: 48px; margin-bottom: 16px;" />
          <p>选择一个角色以查看和编辑详情</p>
        </div>
      </div>

      <div v-else class="flex-1 flex">
        <!-- Character Form (70%) -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="max-w-3xl">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-4">
                <a-avatar :size="56" :style="{ backgroundColor: getCharacterColor(selectedCharacter.id) }">
                  {{ selectedCharacter.name.charAt(0) }}
                </a-avatar>
                <div>
                  <h1 class="text-2xl font-bold theme-text-primary">{{ selectedCharacter.name }}</h1>
                  <p class="text-sm theme-text-primary">角色详情编辑</p>
                </div>
              </div>
              <a-space>
                <a-button @click="requestAIEnhancement" :loading="enhancing">
                  <template #icon>
                    <RobotOutlined />
                  </template>
                  AI完善
                </a-button>
                <a-button
                  :type="selectedCharacter.isLocked ? 'default' : 'primary'"
                  @click="toggleLock"
                >
                  <template #icon>
                    <LockOutlined v-if="selectedCharacter.isLocked" />
                    <UnlockOutlined v-else />
                  </template>
                  {{ selectedCharacter.isLocked ? '解锁' : '锁定' }}
                </a-button>
                <a-button
                  :type="showAISuggestionsPanel ? 'primary' : 'default'"
                  @click="showAISuggestionsPanel = !showAISuggestionsPanel"
                >
                  <template #icon>
                    <BulbOutlined />
                  </template>
                  AI建议
                </a-button>
                <a-button danger @click="deleteCharacter">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除
                </a-button>
              </a-space>
            </div>

            <!-- Character Form -->
            <a-form :model="editingCharacter" layout="vertical" @finish="saveCharacter">
              <a-tabs v-model:activeKey="activeTab" type="card">
                <!-- Basic Info Tab -->
                <a-tab-pane key="basic" tab="基本信息">
                  <a-row :gutter="16">
                    <a-col :span="8">
                      <a-form-item label="角色姓名" required>
                        <a-input
                          v-model:value="editingCharacter.name"
                          placeholder="输入角色姓名"
                          :disabled="selectedCharacter.isLocked"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="8">
                      <a-form-item label="年龄">
                        <a-input
                          v-model:value="editingCharacter.age"
                          placeholder="如：28岁"
                          :disabled="selectedCharacter.isLocked"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="8">
                      <a-form-item label="身份/职业">
                        <a-input
                          v-model:value="editingCharacter.identity"
                          placeholder="如：私人侦探"
                          :disabled="selectedCharacter.isLocked"
                        />
                      </a-form-item>
                    </a-col>
                  </a-row>

                  <a-form-item label="角色描述">
                    <a-textarea
                      v-model:value="editingCharacter.description"
                      :rows="3"
                      placeholder="简要描述角色的基本信息..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>

                  <a-form-item label="外貌特征">
                    <a-textarea
                      v-model:value="editingCharacter.appearance"
                      :rows="4"
                      placeholder="详细描述角色的外貌特征..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>
                </a-tab-pane>

                <!-- Personality Tab -->
                <a-tab-pane key="personality" tab="性格特征">
                  <a-form-item label="性格特点">
                    <a-textarea
                      v-model:value="editingCharacter.personality"
                      :rows="6"
                      placeholder="描述角色的性格特点、行为习惯、说话方式等..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>

                  <a-form-item label="核心价值观">
                    <a-textarea
                      v-model:value="editingCharacter.values"
                      :rows="3"
                      placeholder="角色的核心价值观和信念..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>

                  <a-form-item label="恐惧与弱点">
                    <a-textarea
                      v-model:value="editingCharacter.fears"
                      :rows="3"
                      placeholder="角色害怕什么，有什么弱点..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>
                </a-tab-pane>

                <!-- Background Tab -->
                <a-tab-pane key="background" tab="背景故事">
                  <a-form-item label="个人背景">
                    <a-textarea
                      v-model:value="editingCharacter.background"
                      :rows="8"
                      placeholder="角色的成长经历、重要事件、人生转折点..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>

                  <a-form-item label="技能与能力">
                    <a-textarea
                      v-model:value="editingCharacter.skills"
                      :rows="3"
                      placeholder="角色掌握的技能、特殊能力..."
                      :disabled="selectedCharacter.isLocked"
                    />
                  </a-form-item>
                </a-tab-pane>

                <!-- Relationships Tab -->
                <a-tab-pane key="relationships" tab="人际关系">
                  <div class="space-y-4">
                    <div
                      v-for="(relation, index) in editingCharacter.relationships"
                      :key="index"
                      class="p-4 border theme-border rounded-lg"
                    >
                      <a-row :gutter="16" align="middle">
                        <a-col :span="6">
                          <a-input
                            v-model:value="relation.character"
                            placeholder="角色名称"
                            :disabled="selectedCharacter.isLocked"
                          />
                        </a-col>
                        <a-col :span="4">
                          <a-select
                            v-model:value="relation.type"
                            placeholder="关系类型"
                            :disabled="selectedCharacter.isLocked"
                          >
                            <a-select-option value="家人">家人</a-select-option>
                            <a-select-option value="朋友">朋友</a-select-option>
                            <a-select-option value="敌人">敌人</a-select-option>
                            <a-select-option value="导师">导师</a-select-option>
                            <a-select-option value="下属">下属</a-select-option>
                            <a-select-option value="恋人">恋人</a-select-option>
                            <a-select-option value="其他">其他</a-select-option>
                          </a-select>
                        </a-col>
                        <a-col :span="4">
                          <a-select
                            v-model:value="relation.importance"
                            placeholder="重要程度"
                            :disabled="selectedCharacter.isLocked"
                          >
                            <a-select-option value="高">高</a-select-option>
                            <a-select-option value="中">中</a-select-option>
                            <a-select-option value="低">低</a-select-option>
                          </a-select>
                        </a-col>
                        <a-col :span="8">
                          <a-input
                            v-model:value="relation.description"
                            placeholder="关系描述"
                            :disabled="selectedCharacter.isLocked"
                          />
                        </a-col>
                        <a-col :span="2">
                          <a-button
                            type="text"
                            danger
                            @click="removeRelationship(index)"
                            :disabled="selectedCharacter.isLocked"
                          >
                            <DeleteOutlined />
                          </a-button>
                        </a-col>
                      </a-row>
                    </div>

                    <a-button
                      type="dashed"
                      block
                      @click="addRelationship"
                      :disabled="selectedCharacter.isLocked"
                    >
                      <PlusOutlined />
                      添加关系
                    </a-button>
                  </div>
                </a-tab-pane>
              </a-tabs>

              <div class="mt-6 text-right">
                <a-button
                  type="primary"
                  html-type="submit"
                  :disabled="selectedCharacter.isLocked"
                >
                  保存修改
                </a-button>
              </div>
            </a-form>
          </div>
        </div>

        <!-- AI Suggestions Panel (30%) -->
        <div v-if="showAISuggestionsPanel" class="w-96 theme-bg-elevated border-l theme-border p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium theme-text-primary">AI 建议</h3>
            <a-button
              type="text"
              size="small"
              @click="showAISuggestionsPanel = false"
              class="!p-1 !h-auto hover:!bg-gray-100 dark:hover:!bg-gray-700"
            >
              <template #icon>
                <CloseOutlined class="text-xs" />
              </template>
            </a-button>
          </div>

          <div v-if="aiEnhancementResult && aiEnhancementResult.suggestions" class="space-y-4">
            <!-- 动态显示主要AI建议 -->
            <a-card v-if="aiEnhancementResult.suggestions.personality" size="small" title="性格建议">
              <p class="text-sm theme-text-primary line-clamp-3">
                {{ aiEnhancementResult.suggestions.personality.substring(0, 120) }}{{ aiEnhancementResult.suggestions.personality.length > 120 ? '...' : '' }}
              </p>
              <a-button type="link" size="small" class="p-0 mt-2" @click="applyAISuggestion('personality', aiEnhancementResult.suggestions.personality)">
                应用建议
              </a-button>
            </a-card>

            <a-card v-if="aiEnhancementResult.suggestions.background" size="small" title="背景建议">
              <p class="text-sm theme-text-primary line-clamp-3">
                {{ aiEnhancementResult.suggestions.background.substring(0, 120) }}{{ aiEnhancementResult.suggestions.background.length > 120 ? '...' : '' }}
              </p>
              <a-button type="link" size="small" class="p-0 mt-2" @click="applyAISuggestion('background', aiEnhancementResult.suggestions.background)">
                应用建议
              </a-button>
            </a-card>

            <a-card v-if="aiEnhancementResult.suggestions.skills" size="small" title="技能建议">
              <p class="text-sm theme-text-primary line-clamp-3">
                {{ aiEnhancementResult.suggestions.skills.substring(0, 120) }}{{ aiEnhancementResult.suggestions.skills.length > 120 ? '...' : '' }}
              </p>
              <a-button type="link" size="small" class="p-0 mt-2" @click="applyAISuggestion('skills', aiEnhancementResult.suggestions.skills)">
                应用建议
              </a-button>
            </a-card>

            <div class="text-center">
              <a-button type="link" size="small" @click="showAIEnhancementModal = true">
                查看所有建议 ({{ Object.keys(aiEnhancementResult.suggestions).length }} 项)
              </a-button>
            </div>
          </div>

          <!-- 默认显示 -->
          <div v-else class="space-y-4">
            <a-card size="small" title="AI 分析提示">
              <p class="text-sm theme-text-primary">
                点击下方按钮获取 AI 对当前角色的完善建议，包括性格分析、背景故事和外貌描述等。
              </p>
            </a-card>
          </div>

          <div class="mt-6">
            <a-button type="primary" block @click="requestAIEnhancement" :loading="enhancing">
              <template #icon>
                <RobotOutlined />
              </template>
              {{ aiEnhancementResult ? '重新分析' : 'AI 全面分析' }}
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Character Modal -->
    <a-modal
      v-model:open="showAddCharacterModal"
      title="添加新角色"
      width="600px"
      @ok="addCharacter"
    >
      <a-form :model="newCharacter" layout="vertical">
        <a-form-item label="角色姓名" required>
          <a-input v-model:value="newCharacter.name" placeholder="输入角色姓名" />
        </a-form-item>
        <a-form-item label="简要描述">
          <a-textarea
            v-model:value="newCharacter.description"
            :rows="3"
            placeholder="简要描述角色..."
          />
        </a-form-item>

        <!-- AI 生成选项 -->
        <a-divider>AI 生成辅助</a-divider>
        <a-form-item label="AI 生成提示" help="描述你想要的角色特征，AI 将根据此生成详细角色信息">
          <a-textarea
            v-model:value="newCharacter.aiPrompt"
            :rows="2"
            placeholder="例如：一个勇敢的年轻骑士，有着复杂的过去..."
          />
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button
              @click="generateCharacterWithAI"
              :loading="generatingCharacter"
              type="primary"
              ghost
            >
              <template #icon>
                <RobotOutlined />
              </template>
              AI 生成角色
            </a-button>
            <a-button
              @click="clearAIGeneration"
              :disabled="!hasAIGeneration"
              size="small"
            >
              清除生成内容
            </a-button>
          </a-space>
        </a-form-item>

        <!-- AI 生成预览 -->
        <div v-if="aiGeneratedCharacter" class="border theme-border rounded-lg p-4 theme-bg-elevated">
          <h4 class="text-sm font-medium mb-3 text-blue-600 dark:text-blue-400">AI 生成预览</h4>
          <a-space direction="vertical" style="width: 100%" size="small">
            <div v-if="aiGeneratedCharacter.name">
              <strong class="text-xs theme-text-secondary">建议姓名:</strong>
              <p class="text-sm mt-1 theme-text-primary">{{ aiGeneratedCharacter.name }}</p>
            </div>
            <div v-if="aiGeneratedCharacter.age">
              <strong class="text-xs theme-text-secondary">年龄:</strong>
              <p class="text-sm mt-1 theme-text-primary">{{ aiGeneratedCharacter.age }}</p>
            </div>
            <div v-if="aiGeneratedCharacter.identity">
              <strong class="text-xs theme-text-secondary">身份/职业:</strong>
              <p class="text-sm mt-1 theme-text-primary">{{ aiGeneratedCharacter.identity }}</p>
            </div>
            <div v-if="aiGeneratedCharacter.appearance">
              <strong class="text-xs theme-text-secondary">外貌特征:</strong>
              <p class="text-sm mt-1 theme-text-primary line-clamp-3">{{ aiGeneratedCharacter.appearance }}</p>
            </div>
            <div v-if="aiGeneratedCharacter.personality">
              <strong class="text-xs theme-text-secondary">性格特征:</strong>
              <p class="text-sm mt-1 theme-text-primary line-clamp-3">{{ aiGeneratedCharacter.personality }}</p>
            </div>
            <div v-if="aiGeneratedCharacter.background">
              <strong class="text-xs theme-text-secondary">背景故事:</strong>
              <p class="text-sm mt-1 theme-text-primary line-clamp-2">{{ aiGeneratedCharacter.background }}</p>
            </div>
          </a-space>
          <div class="mt-4 text-center space-x-2">
            <a-button type="primary" size="small" @click="applyAIGeneration">
              应用生成内容
            </a-button>
            <a-button size="small" @click="showFullAIPreview = true">
              查看完整信息
            </a-button>
          </div>
        </div>
      </a-form>
    </a-modal>

    <!-- AI Enhancement Result Modal -->
    <a-modal
      v-model:open="showAIEnhancementModal"
      title="AI 完善建议"
      width="800px"
      :footer="null"
    >
      <div v-if="aiEnhancementResult" class="space-y-6">
        <!-- AI Suggestions -->
        <div v-if="aiEnhancementResult.suggestions">
          <h4 class="text-lg font-medium mb-4">完善建议</h4>

          <div class="space-y-4">
            <!-- 年龄/身份建议 -->
            <div v-if="aiEnhancementResult.suggestions.age" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-orange-600">年龄/身份</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('age', aiEnhancementResult.suggestions.age)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('age', aiEnhancementResult.suggestions.age)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.age }}</p>
            </div>

            <!-- 角色描述建议 -->
            <div v-if="aiEnhancementResult.suggestions.description" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-indigo-600">角色描述</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('description', aiEnhancementResult.suggestions.description)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('description', aiEnhancementResult.suggestions.description)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.description }}</p>
            </div>

            <!-- 外貌特征建议 -->
            <div v-if="aiEnhancementResult.suggestions.appearance" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-purple-600">外貌特征</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('appearance', aiEnhancementResult.suggestions.appearance)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('appearance', aiEnhancementResult.suggestions.appearance)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.appearance }}</p>
            </div>

            <!-- 性格特征建议 -->
            <div v-if="aiEnhancementResult.suggestions.personality" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-blue-600">性格特征</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('personality', aiEnhancementResult.suggestions.personality)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('personality', aiEnhancementResult.suggestions.personality)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.personality }}</p>
            </div>

            <!-- 核心价值观建议 -->
            <div v-if="aiEnhancementResult.suggestions.values" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-cyan-600">核心价值观</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('values', aiEnhancementResult.suggestions.values)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('values', aiEnhancementResult.suggestions.values)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.values }}</p>
            </div>

            <!-- 恐惧与弱点建议 -->
            <div v-if="aiEnhancementResult.suggestions.fears" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-red-600">恐惧与弱点</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('fears', aiEnhancementResult.suggestions.fears)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('fears', aiEnhancementResult.suggestions.fears)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.fears }}</p>
            </div>

            <!-- 背景故事建议 -->
            <div v-if="aiEnhancementResult.suggestions.background" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-green-600">背景故事</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('background', aiEnhancementResult.suggestions.background)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('background', aiEnhancementResult.suggestions.background)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.background }}</p>
            </div>

            <!-- 技能与能力建议 -->
            <div v-if="aiEnhancementResult.suggestions.skills" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-emerald-600">技能与能力</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('skills', aiEnhancementResult.suggestions.skills)">
                    替换
                  </a-button>
                  <a-button size="small" type="primary" @click="mergeAISuggestion('skills', aiEnhancementResult.suggestions.skills)">
                    合并
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.skills }}</p>
            </div>

            <!-- 人际关系建议 -->
            <div v-if="aiEnhancementResult.suggestions.relationships" class="border theme-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-medium text-pink-600">人际关系</h5>
                <a-space>
                  <a-button size="small" @click="applyAISuggestion('relationships', aiEnhancementResult.suggestions.relationships)">
                    查看详情
                  </a-button>
                </a-space>
              </div>
              <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiEnhancementResult.suggestions.relationships }}</p>
            </div>
          </div>
        </div>

        <!-- AI Questions -->
        <div v-if="aiEnhancementResult.questions && aiEnhancementResult.questions.length > 0">
          <h4 class="text-lg font-medium mb-4">思考问题</h4>
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p class="text-sm text-orange-600 mb-2">AI 提出以下问题来帮助你进一步完善角色：</p>
            <ul class="list-disc list-inside space-y-1">
              <li v-for="question in aiEnhancementResult.questions" :key="question" class="text-sm text-orange-700">
                {{ question }}
              </li>
            </ul>
          </div>
        </div>

        <div class="text-center pt-4 border-t theme-border">
          <a-space>
            <a-button @click="showAIEnhancementModal = false">关闭</a-button>
            <a-button type="primary" @click="showAIEnhancementModal = false; saveCharacter()">
              保存并关闭
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>

    <!-- 完整AI预览模态框 -->
    <a-modal
      v-model:open="showFullAIPreview"
      title="AI 生成角色完整信息"
      width="700px"
      :footer="null"
    >
      <div v-if="aiGeneratedCharacter" class="space-y-4">
        <div v-if="aiGeneratedCharacter.name" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-blue-600 dark:text-blue-400 mb-2">建议姓名</h5>
          <p class="text-sm theme-text-primary">{{ aiGeneratedCharacter.name }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.age" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-orange-600 dark:text-orange-400 mb-2">年龄</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.age }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.identity" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-yellow-600 dark:text-yellow-400 mb-2">身份/职业</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.identity }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.description" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-indigo-600 dark:text-indigo-400 mb-2">角色描述</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.description }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.appearance" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-purple-600 dark:text-purple-400 mb-2">外貌特征</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.appearance }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.personality" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-green-600 dark:text-green-400 mb-2">性格特征</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.personality }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.values" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-cyan-600 dark:text-cyan-400 mb-2">核心价值观</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.values }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.fears" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-red-600 dark:text-red-400 mb-2">恐惧与弱点</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.fears }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.background" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-amber-600 dark:text-amber-400 mb-2">背景故事</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.background }}</p>
        </div>

        <div v-if="aiGeneratedCharacter.skills" class="border theme-border rounded-lg p-3">
          <h5 class="font-medium text-emerald-600 dark:text-emerald-400 mb-2">技能与能力</h5>
          <p class="text-sm theme-text-primary whitespace-pre-wrap">{{ aiGeneratedCharacter.skills }}</p>
        </div>

        <div class="text-center pt-4 border-t theme-border">
          <a-space>
            <a-button @click="showFullAIPreview = false">关闭</a-button>
            <a-button type="primary" @click="applyAIGeneration; showFullAIPreview = false">
              应用生成内容
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  TeamOutlined,
  RobotOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  CloseOutlined,
  BulbOutlined
} from '@ant-design/icons-vue'
import type { Character } from '@/types'
import { useCharacter } from '@/composables/useCharacter'
import { useProjectStore } from '@/stores/project'

// 使用项目Store
const projectStore = useProjectStore()

// 使用角色管理 composable
const {
  characters,
  currentCharacter,
  loading,
  enhancing,
  developing,
  loadCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter: deleteCharacterAPI,
  enhanceCharacter,
  generateCharacter,
  searchCharacters
} = useCharacter()

const selectedCharacter = ref<Character | null>(null)
const editingCharacter = ref<any>({})
const searchQuery = ref('')
const activeTab = ref('basic')
const showAddCharacterModal = ref(false)
const showAIEnhancementModal = ref(false)
const showAISuggestionsPanel = ref(true)
const showFullAIPreview = ref(false)
const aiEnhancementResult = ref<any>(null)
const newCharacter = ref({
  name: '',
  description: '',
  aiPrompt: ''
})

const generatingCharacter = ref(false)
const aiGeneratedCharacter = ref(null)

const hasAIGeneration = computed(() => !!aiGeneratedCharacter.value)

const filteredCharacters = computed(() => {
  if (!searchQuery.value) return characters.value
  return searchCharacters(searchQuery.value)
})

const selectCharacter = async (character: Character) => {
  selectedCharacter.value = character

  // 获取完整角色信息
  const fullCharacter = await getCharacter(character.id)
  if (fullCharacter) {
    editingCharacter.value = {
      ...fullCharacter,
      age: fullCharacter.age || '',
      identity: fullCharacter.identity || '',
      values: fullCharacter.values || '',
      fears: fullCharacter.fears || '',
      skills: fullCharacter.skills || '',
      relationships: Array.isArray(fullCharacter.relationships)
        ? fullCharacter.relationships
        : Object.entries(fullCharacter.relationships || {}).map(([character, data]: [string, any]) => ({
            character,
            type: data.type || '',
            importance: data.importance || '',
            description: data.description || ''
          }))
    }
  }
}

const getCharacterColor = (id: string) => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
  return colors[parseInt(id) % colors.length]
}

const toggleLock = async () => {
  if (selectedCharacter.value) {
    const newLockStatus = !selectedCharacter.value.isLocked
    const updated = await updateCharacter(selectedCharacter.value.id, {
      isLocked: newLockStatus
    })

    if (updated) {
      selectedCharacter.value = updated
    }
  }
}

const saveCharacter = async () => {
  if (!selectedCharacter.value) return

  // 转换关系数据格式
  const relationshipsObject: Record<string, any> = {}
  if (Array.isArray(editingCharacter.value.relationships)) {
    editingCharacter.value.relationships.forEach((rel: any) => {
      if (rel.character) {
        relationshipsObject[rel.character] = {
          type: rel.type,
          importance: rel.importance,
          description: rel.description
        }
      }
    })
  }

  const updateData = {
    name: editingCharacter.value.name,
    description: editingCharacter.value.description,
    age: editingCharacter.value.age,
    identity: editingCharacter.value.identity,
    appearance: editingCharacter.value.appearance,
    personality: editingCharacter.value.personality,
    values: editingCharacter.value.values,
    fears: editingCharacter.value.fears,
    background: editingCharacter.value.background,
    skills: editingCharacter.value.skills,
    relationships: relationshipsObject
  }

  const updated = await updateCharacter(selectedCharacter.value.id, updateData)
  if (updated) {
    selectedCharacter.value = updated
    message.success('角色信息保存成功')
  }
}

const deleteCharacter = async () => {
  if (!selectedCharacter.value) return

  const success = await deleteCharacterAPI(selectedCharacter.value.id)
  if (success) {
    selectedCharacter.value = null
    editingCharacter.value = {}
    // 如果还有其他角色，选择第一个
    if (characters.value.length > 0) {
      await selectCharacter(characters.value[0])
    }
  }
}

const requestAIEnhancement = async () => {
  if (!selectedCharacter.value) return

  const enhancement = await enhanceCharacter(selectedCharacter.value.id, {
    enhanceAspects: ['personality', 'background', 'appearance'],
    context: editingCharacter.value.description || ''
  })

  if (enhancement) {
    aiEnhancementResult.value = enhancement
    showAIEnhancementModal.value = true
  }
}

const applyAISuggestion = (aspect: string, suggestion: string) => {
  if (!editingCharacter.value) return

  // 将AI建议应用到编辑中的角色数据
  switch (aspect) {
    case 'age':
      editingCharacter.value.age = suggestion
      break
    case 'description':
      editingCharacter.value.description = suggestion
      break
    case 'appearance':
      editingCharacter.value.appearance = suggestion
      break
    case 'personality':
      editingCharacter.value.personality = suggestion
      break
    case 'values':
      editingCharacter.value.values = suggestion
      break
    case 'fears':
      editingCharacter.value.fears = suggestion
      break
    case 'background':
      editingCharacter.value.background = suggestion
      break
    case 'skills':
      editingCharacter.value.skills = suggestion
      break
    case 'relationships':
      // 这个可能需要特殊处理，暂时作为描述文本
      console.log('关系建议:', suggestion)
      message.info('人际关系建议已在控制台输出，请手动添加到关系面板')
      return
  }

  const fieldNames: Record<string, string> = {
    age: '年龄/身份',
    description: '角色描述',
    appearance: '外貌',
    personality: '性格',
    values: '价值观',
    fears: '恐惧弱点',
    background: '背景',
    skills: '技能',
    relationships: '人际关系'
  }

  message.success(`已应用${fieldNames[aspect]}建议`)
}

const mergeAISuggestion = (aspect: string, suggestion: string) => {
  if (!editingCharacter.value) return

  // 将AI建议与现有内容合并
  switch (aspect) {
    case 'age':
      const currentAge = editingCharacter.value.age || ''
      editingCharacter.value.age = currentAge + (currentAge ? ' / ' : '') + suggestion
      break
    case 'description':
      const currentDescription = editingCharacter.value.description || ''
      editingCharacter.value.description = currentDescription + (currentDescription ? '\n\n' : '') + suggestion
      break
    case 'appearance':
      const currentAppearance = editingCharacter.value.appearance || ''
      editingCharacter.value.appearance = currentAppearance + (currentAppearance ? '\n\n' : '') + suggestion
      break
    case 'personality':
      const currentPersonality = editingCharacter.value.personality || ''
      editingCharacter.value.personality = currentPersonality + (currentPersonality ? '\n\n' : '') + suggestion
      break
    case 'values':
      const currentValues = editingCharacter.value.values || ''
      editingCharacter.value.values = currentValues + (currentValues ? '\n\n' : '') + suggestion
      break
    case 'fears':
      const currentFears = editingCharacter.value.fears || ''
      editingCharacter.value.fears = currentFears + (currentFears ? '\n\n' : '') + suggestion
      break
    case 'background':
      const currentBackground = editingCharacter.value.background || ''
      editingCharacter.value.background = currentBackground + (currentBackground ? '\n\n' : '') + suggestion
      break
    case 'skills':
      const currentSkills = editingCharacter.value.skills || ''
      editingCharacter.value.skills = currentSkills + (currentSkills ? '\n\n' : '') + suggestion
      break
    case 'relationships':
      console.log('关系建议:', suggestion)
      message.info('人际关系建议已在控制台输出，请手动添加到关系面板')
      return
  }

  const fieldNames: Record<string, string> = {
    age: '年龄/身份',
    description: '角色描述',
    appearance: '外貌',
    personality: '性格',
    values: '价值观',
    fears: '恐惧弱点',
    background: '背景',
    skills: '技能',
    relationships: '人际关系'
  }

  message.success(`已合并${fieldNames[aspect]}建议`)
}

const addRelationship = () => {
  if (!editingCharacter.value.relationships) {
    editingCharacter.value.relationships = []
  }
  editingCharacter.value.relationships.push({
    character: '',
    type: '',
    importance: '',
    description: ''
  })
}

const removeRelationship = (index: number) => {
  editingCharacter.value.relationships.splice(index, 1)
}

const addCharacter = async () => {
  if (!newCharacter.value.name.trim()) {
    message.error('请输入角色姓名')
    return
  }

  // 如果有AI生成的内容，包含在创建数据中
  const characterData = {
    name: newCharacter.value.name,
    description: newCharacter.value.description
  }

  // 如果有AI生成的详细信息，添加到角色数据中
  if (aiGeneratedCharacter.value) {
    Object.assign(characterData, {
      age: aiGeneratedCharacter.value.age,
      identity: aiGeneratedCharacter.value.identity,
      appearance: aiGeneratedCharacter.value.appearance,
      personality: aiGeneratedCharacter.value.personality,
      background: aiGeneratedCharacter.value.background,
      values: aiGeneratedCharacter.value.values,
      fears: aiGeneratedCharacter.value.fears,
      skills: aiGeneratedCharacter.value.skills
    })
  }

  const created = await createCharacter(characterData)

  if (created) {
    showAddCharacterModal.value = false
    resetNewCharacterForm()
    // 选择新创建的角色
    await selectCharacter(created)
  }
}

const resetNewCharacterForm = () => {
  newCharacter.value = { name: '', description: '', aiPrompt: '' }
  aiGeneratedCharacter.value = null
}

const generateCharacterWithAI = async () => {
  if (!newCharacter.value.aiPrompt?.trim()) {
    message.error('请输入AI生成提示')
    return
  }

  generatingCharacter.value = true

  try {
    const result = await generateCharacter({
      prompt: newCharacter.value.aiPrompt,
      baseInfo: {
        name: newCharacter.value.name,
        description: newCharacter.value.description
      }
    })

    if (result) {
      aiGeneratedCharacter.value = result.character
      if (result.fallback) {
        message.warning('AI服务暂时不可用，已提供基础角色框架')
      } else {
        message.success('AI角色生成成功！请查看预览内容')
      }
    }

  } catch (error) {
    console.error('AI生成错误:', error)
    message.error('AI生成失败，请稍后重试')
  } finally {
    generatingCharacter.value = false
  }
}

const applyAIGeneration = () => {
  if (!aiGeneratedCharacter.value) return

  // 如果AI生成了建议姓名且用户没有输入姓名，则应用建议姓名
  if (aiGeneratedCharacter.value.name && !newCharacter.value.name.trim()) {
    newCharacter.value.name = aiGeneratedCharacter.value.name
  }

  // 如果AI生成了更好的描述，可以选择性更新
  if (aiGeneratedCharacter.value.description && !newCharacter.value.description) {
    newCharacter.value.description = aiGeneratedCharacter.value.description
  }

  message.success('AI生成内容已准备就绪，点击确定创建角色')
}

const clearAIGeneration = () => {
  aiGeneratedCharacter.value = null
  newCharacter.value.aiPrompt = ''
  message.info('已清除AI生成内容')
}

// 防重复加载标志
const isInitializing = ref(false)

// 初始化数据加载函数
const initializeData = async () => {
  // 防止重复初始化
  if (isInitializing.value || !projectStore.currentProject) {
    return
  }

  try {
    isInitializing.value = true

    // 清除当前选择的角色
    selectedCharacter.value = null
    editingCharacter.value = {}

    await loadCharacters()
    // 如果有角色，选择第一个
    if (characters.value.length > 0) {
      await selectCharacter(characters.value[0])
    }
  } finally {
    isInitializing.value = false
  }
}

// 监听项目变化
watch(
  () => projectStore.currentProject,
  async (newProject, oldProject) => {
    // 只有当项目真正发生变化时才重新加载数据
    if (newProject && newProject.id !== oldProject?.id) {
      await initializeData()
    } else if (!newProject) {
      // 如果没有当前项目，清空数据
      selectedCharacter.value = null
      editingCharacter.value = {}
    }
  }
)

// 组件挂载时加载数据
onMounted(async () => {
  // 初始化时加载数据
  if (projectStore.currentProject) {
    await initializeData()
  }
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-1 > * + * {
  margin-top: 0.25rem;
}
</style>
