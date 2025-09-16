<template>
  <div class="h-full flex">
    <!-- Settings Categories (25%) -->
    <div class="w-64 theme-bg-elevated border-r theme-border flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b theme-border">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold theme-text-primary">世界设定</h2>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2">
          <a-button type="primary" block @click="showBatchGenerateModal = true">
            <template #icon>
              <RobotOutlined />
            </template>
            AI批量生成
          </a-button>
          <a-button block @click="showAddSettingModal = true">
            <template #icon>
              <PlusOutlined />
            </template>
            手动新增
          </a-button>
        </div>
      </div>

      <!-- Category Cards -->
      <div class="flex-1 overflow-y-auto p-3">
        <div class="space-y-3">
          <div
            v-for="categoryInfo in categoryInfoList"
            :key="categoryInfo.key"
            @click="selectCategory(categoryInfo.key)"
            class="category-card group relative cursor-pointer rounded-lg border-2 transition-all duration-200"
            :class="[
              currentCategory === categoryInfo.key
                ? 'category-card--active border-blue-500 theme-selected-bg'
                : 'border-transparent theme-bg-container hover:theme-selected-hover hover:border-blue-300',
              'theme-border-hover'
            ]"
          >
            <!-- Card Content -->
            <div class="p-3">
              <!-- Header -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    :class="[
                      currentCategory === categoryInfo.key
                        ? 'bg-blue-500 text-white'
                        : 'theme-icon-bg theme-icon-text'
                    ]"
                  >
                    <component :is="categoryInfo.icon" class="text-sm" />
                  </div>
                  <h3
                    class="font-medium text-sm transition-colors"
                    :class="[
                      currentCategory === categoryInfo.key
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'theme-text-primary'
                    ]"
                  >
                    {{ categoryInfo.title }}
                  </h3>
                </div>

                <!-- Count Badge -->
                <a-badge
                  :count="getCategoryCount(categoryInfo.key)"
                  :number-style="{
                    backgroundColor: currentCategory === categoryInfo.key ? '#1890ff' : undefined,
                    fontSize: '11px',
                    height: '18px',
                    minWidth: '18px',
                    lineHeight: '16px'
                  }"
                />
              </div>

              <!-- Description -->
              <p
                class="text-xs leading-relaxed transition-colors"
                :class="[
                  currentCategory === categoryInfo.key
                    ? 'text-blue-600/80 dark:text-blue-400/80'
                    : 'theme-text-secondary'
                ]"
              >
                {{ categoryInfo.description }}
              </p>

              <!-- Quick Actions (show on hover or active) -->
              <div
                class="mt-2 flex items-center justify-between transition-opacity"
                :class="[
                  currentCategory === categoryInfo.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                ]"
              >
                <div class="flex space-x-1">
                  <a-tooltip title="快速新增">
                    <a-button
                      size="small"
                      type="text"
                      @click.stop="quickAddSetting(categoryInfo.key)"
                      class="w-6 h-6 p-0 flex items-center justify-center"
                    >
                      <PlusOutlined class="text-xs" />
                    </a-button>
                  </a-tooltip>

                  <a-tooltip title="AI生成">
                    <a-button
                      size="small"
                      type="text"
                      @click.stop="quickAIGenerate(categoryInfo.key)"
                      class="w-6 h-6 p-0 flex items-center justify-center"
                    >
                      <RobotOutlined class="text-xs" />
                    </a-button>
                  </a-tooltip>
                </div>

                <!-- Active Indicator -->
                <div
                  v-if="currentCategory === categoryInfo.key"
                  class="w-2 h-2 rounded-full bg-blue-500"
                />
              </div>
            </div>

            <!-- Selection Border Effect -->
            <div
              v-if="currentCategory === categoryInfo.key"
              class="absolute inset-0 rounded-lg border-2 border-blue-500 pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Settings List (35%) -->
    <div class="w-80 theme-bg-container border-r theme-border flex flex-col">
      <div class="p-4 border-b theme-border">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-md font-medium theme-text-primary">
            {{ getCategoryTitle(currentCategory) }}
          </h3>
          <a-tag>{{ currentCategorySettings.length }}</a-tag>
        </div>
        
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索设定..."
          size="small"
        />
      </div>
      
      <div class="flex-1 overflow-y-auto p-2">
        <div
          v-for="setting in filteredSettings"
          :key="setting.id"
          @click="selectSetting(setting)"
          class="p-3 mb-2 rounded-lg cursor-pointer transition-colors"
          :class="selectedSetting?.id === setting.id 
            ? 'theme-selected-bg border theme-selected-border' 
            : 'theme-bg-elevated border theme-border theme-selected-hover'"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <h4 class="text-sm font-medium theme-text-primary truncate">
                  {{ setting.name }}
                </h4>
                <a-tag v-if="setting.isLocked" size="small" color="red">
                  锁定
                </a-tag>
              </div>
              <p class="text-xs theme-text-primary mt-1 line-clamp-3">
                {{ setting.description }}
              </p>
              <div class="flex items-center mt-2 text-xs theme-text-primary">
                <span>{{ getTypeIcon(setting.type) }} {{ getTypeText(setting.type) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentCategorySettings.length === 0" class="text-center py-8 theme-text-primary">
          <GlobalOutlined style="font-size: 32px; margin-bottom: 8px;" />
          <p>暂无{{ getCategoryTitle(currentCategory) }}</p>
          <a-button type="link" @click="showAddSettingModal = true">
            创建第一个设定
          </a-button>
        </div>
      </div>
    </div>

    <!-- Setting Details (40%) -->
    <div class="flex-1 flex flex-col">
      <div v-if="!selectedSetting" class="flex-1 flex items-center justify-center theme-text-primary">
        <div class="text-center">
          <GlobalOutlined style="font-size: 48px; margin-bottom: 16px;" />
          <p>选择一个设定以查看和编辑详情</p>
        </div>
      </div>
      
      <div v-else class="flex-1 flex">
        <!-- Setting Form (70%) -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="max-w-4xl">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-4">
                <div class="w-14 h-14 theme-icon-bg rounded-lg flex items-center justify-center">
                  <component :is="getTypeIconComponent(selectedSetting.type)" class="theme-icon-text text-2xl" />
                </div>
                <div>
                  <h1 class="text-2xl font-bold theme-text-primary">{{ selectedSetting.name }}</h1>
                  <p class="text-sm theme-text-primary">{{ getTypeText(selectedSetting.type) }}</p>
                </div>
              </div>
              <a-space>
                <a-dropdown>
                  <template #overlay>
                    <a-menu @click="handleAIAction">
                      <a-menu-item key="enhance">
                        <RobotOutlined />
                        智能增强
                      </a-menu-item>
                      <a-menu-item key="expand">
                        <ExpandAltOutlined />
                        细节扩展
                      </a-menu-item>
                      <a-menu-item key="suggestions">
                        <BulbOutlined />
                        AI建议
                      </a-menu-item>
                      <a-menu-item key="consistency">
                        <CheckCircleOutlined />
                        一致性检查
                      </a-menu-item>
                    </a-menu>
                  </template>
                  <a-button type="primary">
                    <template #icon>
                      <RobotOutlined />
                    </template>
                    AI工具
                    <DownOutlined />
                  </a-button>
                </a-dropdown>
                <a-button 
                  :type="selectedSetting.isLocked ? 'default' : 'primary'"
                  @click="toggleLock"
                >
                  <template #icon>
                    <LockOutlined v-if="selectedSetting.isLocked" />
                    <UnlockOutlined v-else />
                  </template>
                  {{ selectedSetting.isLocked ? '解锁' : '锁定' }}
                </a-button>
                <a-button danger @click="deleteSetting">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除
                </a-button>
              </a-space>
            </div>

            <!-- Setting Form -->
            <a-form :model="editingSetting" layout="vertical" @finish="saveSetting">
              <a-row :gutter="16" class="mb-4">
                <a-col :span="16">
                  <a-form-item label="设定名称" required>
                    <a-input 
                      v-model:value="editingSetting.name" 
                      placeholder="输入设定名称"
                      :disabled="selectedSetting.isLocked"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="设定类型" required>
                    <a-select 
                      v-model:value="editingSetting.type" 
                      :disabled="selectedSetting.isLocked"
                    >
                      <a-select-option value="worldview">世界观设定</a-select-option>
                      <a-select-option value="location">地理位置</a-select-option>
                      <a-select-option value="rule">规则体系</a-select-option>
                      <a-select-option value="culture">文化背景</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-form-item label="基本描述">
                <a-textarea 
                  v-model:value="editingSetting.description" 
                  :rows="4"
                  placeholder="简要描述这个设定..."
                  :disabled="selectedSetting.isLocked"
                />
              </a-form-item>

              <a-tabs v-model:activeKey="activeTab" type="card">
                <!-- Detail Tab -->
                <a-tab-pane key="details" tab="详细内容">
                  <div class="space-y-6">
                    <a-form-item label="详细内容">
                      <a-textarea
                        v-model:value="editingSetting.detailsText"
                        :rows="12"
                        placeholder="请详细描述这个设定的内容、背景、特点等信息..."
                        :disabled="selectedSetting.isLocked"
                      />
                    </a-form-item>
                  </div>
                </a-tab-pane>

                <!-- Relations Tab -->
                <a-tab-pane key="relations" tab="关联设定">
                  <div class="space-y-4">
                    <div 
                      v-for="(relation, index) in editingSetting.relations" 
                      :key="index"
                      class="p-4 border theme-border rounded-lg"
                    >
                      <a-row :gutter="16" align="middle">
                        <a-col :span="8">
                          <a-select 
                            v-model:value="relation.settingId" 
                            placeholder="选择关联设定"
                            :disabled="selectedSetting.isLocked"
                          >
                            <a-select-option 
                              v-for="setting in allSettings.filter(s => s.id !== selectedSetting?.id)" 
                              :key="setting.id" 
                              :value="setting.id"
                            >
                              {{ setting.name }}
                            </a-select-option>
                          </a-select>
                        </a-col>
                        <a-col :span="4">
                          <a-select 
                            v-model:value="relation.type" 
                            placeholder="关系类型"
                            :disabled="selectedSetting.isLocked"
                          >
                            <a-select-option value="contains">包含</a-select-option>
                            <a-select-option value="influences">影响</a-select-option>
                            <a-select-option value="conflicts">冲突</a-select-option>
                            <a-select-option value="supports">支撑</a-select-option>
                          </a-select>
                        </a-col>
                        <a-col :span="10">
                          <a-input 
                            v-model:value="relation.description" 
                            placeholder="关系描述"
                            :disabled="selectedSetting.isLocked"
                          />
                        </a-col>
                        <a-col :span="2">
                          <a-button 
                            type="text" 
                            danger 
                            @click="removeRelation(index)"
                            :disabled="selectedSetting.isLocked"
                          >
                            <DeleteOutlined />
                          </a-button>
                        </a-col>
                      </a-row>
                    </div>
                    
                    <a-button 
                      type="dashed" 
                      block 
                      @click="addRelation"
                      :disabled="selectedSetting.isLocked"
                    >
                      <PlusOutlined />
                      添加关联
                    </a-button>
                  </div>
                </a-tab-pane>

                <!-- Notes Tab -->
                <a-tab-pane key="notes" tab="创作笔记">
                  <a-form-item label="创作笔记">
                    <a-textarea 
                      v-model:value="editingSetting.notes" 
                      :rows="12"
                      placeholder="记录创作想法、灵感、待完善的内容..."
                      :disabled="selectedSetting.isLocked"
                    />
                  </a-form-item>
                </a-tab-pane>
              </a-tabs>

              <div class="mt-6 text-right">
                <a-button 
                  type="primary" 
                  html-type="submit"
                  :disabled="selectedSetting.isLocked"
                >
                  保存修改
                </a-button>
              </div>
            </a-form>
          </div>
        </div>

        <!-- AI Suggestions Panel (30%) -->
        <div class="w-80 theme-bg-elevated border-l theme-border p-4">
          <h3 class="text-sm font-medium theme-text-primary mb-4">AI 建议</h3>
          
          <div class="space-y-4">
            <a-card size="small" title="扩展建议">
              <p class="text-sm theme-text-primary">
                该世界观设定可以进一步细化魔法体系的具体规则和限制。
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                详细展开
              </a-button>
            </a-card>
            
            <a-card size="small" title="一致性检查">
              <p class="text-sm theme-text-primary">
                发现与"古代王国"设定存在时代冲突，建议调整时间线。
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                查看冲突
              </a-button>
            </a-card>
            
            <a-card size="small" title="关联建议">
              <p class="text-sm theme-text-primary">
                建议添加与"主城"位置的关联，增强设定完整性。
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                添加关联
              </a-button>
            </a-card>
          </div>
          
          <div class="mt-6">
            <a-button type="primary" block @click="requestAIExpansion">
              <template #icon>
                <RobotOutlined />
              </template>
              AI 全面分析
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Setting Modal -->
    <a-modal
      v-model:open="showAddSettingModal"
      title="添加新设定"
      @ok="addSetting"
    >
      <a-form :model="newSetting" layout="vertical">
        <a-form-item label="设定类型" required>
          <a-select v-model:value="newSetting.type" placeholder="选择设定类型">
            <a-select-option value="worldview">世界观设定</a-select-option>
            <a-select-option value="location">地理位置</a-select-option>
            <a-select-option value="rule">规则体系</a-select-option>
            <a-select-option value="culture">文化背景</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="设定名称" required>
          <a-input v-model:value="newSetting.name" placeholder="输入设定名称" />
        </a-form-item>
        <a-form-item label="基本描述">
          <a-textarea 
            v-model:value="newSetting.description" 
            :rows="3"
            placeholder="简要描述这个设定..."
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- AI工具模态框 -->
    <a-modal
      v-model:open="showAIModal"
      :title="aiModalTitle"
      width="800px"
      :footer="null"
      :destroyOnClose="true"
    >
      <div class="ai-modal-content">
        <!-- 操作配置区 -->
        <div v-if="!aiResult" class="config-section">
          <!-- 智能增强配置 -->
          <div v-if="aiModalType === 'enhance'" class="space-y-4">
            <a-form layout="vertical">
              <a-form-item label="增强类型">
                <a-select v-model:value="expansionOptions.type">
                  <a-select-option value="comprehensive">全面增强</a-select-option>
                  <a-select-option value="focused">重点增强</a-select-option>
                  <a-select-option value="creative">创意增强</a-select-option>
                  <a-select-option value="practical">实用增强</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="重点扩展方面">
                <a-checkbox-group v-model:value="expansionOptions.aspects">
                  <a-row>
                    <a-col v-for="aspect in getExpansionAspects" :key="aspect" :span="8">
                      <a-checkbox :value="aspect">{{ aspect }}</a-checkbox>
                    </a-col>
                  </a-row>
                </a-checkbox-group>
              </a-form-item>

              <a-form-item label="与情节的关联">
                <a-textarea
                  v-model:value="expansionOptions.plotRelevance"
                  placeholder="描述这个设定在故事中的作用和重要性..."
                  :rows="3"
                />
              </a-form-item>
            </a-form>
          </div>

          <!-- 细节扩展配置 -->
          <div v-else-if="aiModalType === 'expand'" class="space-y-4">
            <a-form layout="vertical">
              <a-form-item label="详细程度">
                <a-select v-model:value="expansionOptions.detailLevel">
                  <a-select-option value="brief">简要补充</a-select-option>
                  <a-select-option value="standard">标准详细</a-select-option>
                  <a-select-option value="comprehensive">全面深入</a-select-option>
                  <a-select-option value="immersive">沉浸式描述</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="重点关注领域">
                <a-checkbox-group v-model:value="expansionOptions.focusAreas">
                  <a-row>
                    <a-col v-for="area in getFocusAreas" :key="area" :span="8">
                      <a-checkbox :value="area">{{ area }}</a-checkbox>
                    </a-col>
                  </a-row>
                </a-checkbox-group>
              </a-form-item>
            </a-form>
          </div>

          <!-- AI建议配置 -->
          <div v-else-if="aiModalType === 'suggestions'" class="space-y-4">
            <a-form layout="vertical">
              <a-form-item label="建议类型">
                <a-select v-model:value="expansionOptions.suggestionType">
                  <a-select-option value="general">综合分析</a-select-option>
                  <a-select-option value="completeness">完整性检查</a-select-option>
                  <a-select-option value="creativity">创意发展</a-select-option>
                  <a-select-option value="consistency">一致性检查</a-select-option>
                  <a-select-option value="integration">情节融合</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </div>

          <!-- 一致性检查配置 -->
          <div v-else-if="aiModalType === 'consistency'" class="space-y-4">
            <a-form layout="vertical">
              <a-form-item label="检查范围">
                <a-select v-model:value="expansionOptions.scope">
                  <a-select-option value="setting">仅当前设定</a-select-option>
                  <a-select-option value="full">全面检查</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </div>

          <div class="text-center mt-6">
            <a-button
              type="primary"
              size="large"
              :loading="aiLoading"
              @click="executeAIAction"
            >
              <template #icon>
                <RobotOutlined />
              </template>
              开始AI分析
            </a-button>
          </div>
        </div>

        <!-- 结果展示区 -->
        <div v-else class="result-section max-h-96 overflow-y-auto">
          <!-- 智能增强结果 -->
          <div v-if="aiModalType === 'enhance' && aiResult" class="space-y-4">
            <div class="theme-ai-enhance-bg theme-ai-enhance-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-enhance-title">增强描述</h4>
              <p class="text-sm theme-ai-enhance-text">{{ aiResult.enhancedDescription || '暂无内容' }}</p>
              <a-button
                type="link"
                size="small"
                @click="applySingleField('description', aiResult.enhancedDescription)"
                v-if="aiResult.enhancedDescription"
              >
                应用到描述
              </a-button>
            </div>

            <!-- 详细字段内容 -->
            <div v-if="aiResult.detailsFields" class="theme-ai-fields-bg theme-ai-fields-border p-4 rounded-lg border">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold theme-ai-fields-title">{{ getSettingTypeName(selectedSetting.type) }}字段</h4>
                <a-button 
                  type="primary" 
                  size="small"
                  @click="applyAllFields"
                >
                  应用所有字段
                </a-button>
              </div>
              
              <div class="space-y-3">
                <div 
                  v-for="(value, fieldKey) in aiResult.detailsFields" 
                  :key="fieldKey"
                  class="border theme-ai-fields-border rounded p-3"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <strong class="text-sm theme-ai-fields-title">{{ getFieldName(fieldKey) }}</strong>
                        <a-tag size="small" color="green">{{ fieldKey }}</a-tag>
                      </div>
                      <div class="text-sm theme-ai-fields-text mb-2">
                        <div v-if="Array.isArray(value)">
                          <a-tag v-for="item in value" :key="item" size="small" class="mr-1 mb-1">
                            {{ item }}
                          </a-tag>
                        </div>
                        <p v-else class="whitespace-pre-wrap">{{ value }}</p>
                      </div>
                    </div>
                    <a-button 
                      size="small" 
                      type="link" 
                      @click="applySingleField(fieldKey, value)"
                    >
                      应用
                    </a-button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="aiResult.expansionSuggestions?.length" class="theme-ai-suggestion-bg theme-ai-suggestion-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-suggestion-title">扩展建议</h4>
              <ul class="text-sm theme-ai-suggestion-text space-y-1">
                <li v-for="suggestion in aiResult.expansionSuggestions" :key="suggestion" class="flex items-start">
                  <BulbOutlined class="theme-ai-suggestion-title mr-2 mt-0.5 flex-shrink-0" />
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>

          <!-- 细节扩展结果 -->
          <div v-else-if="aiModalType === 'expand' && aiResult" class="space-y-4">
            <div class="theme-ai-fields-bg theme-ai-fields-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-fields-title">详细描述</h4>
              <p class="text-sm theme-ai-fields-text">{{ aiResult.detailedDescription || '暂无内容' }}</p>
            </div>

            <div v-if="aiResult.sensoryDetails" class="theme-ai-enhance-bg theme-ai-enhance-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-enhance-title">感官描述</h4>
              <div class="grid grid-cols-2 gap-2">
                <div v-for="(detail, sense) in aiResult.sensoryDetails" :key="sense" class="text-xs">
                  <strong>{{ sense === 'visual' ? '视觉' : sense === 'auditory' ? '听觉' : sense === 'tactile' ? '触觉' : sense === 'olfactory' ? '嗅觉' : '味觉' }}：</strong>
                  <span class="theme-ai-enhance-text">{{ detail || '待完善' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AI建议结果 -->
          <div v-else-if="aiModalType === 'suggestions' && aiResult" class="space-y-4">
            <div v-if="aiResult.actionableItems?.length" class="space-y-2">
              <h4 class="text-sm font-semibold">可执行建议</h4>
              <div
                v-for="item in aiResult.actionableItems"
                :key="item.description"
                class="border border-gray-200 rounded-lg p-3"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <a-tag size="small" :color="item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'blue'">
                        {{ item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低' }}
                      </a-tag>
                      <span class="text-xs text-gray-600">{{ item.category }}</span>
                    </div>
                    <p class="text-sm">{{ item.description }}</p>
                  </div>
                  <a-button size="small" type="link" @click="applyAISuggestion(item)">
                    应用
                  </a-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 一致性检查结果 -->
          <div v-else-if="aiModalType === 'consistency' && aiResult" class="space-y-4">
            <div class="theme-ai-enhance-bg theme-ai-enhance-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-enhance-title">
                总体评分：{{ aiResult.overallScore || 0 }}/100
              </h4>
            </div>

            <div v-if="aiResult.issues?.length" class="space-y-2">
              <h4 class="text-sm font-semibold">发现的问题</h4>
              <div
                v-for="issue in aiResult.issues"
                :key="issue.description"
                class="border border-gray-200 rounded-lg p-3"
              >
                <div class="flex items-start space-x-2">
                  <a-tag size="small" :color="issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'orange' : 'blue'">
                    {{ issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '中等' : '轻微' }}
                  </a-tag>
                  <div class="flex-1">
                    <p class="text-sm font-medium">{{ issue.description }}</p>
                    <p class="text-xs text-gray-600 mt-1">建议：{{ issue.suggestion }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center mt-6 pt-4 border-t">
            <a-space>
              <a-button @click="aiResult = null">重新配置</a-button>
              <a-button type="primary" @click="showAIModal = false">完成</a-button>
            </a-space>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 批量生成世界设定模态框 -->
    <a-modal
      v-model:open="showBatchGenerateModal"
      title="AI批量生成世界设定"
      width="1200px"
      :footer="null"
      :destroyOnClose="true"
    >
      <div class="batch-generate-content">
        <!-- 配置阶段 -->
        <div v-if="!batchGenerateResult" class="config-section">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="生成模式">
                  <a-select v-model:value="batchGenerateOptions.generationMode">
                    <a-select-option value="comprehensive">全面生成 - 创建完整的世界设定体系</a-select-option>
                    <a-select-option value="focused">重点生成 - 专注于核心设定</a-select-option>
                    <a-select-option value="creative">创意生成 - 强调独特性和创新</a-select-option>
                    <a-select-option value="practical">实用生成 - 注重实用性和可操作性</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="设定类型">
                  <a-checkbox-group v-model:value="batchGenerateOptions.settingTypes">
                    <a-space direction="vertical">
                      <a-checkbox value="worldview">世界观设定</a-checkbox>
                      <a-checkbox value="location">地理位置</a-checkbox>
                      <a-checkbox value="rule">规则体系</a-checkbox>
                      <a-checkbox value="culture">文化背景</a-checkbox>
                    </a-space>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="生成数量配置">
              <a-row :gutter="16">
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('worldview')">
                  <a-form-item label="世界观设定">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.worldview"
                      :min="0"
                      :max="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('location')">
                  <a-form-item label="地理位置">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.location"
                      :min="0"
                      :max="5"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('rule')">
                  <a-form-item label="规则体系">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.rule"
                      :min="0"
                      :max="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('culture')">
                  <a-form-item label="文化背景">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.culture"
                      :min="0"
                      :max="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form-item>

            <!-- 自定义提示 -->
            <a-collapse>
              <a-collapse-panel key="custom" header="自定义生成要求（可选）">
                <div class="space-y-4">
                  <a-form-item
                    v-for="type in batchGenerateOptions.settingTypes"
                    :key="type"
                    :label="`${getSettingTypeName(type)}特殊要求`"
                  >
                    <a-textarea
                      v-model:value="batchGenerateOptions.customPrompts[type]"
                      :placeholder="`对${getSettingTypeName(type)}的特殊要求...`"
                      :rows="2"
                    />
                  </a-form-item>
                </div>
              </a-collapse-panel>
            </a-collapse>

            <div class="text-center mt-6">
              <a-button
                type="primary"
                size="large"
                :loading="batchGenerateLoading"
                @click="executeBatchGenerate"
                :disabled="batchGenerateOptions.settingTypes.length === 0"
              >
                <template #icon>
                  <RobotOutlined />
                </template>
                开始批量生成
              </a-button>
            </div>
          </a-form>
        </div>

        <!-- 结果展示阶段 -->
        <div v-else class="result-section">
          <div class="mb-4">
            <a-alert
              :message="`成功生成 ${getTotalGeneratedCount()} 个世界设定`"
              type="success"
              show-icon
              class="mb-4"
            />

            <a-tabs v-model:activeKey="batchResultActiveTab" type="card">
              <a-tab-pane
                v-for="type in Object.keys(batchGenerateResult.generatedSettings)"
                :key="type"
                :tab="`${getSettingTypeName(type)} (${batchGenerateResult.generatedSettings[type].length})`"
              >
                <div class="space-y-4 max-h-96 overflow-y-auto">
                  <div
                    v-for="(setting, index) in batchGenerateResult.generatedSettings[type]"
                    :key="`${type}-${index}`"
                    class="border theme-border rounded-lg p-4"
                  >
                    <div class="flex items-start justify-between mb-2">
                      <div class="flex items-center space-x-3">
                        <a-checkbox
                          v-model:checked="batchSelectedSettings[`${type}-${index}`]"
                          @change="updateBatchSelection(type, index, $event.target.checked)"
                        />
                        <div>
                          <h4 class="font-medium theme-text-primary">{{ setting.name }}</h4>
                          <p class="text-sm theme-text-primary mt-1">{{ setting.description }}</p>
                        </div>
                      </div>
                      <a-tag size="small">{{ getSettingTypeName(type) }}</a-tag>
                    </div>

                    <!-- 详细信息预览 -->
                    <div class="mt-3 pl-6">
                      <a-collapse size="small">
                        <a-collapse-panel key="details" header="查看详细信息">
                          <div class="grid grid-cols-2 gap-2">
                            <div
                              v-for="(value, key) in setting.details"
                              :key="key"
                              class="text-xs"
                            >
                              <strong class="theme-text-primary">{{ getFieldName(key, type) }}:</strong>
                              <span class="theme-text-primary ml-1">
                                <span v-if="Array.isArray(value)">{{ value.join(', ') }}</span>
                                <span v-else>{{ value }}</span>
                              </span>
                            </div>
                          </div>
                        </a-collapse-panel>
                      </a-collapse>
                    </div>
                  </div>
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>

          <!-- 操作按钮 -->
          <div class="text-center pt-4 border-t theme-border">
            <a-space>
              <a-button @click="resetBatchGenerate">重新配置</a-button>
              <a-button
                type="primary"
                :loading="applyBatchLoading"
                @click="applySelectedSettings"
                :disabled="getSelectedSettingsCount() === 0"
              >
                应用选中的设定 ({{ getSelectedSettingsCount() }})
              </a-button>
              <a-button @click="showBatchGenerateModal = false">完成</a-button>
            </a-space>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CrownOutlined,
  RobotOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  ExpandAltOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import type { WorldSetting } from '@/types'
import { settingService } from '@/services/settingService'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()

const allSettings = ref<WorldSetting[]>([])
const loading = ref(false)

const selectedCategory = ref(['worldview'])
const currentCategory = ref('worldview')
const selectedSetting = ref<WorldSetting | null>(null)
const editingSetting = ref<any>({})
const searchQuery = ref('')
const activeTab = ref('details')
const showAddSettingModal = ref(false)
const newSetting = ref({
  type: '',
  name: '',
  description: ''
})

const currentCategorySettings = computed(() => {
  return allSettings.value.filter(setting => setting.type === currentCategory.value)
})

// 类别信息配置
const categoryInfoList = computed(() => [
  {
    key: 'worldview',
    title: '世界观设定',
    description: '构建故事的整体世界观、历史背景和核心设定',
    icon: GlobalOutlined
  },
  {
    key: 'location',
    title: '地理位置',
    description: '设定故事发生的场所、建筑和地理环境',
    icon: EnvironmentOutlined
  },
  {
    key: 'rule',
    title: '规则体系',
    description: '定义世界运行的规则、体系和机制',
    icon: FileTextOutlined
  },
  {
    key: 'culture',
    title: '文化背景',
    description: '描述社会文化、习俗传统和价值观念',
    icon: CrownOutlined
  }
])

// 获取某个类别的设定数量
const getCategoryCount = (categoryKey: string) => {
  return allSettings.value.filter(setting => setting.type === categoryKey).length
}

const filteredSettings = computed(() => {
  if (!searchQuery.value) return currentCategorySettings.value
  return currentCategorySettings.value.filter(setting => 
    setting.name.includes(searchQuery.value) || 
    setting.description.includes(searchQuery.value)
  )
})

const selectCategory = (category: string) => {
  currentCategory.value = category
  selectedSetting.value = null
  if (currentCategorySettings.value.length > 0) {
    selectSetting(currentCategorySettings.value[0])
  }
}

const selectSetting = (setting: WorldSetting) => {
  selectedSetting.value = setting
  editingSetting.value = {
    ...setting,
    detailsText: typeof setting.details === 'object'
      ? Object.entries(setting.details).map(([key, value]) => `${key}: ${value}`).join('\n\n')
      : (setting.details || ''),
    relations: [
      { settingId: '2', type: 'contains', description: '魔法学院坐落在这个大陆上' }
    ],
    notes: '这是创作的核心世界观设定，需要保持一致性。'
  }
}

const getCategoryTitle = (category: string) => {
  const titles = {
    'worldview': '世界观设定',
    'location': '地理位置',
    'rule': '规则体系',
    'culture': '文化背景'
  }
  return titles[category as keyof typeof titles] || category
}

const getTypeText = (type: string) => {
  return getCategoryTitle(type)
}

const getTypeIcon = (type: string) => {
  const icons = {
    'worldview': '🌍',
    'location': '📍',
    'rule': '⚖️',
    'culture': '👑'
  }
  return icons[type as keyof typeof icons] || '📄'
}

const getTypeIconComponent = (type: string) => {
  const components = {
    'worldview': GlobalOutlined,
    'location': EnvironmentOutlined,
    'rule': FileTextOutlined,
    'culture': CrownOutlined
  }
  return components[type as keyof typeof components] || FileTextOutlined
}

const toggleLock = async () => {
  if (!selectedSetting.value) return
  
  try {
    loading.value = true
    const updatedSetting = await settingService.update(selectedSetting.value.id, {
      isLocked: !selectedSetting.value.isLocked
    })
    
    selectedSetting.value.isLocked = updatedSetting.isLocked
    editingSetting.value.isLocked = updatedSetting.isLocked
    
    const index = allSettings.value.findIndex(s => s.id === updatedSetting.id)
    if (index !== -1) {
      allSettings.value[index] = { ...allSettings.value[index], ...updatedSetting }
    }
    
    message.success(updatedSetting.isLocked ? '设定已锁定' : '设定已解锁')
  } catch (error) {
    console.error('Toggle lock failed:', error)
    message.error('操作失败，请重试')
  } finally {
    loading.value = false
  }
}

const saveSetting = async () => {
  if (!selectedSetting.value) return

  try {
    loading.value = true
    const updateData = {
      type: editingSetting.value.type,
      name: editingSetting.value.name,
      description: editingSetting.value.description,
      details: editingSetting.value.detailsText || ''
    }

    const updatedSetting = await settingService.update(selectedSetting.value.id, updateData)

    Object.assign(selectedSetting.value, updatedSetting)

    const index = allSettings.value.findIndex(s => s.id === updatedSetting.id)
    if (index !== -1) {
      allSettings.value[index] = { ...allSettings.value[index], ...updatedSetting }
    }

    message.success('保存成功')
  } catch (error) {
    console.error('Save setting failed:', error)
    message.error('保存失败，请重试')
  } finally {
    loading.value = false
  }
}

const deleteSetting = () => {
  if (!selectedSetting.value) return
  
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除设定「${selectedSetting.value.name}」吗？此操作不可撤销。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        loading.value = true
        await settingService.delete(selectedSetting.value!.id)
        
        allSettings.value = allSettings.value.filter(s => s.id !== selectedSetting.value!.id)
        selectedSetting.value = null
        
        if (currentCategorySettings.value.length > 0) {
          selectSetting(currentCategorySettings.value[0])
        }
        
        message.success('删除成功')
      } catch (error) {
        console.error('Delete setting failed:', error)
        message.error('删除失败，请重试')
      } finally {
        loading.value = false
      }
    }
  })
}

// AI扩展相关状态
const showAIModal = ref(false)
const aiModalType = ref('')
const aiModalTitle = ref('')
const aiResult = ref<any>(null)
const aiLoading = ref(false)
const expansionOptions = ref({
  type: 'comprehensive',
  aspects: [] as string[],
  plotRelevance: '',
  detailLevel: 'standard',
  focusAreas: [] as string[],
  suggestionType: 'general',
  scope: 'setting'
})

// 批量生成相关状态
const showBatchGenerateModal = ref(false)
const batchGenerateResult = ref<any>(null)
const batchGenerateLoading = ref(false)
const applyBatchLoading = ref(false)
const batchResultActiveTab = ref('')
const batchSelectedSettings = ref<Record<string, boolean>>({})
const batchGenerateOptions = ref({
  settingTypes: ['worldview', 'location', 'rule', 'culture'] as string[],
  generationMode: 'comprehensive',
  customPrompts: {} as Record<string, string>,
  count: {
    worldview: 1,
    location: 2,
    rule: 1,
    culture: 1
  }
})

// AI操作处理
const handleAIAction = ({ key }: { key: string }) => {
  if (!selectedSetting.value) return

  aiModalType.value = key
  aiResult.value = null

  const titles = {
    enhance: '智能增强设定',
    expand: '细节扩展',
    suggestions: 'AI建议分析',
    consistency: '一致性检查'
  }

  aiModalTitle.value = titles[key as keyof typeof titles] || 'AI工具'
  showAIModal.value = true
}

// 执行AI操作
const executeAIAction = async () => {
  if (!selectedSetting.value) return

  try {
    aiLoading.value = true

    switch (aiModalType.value) {
      case 'enhance':
        aiResult.value = await settingService.enhance(
          selectedSetting.value.id,
          expansionOptions.value.aspects,
          expansionOptions.value.plotRelevance,
          expansionOptions.value.type
        )
        break
      case 'expand':
        aiResult.value = await settingService.expand(
          selectedSetting.value.id,
          expansionOptions.value.focusAreas,
          expansionOptions.value.detailLevel
        )
        break
      case 'suggestions':
        aiResult.value = await settingService.getSuggestions(
          selectedSetting.value.id,
          expansionOptions.value.suggestionType
        )
        break
      case 'consistency':
        aiResult.value = await settingService.checkConsistency(
          selectedSetting.value.id,
          expansionOptions.value.scope
        )
        break
    }

    message.success('AI分析完成')
  } catch (error) {
    console.error('AI操作失败:', error)
    message.error('AI操作失败，请重试')
  } finally {
    aiLoading.value = false
  }
}

// 应用AI建议
const applyAISuggestion = (suggestion: any) => {
  if (suggestion.category === '内容完善' && aiResult.value?.enhancedDescription) {
    editingSetting.value.description = aiResult.value.enhancedDescription
    message.success('已应用AI建议')
  }
}

// 获取字段中文名称
const getFieldName = (fieldKey: string, settingType?: string) => {
  const type = settingType || selectedSetting.value?.type
  if (!type) return fieldKey

  const fieldMappings = {
    worldview: {
      era: '时代背景',
      factions: '主要势力',
      history: '世界历史',
      specialElements: '特殊元素'
    },
    location: {
      locationType: '位置类型',
      climate: '气候环境',
      population: '人口规模',
      geography: '地理特征',
      importantPlaces: '重要场所'
    },
    rule: {
      ruleTypes: '规则类型',
      coreRules: '核心规则',
      limitations: '限制与约束'
    },
    culture: {
      language: '主要语言',
      religion: '宗教信仰',
      traditions: '文化传统',
      socialStructure: '社会结构',
      values: '价值观念'
    }
  }

  return fieldMappings[type as keyof typeof fieldMappings]?.[fieldKey as keyof any] || fieldKey
}

// 应用单个字段
const applySingleField = async (fieldKey: string, value: any) => {
  if (!selectedSetting.value || !aiResult.value) return

  try {
    loading.value = true
    
    if (fieldKey === 'description') {
      // 应用描述
      await settingService.applyEnhancement(selectedSetting.value.id, {
        enhancedDescription: value,
        applyDescription: true,
        applyFields: []
      })
      
      editingSetting.value.description = value
      selectedSetting.value.description = value
      message.success('已应用增强描述')
    } else {
      // 应用详细字段
      await settingService.applyEnhancement(selectedSetting.value.id, {
        detailsFields: aiResult.value.detailsFields,
        applyDescription: false,
        applyFields: [fieldKey]
      })
      
      if (!editingSetting.value.details) {
        editingSetting.value.details = {}
      }
      editingSetting.value.details[fieldKey] = value
      
      message.success(`已应用${getFieldName(fieldKey)}`)
    }
    
    // 重新加载设定以确保数据一致性
    const updatedSetting = await settingService.getById(selectedSetting.value.id)
    Object.assign(selectedSetting.value, updatedSetting)
    editingSetting.value = { ...updatedSetting }
    
  } catch (error) {
    console.error('应用字段失败:', error)
    message.error('应用失败，请重试')
  } finally {
    loading.value = false
  }
}

// 应用所有字段
const applyAllFields = async () => {
  if (!selectedSetting.value || !aiResult.value?.detailsFields) return

  try {
    loading.value = true
    
    const fieldKeys = Object.keys(aiResult.value.detailsFields)
    
    await settingService.applyEnhancement(selectedSetting.value.id, {
      detailsFields: aiResult.value.detailsFields,
      applyDescription: false,
      applyFields: fieldKeys
    })
    
    // 更新本地数据
    if (!editingSetting.value.details) {
      editingSetting.value.details = {}
    }
    
    fieldKeys.forEach(fieldKey => {
      editingSetting.value.details[fieldKey] = aiResult.value.detailsFields[fieldKey]
    })
    
    message.success(`已应用所有${getSettingTypeName(selectedSetting.value.type)}字段`)
    
    // 重新加载设定以确保数据一致性
    const updatedSetting = await settingService.getById(selectedSetting.value.id)
    Object.assign(selectedSetting.value, updatedSetting)
    editingSetting.value = { ...updatedSetting }
    
  } catch (error) {
    console.error('应用所有字段失败:', error)
    message.error('应用失败，请重试')
  } finally {
    loading.value = false
  }
}

// 获取设定类型名称（如果已存在则使用现有的）
const getSettingTypeName = (type: string) => {
  const names = {
    'worldview': '世界观设定',
    'location': '地理位置',
    'rule': '规则体系',
    'culture': '文化背景'
  }
  return names[type as keyof typeof names] || type
}

// 获取扩展选项
const getExpansionAspects = computed(() => {
  if (!selectedSetting.value) return []

  const aspectsByType = {
    worldview: ['历史背景', '政治体系', '经济制度', '社会结构', '文化传统', '科技水平'],
    location: ['地理特征', '建筑风格', '人口分布', '功能区域', '交通网络', '自然环境'],
    rule: ['运作机制', '适用范围', '限制条件', '例外情况', '执行流程', '违规后果'],
    culture: ['传统习俗', '价值观念', '艺术形式', '语言特色', '宗教信仰', '社会礼仪']
  }

  return aspectsByType[selectedSetting.value.type as keyof typeof aspectsByType] || []
})

const getFocusAreas = computed(() => {
  return ['感官描述', '氛围营造', '功能细节', '文化内涵', '互动要素', '叙事潜力']
})

// 旧的AI扩展方法保持兼容
const requestAIExpansion = () => {
  handleAIAction({ key: 'enhance' })
}

const addRelation = () => {
  if (!editingSetting.value.relations) {
    editingSetting.value.relations = []
  }
  editingSetting.value.relations.push({
    settingId: '',
    type: '',
    description: ''
  })
}

const removeRelation = (index: number) => {
  editingSetting.value.relations.splice(index, 1)
}

const addSetting = async () => {
  if (!newSetting.value.type || !newSetting.value.name) {
    message.error('请填写必填字段')
    return
  }

  if (!projectStore.currentProject?.id) {
    message.error('请先选择项目')
    return
  }

  try {
    loading.value = true
    const createData = {
      novelId: projectStore.currentProject.id,
      type: newSetting.value.type as 'worldview' | 'location' | 'rule' | 'culture',
      name: newSetting.value.name,
      description: newSetting.value.description || '',
      details: ''
    }

    const createdSetting = await settingService.create(createData)
    allSettings.value.push(createdSetting)

    if (createdSetting.type === currentCategory.value) {
      selectSetting(createdSetting)
    }

    showAddSettingModal.value = false
    newSetting.value = { type: '', name: '', description: '' }
    message.success('创建成功')
  } catch (error) {
    console.error('Create setting failed:', error)
    message.error('创建失败，请重试')
  } finally {
    loading.value = false
  }
}

// 快捷操作方法
const quickAddSetting = (categoryType: string) => {
  newSetting.value = {
    type: categoryType,
    name: '',
    description: ''
  }
  showAddSettingModal.value = true
}

const quickAIGenerate = (categoryType: string) => {
  batchGenerateOptions.value = {
    settingTypes: [categoryType],
    generationMode: 'comprehensive',
    customPrompts: {},
    count: { [categoryType]: 1, worldview: 0, location: 0, rule: 0, culture: 0 }
  }
  batchGenerateOptions.value.count[categoryType] = 1
  showBatchGenerateModal.value = true
}

const loadSettings = async () => {
  if (!projectStore.currentProject?.id) return

  try {
    loading.value = true
    const settings = await settingService.getByNovelId(projectStore.currentProject.id)
    allSettings.value = settings

    if (currentCategorySettings.value.length > 0) {
      selectSetting(currentCategorySettings.value[0])
    }
  } catch (error) {
    console.error('Load settings failed:', error)
    message.error('加载设定失败，请重试')
  } finally {
    loading.value = false
  }
}

// Watch for project changes
watch(() => projectStore.currentProject?.id, (newProjectId) => {
  if (newProjectId) {
    selectedSetting.value = null
    loadSettings()
  } else {
    allSettings.value = []
  }
}, { immediate: true })

// 批量生成相关方法
const executeBatchGenerate = async () => {
  if (!projectStore.currentProject?.id) {
    message.error('请先选择项目')
    return
  }

  if (batchGenerateOptions.value.settingTypes.length === 0) {
    message.error('请选择至少一种设定类型')
    return
  }

  try {
    batchGenerateLoading.value = true

    const result = await settingService.batchGenerate(
      projectStore.currentProject.id,
      {
        settingTypes: batchGenerateOptions.value.settingTypes,
        generationMode: batchGenerateOptions.value.generationMode,
        customPrompts: batchGenerateOptions.value.customPrompts,
        count: batchGenerateOptions.value.count
      }
    )

    batchGenerateResult.value = result
    batchResultActiveTab.value = Object.keys(result.generatedSettings)[0] || ''

    // 默认选中所有生成的设定
    const selected: Record<string, boolean> = {}
    Object.keys(result.generatedSettings).forEach(type => {
      result.generatedSettings[type].forEach((_, index) => {
        selected[`${type}-${index}`] = true
      })
    })
    batchSelectedSettings.value = selected

    message.success('批量生成完成')
  } catch (error) {
    console.error('批量生成失败:', error)
    message.error('批量生成失败，请重试')
  } finally {
    batchGenerateLoading.value = false
  }
}

const updateBatchSelection = (type: string, index: number, checked: boolean) => {
  const key = `${type}-${index}`
  batchSelectedSettings.value[key] = checked
}

const getSelectedSettingsCount = () => {
  return Object.values(batchSelectedSettings.value).filter(Boolean).length
}

const getTotalGeneratedCount = () => {
  if (!batchGenerateResult.value) return 0
  return Object.values(batchGenerateResult.value.generatedSettings).reduce(
    (total: number, settings: any[]) => total + settings.length,
    0
  )
}

const applySelectedSettings = async () => {
  if (!projectStore.currentProject?.id || !batchGenerateResult.value) return

  const selectedSettings = []
  Object.keys(batchSelectedSettings.value).forEach(key => {
    if (batchSelectedSettings.value[key]) {
      const [type, indexStr] = key.split('-')
      const index = parseInt(indexStr)
      selectedSettings.push({ type, index })
    }
  })

  if (selectedSettings.length === 0) {
    message.warning('请选择要创建的设定')
    return
  }

  try {
    applyBatchLoading.value = true

    const result = await settingService.applyBatch(projectStore.currentProject.id, {
      generatedSettings: batchGenerateResult.value.generatedSettings,
      selectedSettings
    })

    // 刷新设定列表
    await loadSettings()

    // 关闭模态框并重置状态
    showBatchGenerateModal.value = false
    resetBatchGenerate()

    message.success(`成功创建 ${result.createdCount} 个世界设定`)
  } catch (error) {
    console.error('应用设定失败:', error)
    message.error('应用设定失败，请重试')
  } finally {
    applyBatchLoading.value = false
  }
}

const resetBatchGenerate = () => {
  batchGenerateResult.value = null
  batchSelectedSettings.value = {}
  batchResultActiveTab.value = ''
  batchGenerateOptions.value = {
    settingTypes: ['worldview', 'location', 'rule', 'culture'],
    generationMode: 'comprehensive',
    customPrompts: {},
    count: {
      worldview: 1,
      location: 2,
      rule: 1,
      culture: 1
    }
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Category Card Styles */
.category-card {
  position: relative;
  background: var(--bg-container);
  border: 2px solid transparent;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.category-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark .category-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.category-card--active {
  border-color: #1890ff;
  background: var(--bg-selected);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.dark .category-card--active {
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

/* Theme-aware styles */
.theme-border-hover {
  border-color: transparent;
}

.theme-border-hover:hover {
  border-color: rgba(24, 144, 255, 0.3);
}

.dark .theme-border-hover:hover {
  border-color: rgba(24, 144, 255, 0.4);
}

/* Icon background styles */
.theme-icon-bg {
  background: rgba(0, 0, 0, 0.04);
}

.dark .theme-icon-bg {
  background: rgba(255, 255, 255, 0.08);
}

.theme-icon-text {
  color: var(--text-primary);
}

/* Quick action buttons */
.category-card .ant-btn-text {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.category-card .ant-btn-text:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  border: none;
}

.dark .category-card .ant-btn-text:hover {
  background: rgba(24, 144, 255, 0.15);
  color: #40a9ff;
}

/* Selection border effect */
.category-card--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid #1890ff;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0.6;
}

/* Smooth transitions for all text elements */
.category-card h3,
.category-card p {
  transition: color 0.2s ease;
}

/* Badge styles in dark mode */
.dark .ant-badge-count {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.category-card--active .ant-badge-count {
  background: #1890ff !important;
  color: white !important;
  border: none !important;
}

/* Action buttons spacing */
.category-card .ant-tooltip {
  transition: opacity 0.2s ease;
}

/* Improved spacing and alignment */
.category-card .flex.space-x-1 > * {
  flex-shrink: 0;
}

/* Active state enhancements */
.category-card--active .w-2.h-2 {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .category-card {
    margin: 0 -4px;
  }

  .category-card p {
    font-size: 10px;
    line-height: 1.3;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .category-card {
    border-width: 2px;
    border-style: solid;
    border-color: var(--border-color);
  }

  .category-card--active {
    border-color: #1890ff;
    border-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .category-card,
  .category-card h3,
  .category-card p,
  .theme-icon-bg,
  .theme-icon-text {
    transition: none;
  }

  .category-card--active .w-2.h-2 {
    animation: none;
  }
}
</style>