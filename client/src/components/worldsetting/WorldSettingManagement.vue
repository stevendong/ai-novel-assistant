<template>
  <div class="h-full flex">
    <!-- Settings Categories (25%) -->
    <div class="w-64 theme-bg-elevated border-r theme-border flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b theme-border">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold theme-text-primary">{{ t('worldSetting.title') }}</h2>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2">
          <a-button type="primary" block @click="showBatchGenerateModal = true">
            <template #icon>
              <RobotOutlined />
            </template>
            {{ t('worldSetting.batchGenerate') }}
          </a-button>
          <a-button block @click="showAddSettingModal = true">
            <template #icon>
              <PlusOutlined />
            </template>
            {{ t('worldSetting.addManual') }}
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
                    backgroundColor: currentCategory === categoryInfo.key ? '#1488CC' : undefined,
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
                  <a-tooltip :title="t('worldSetting.quickAdd')">
                    <a-button
                      size="small"
                      type="text"
                      @click.stop="quickAddSetting(categoryInfo.key)"
                      class="w-6 h-6 p-0 flex items-center justify-center"
                    >
                      <PlusOutlined class="text-xs" />
                    </a-button>
                  </a-tooltip>

                  <a-tooltip :title="t('worldSetting.aiGenerate')">
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
          :placeholder="t('worldSetting.searchPlaceholder')"
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
                  {{ t('worldSetting.locked') }}
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
          <p>{{ t('worldSetting.emptyCategory', { category: getCategoryTitle(currentCategory) }) }}</p>
          <a-button type="link" @click="showAddSettingModal = true">
            {{ t('worldSetting.createFirst') }}
          </a-button>
        </div>
      </div>
    </div>

    <!-- Setting Details (40%) -->
    <div class="flex-1 flex flex-col">
      <div v-if="!selectedSetting" class="flex-1 flex items-center justify-center theme-text-primary">
        <div class="text-center">
          <GlobalOutlined style="font-size: 48px; margin-bottom: 16px;" />
          <p>{{ t('worldSetting.selectToView') }}</p>
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
                        {{ t('worldSetting.enhance') }}
                      </a-menu-item>
                      <a-menu-item key="expand">
                        <ExpandAltOutlined />
                        {{ t('worldSetting.expand') }}
                      </a-menu-item>
                      <a-menu-item key="suggestions">
                        <BulbOutlined />
                        {{ t('worldSetting.aiSuggestions') }}
                      </a-menu-item>
                      <a-menu-item key="consistency">
                        <CheckCircleOutlined />
                        {{ t('worldSetting.consistency') }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                  <a-button type="primary">
                    <template #icon>
                      <RobotOutlined />
                    </template>
                    {{ t('worldSetting.aiTools') }}
                    <DownOutlined />
                  </a-button>
                </a-dropdown>
                <a-button
                  :type="showAISuggestionsPanel ? 'primary' : 'default'"
                  @click="showAISuggestionsPanel = !showAISuggestionsPanel"
                >
                  <template #icon>
                    <BulbOutlined />
                  </template>
                  {{ t('worldSetting.aiSuggestions') }}
                </a-button>
                <a-button
                  :type="selectedSetting.isLocked ? 'default' : 'primary'"
                  @click="toggleLock"
                >
                  <template #icon>
                    <LockOutlined v-if="selectedSetting.isLocked" />
                    <UnlockOutlined v-else />
                  </template>
                  {{ selectedSetting.isLocked ? t('worldSetting.unlock') : t('worldSetting.lock') }}
                </a-button>
                <a-button danger @click="deleteSetting">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  {{ t('common.delete') }}
                </a-button>
              </a-space>
            </div>

            <!-- Setting Form -->
            <a-form :model="editingSetting" layout="vertical" @finish="saveSetting">
              <a-row :gutter="16" class="mb-4">
                <a-col :span="16">
                  <a-form-item :label="t('worldSetting.settingName')" required>
                    <a-input 
                      v-model:value="editingSetting.name" 
                      :placeholder="t('worldSetting.enterSettingName')"
                      :disabled="selectedSetting.isLocked"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item :label="t('worldSetting.settingType')" required>
                    <a-select 
                      v-model:value="editingSetting.type" 
                      :disabled="selectedSetting.isLocked"
                    >
                      <a-select-option value="worldview">{{ t('worldSetting.worldview') }}</a-select-option>
                      <a-select-option value="location">{{ t('worldSetting.location') }}</a-select-option>
                      <a-select-option value="rule">{{ t('worldSetting.rule') }}</a-select-option>
                      <a-select-option value="culture">{{ t('worldSetting.culture') }}</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-form-item :label="t('worldSetting.basicDescription')">
                <a-textarea 
                  v-model:value="editingSetting.description" 
                  :rows="4"
                  :placeholder="t('worldSetting.descriptionPlaceholder')"
                  :disabled="selectedSetting.isLocked"
                />
              </a-form-item>

              <a-tabs v-model:activeKey="activeTab" type="card">
                <!-- Detail Tab -->
                <a-tab-pane key="details" :tab="t('worldSetting.details')">
                  <div class="space-y-6">
                    <a-form-item :label="t('worldSetting.details')">
                      <a-textarea
                        v-model:value="editingSetting.detailsText"
                        :rows="12"
                        :placeholder="t('worldSetting.detailsPlaceholder')"
                        :disabled="selectedSetting.isLocked"
                      />
                    </a-form-item>
                  </div>
                </a-tab-pane>

                <!-- Relations Tab -->
                <a-tab-pane key="relations" :tab="t('worldSetting.relatedSettings')">
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
                            :placeholder="t('worldSetting.selectRelated')"
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
                            :placeholder="t('worldSetting.relationTypeLabel')"
                            :disabled="selectedSetting.isLocked"
                          >
                            <a-select-option value="contains">{{ t('worldSetting.relationType.contains') }}</a-select-option>
                            <a-select-option value="influences">{{ t('worldSetting.relationType.influences') }}</a-select-option>
                            <a-select-option value="conflicts">{{ t('worldSetting.relationType.conflicts') }}</a-select-option>
                            <a-select-option value="supports">{{ t('worldSetting.relationType.supports') }}</a-select-option>
                          </a-select>
                        </a-col>
                        <a-col :span="10">
                          <a-input 
                            v-model:value="relation.description" 
                            :placeholder="t('worldSetting.relationDescription')"
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
                      {{ t('worldSetting.addRelation') }}
                    </a-button>
                  </div>
                </a-tab-pane>

                <!-- Notes Tab -->
                <a-tab-pane key="notes" :tab="t('worldSetting.notes')">
                  <a-form-item :label="t('worldSetting.notes')">
                    <a-textarea 
                      v-model:value="editingSetting.notes" 
                      :rows="12"
                      :placeholder="t('worldSetting.notesPlaceholder')"
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
                  {{ t('common.save') }}
                </a-button>
              </div>
            </a-form>
          </div>
        </div>

        <!-- AI Suggestions Panel (30%) -->
        <div v-if="showAISuggestionsPanel" class="w-80 theme-bg-elevated border-l theme-border p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium theme-text-primary">{{ t('worldSetting.aiSuggestionsPanel') }}</h3>
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
          
          <div class="space-y-4">
            <a-card size="small" :title="t('worldSetting.expansionSuggestions')">
              <p class="text-sm theme-text-primary">
                {{ t('worldSetting.sampleExpansionSuggestion') }}
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                {{ t('worldSetting.detailExpand') }}
              </a-button>
            </a-card>
            
            <a-card size="small" :title="t('worldSetting.consistencyCheck')">
              <p class="text-sm theme-text-primary">
                {{ t('worldSetting.sampleConsistencyIssue') }}
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                {{ t('worldSetting.viewConflict') }}
              </a-button>
            </a-card>
            
            <a-card size="small" :title="t('worldSetting.relationSuggestion')">
              <p class="text-sm theme-text-primary">
                {{ t('worldSetting.sampleRelationSuggestion') }}
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                {{ t('worldSetting.addRelation') }}
              </a-button>
            </a-card>
          </div>
          
          <div class="mt-6">
            <a-button type="primary" block @click="requestAIExpansion">
              <template #icon>
                <RobotOutlined />
              </template>
              {{ t('worldSetting.aiComprehensiveAnalysis') }}
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Setting Modal -->
    <a-modal
      v-model:open="showAddSettingModal"
      :title="t('worldSetting.addNewSettingTitle')"
      @ok="addSetting"
    >
      <a-form :model="newSetting" layout="vertical">
        <a-form-item :label="t('worldSetting.settingType')" required>
          <a-select v-model:value="newSetting.type" :placeholder="t('worldSetting.selectSettingTypePlaceholder')">
            <a-select-option value="worldview">{{ t('worldSetting.worldview') }}</a-select-option>
            <a-select-option value="location">{{ t('worldSetting.location') }}</a-select-option>
            <a-select-option value="rule">{{ t('worldSetting.rule') }}</a-select-option>
            <a-select-option value="culture">{{ t('worldSetting.culture') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('worldSetting.settingName')" required>
          <a-input v-model:value="newSetting.name" :placeholder="t('worldSetting.enterSettingName')" />
        </a-form-item>
        <a-form-item :label="t('worldSetting.basicDescription')">
          <a-textarea 
            v-model:value="newSetting.description" 
            :rows="3"
            :placeholder="t('worldSetting.descriptionPlaceholder')"
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
              <a-form-item :label="t('worldSetting.enhanceTypeTitle')">
                <a-select v-model:value="expansionOptions.type">
                  <a-select-option value="comprehensive">{{ t('worldSetting.enhanceType.comprehensive') }}</a-select-option>
                  <a-select-option value="focused">{{ t('worldSetting.enhanceType.focused') }}</a-select-option>
                  <a-select-option value="creative">{{ t('worldSetting.enhanceType.creative') }}</a-select-option>
                  <a-select-option value="practical">{{ t('worldSetting.enhanceType.practical') }}</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item :label="t('worldSetting.expansionAspects')">
                <a-checkbox-group v-model:value="expansionOptions.aspects">
                  <a-row>
                    <a-col v-for="aspect in getExpansionAspects" :key="aspect" :span="8">
                      <a-checkbox :value="aspect">{{ aspect }}</a-checkbox>
                    </a-col>
                  </a-row>
                </a-checkbox-group>
              </a-form-item>

              <a-form-item :label="t('worldSetting.plotRelevance')">
                <a-textarea
                  v-model:value="expansionOptions.plotRelevance"
                  :placeholder="t('worldSetting.plotRelevancePlaceholder')"
                  :rows="3"
                />
              </a-form-item>
            </a-form>
          </div>

          <!-- 细节扩展配置 -->
          <div v-else-if="aiModalType === 'expand'" class="space-y-4">
            <a-form layout="vertical">
              <a-form-item :label="t('worldSetting.detailLevel')">
                <a-select v-model:value="expansionOptions.detailLevel">
                  <a-select-option value="brief">{{ t('worldSetting.detailLevelOptions.brief') }}</a-select-option>
                  <a-select-option value="standard">{{ t('worldSetting.detailLevelOptions.standard') }}</a-select-option>
                  <a-select-option value="comprehensive">{{ t('worldSetting.detailLevelOptions.comprehensive') }}</a-select-option>
                  <a-select-option value="immersive">{{ t('worldSetting.detailLevelOptions.immersive') }}</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item :label="t('worldSetting.focusAreas')">
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
              <a-form-item :label="t('worldSetting.suggestionType')">
                <a-select v-model:value="expansionOptions.suggestionType">
                  <a-select-option value="general">{{ t('worldSetting.suggestionTypeOptions.general') }}</a-select-option>
                  <a-select-option value="completeness">{{ t('worldSetting.suggestionTypeOptions.completeness') }}</a-select-option>
                  <a-select-option value="creativity">{{ t('worldSetting.suggestionTypeOptions.creativity') }}</a-select-option>
                  <a-select-option value="consistency">{{ t('worldSetting.suggestionTypeOptions.consistency') }}</a-select-option>
                  <a-select-option value="integration">{{ t('worldSetting.suggestionTypeOptions.integration') }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </div>

          <!-- 一致性检查配置 -->
          <div v-else-if="aiModalType === 'consistency'" class="space-y-4">
            <a-form layout="vertical">
              <a-form-item :label="t('worldSetting.scope')">
                <a-select v-model:value="expansionOptions.scope">
                  <a-select-option value="setting">{{ t('worldSetting.scopeOptions.setting') }}</a-select-option>
                  <a-select-option value="full">{{ t('worldSetting.scopeOptions.full') }}</a-select-option>
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
              {{ t('worldSetting.startAIAnalysis') }}
            </a-button>
          </div>
        </div>

        <!-- 结果展示区 -->
        <div v-else class="result-section max-h-96 overflow-y-auto">
          <!-- 智能增强结果 -->
          <div v-if="aiModalType === 'enhance' && aiResult" class="space-y-4">
            <div class="theme-ai-enhance-bg theme-ai-enhance-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-enhance-title">{{ t('worldSetting.enhancedDescription') }}</h4>
              <p class="text-sm theme-ai-enhance-text">{{ aiResult.enhancedDescription || t('common.noContent') }}</p>
              <a-button
                type="link"
                size="small"
                @click="applySingleField('description', aiResult.enhancedDescription)"
                v-if="aiResult.enhancedDescription"
              >
                {{ t('worldSetting.applyToDescription') }}
              </a-button>
            </div>

            <!-- 详细字段内容 -->
            <div v-if="aiResult.detailsFields" class="theme-ai-fields-bg theme-ai-fields-border p-4 rounded-lg border">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold theme-ai-fields-title">{{ `${getSettingTypeName(selectedSetting.type)} ${t('worldSetting.fields')}` }}</h4>
                <a-button 
                  type="primary" 
                  size="small"
                  @click="applyAllFields"
                >
                  {{ t('worldSetting.applyAllFields') }}
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
                      {{ t('common.apply') }}
                    </a-button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="aiResult.expansionSuggestions?.length" class="theme-ai-suggestion-bg theme-ai-suggestion-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-suggestion-title">{{ t('worldSetting.expansionSuggestions') }}</h4>
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
              <h4 class="text-sm font-semibold mb-2 theme-ai-fields-title">{{ t('worldSetting.detailDescription') }}</h4>
              <p class="text-sm theme-ai-fields-text">{{ aiResult.detailedDescription || t('common.noContent') }}</p>
            </div>

            <div v-if="aiResult.sensoryDetails" class="theme-ai-enhance-bg theme-ai-enhance-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-enhance-title">{{ t('worldSetting.sensoryDetails') }}</h4>
              <div class="grid grid-cols-2 gap-2">
                <div v-for="(detail, sense) in aiResult.sensoryDetails" :key="sense" class="text-xs">
                  <strong>{{ t(`worldSetting.sense.${sense}`) }}：</strong>
                  <span class="theme-ai-enhance-text">{{ detail || t('worldSetting.pendingContent') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AI建议结果 -->
          <div v-else-if="aiModalType === 'suggestions' && aiResult" class="space-y-4">
            <div v-if="aiResult.actionableItems?.length" class="space-y-2">
              <h4 class="text-sm font-semibold">{{ t('worldSetting.actionableItems') }}</h4>
              <div
                v-for="item in aiResult.actionableItems"
                :key="item.description"
                class="border border-gray-200 rounded-lg p-3"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <a-tag size="small" :color="item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'blue'">
                        {{ item.priority === 'high' ? t('common.priority.high') : item.priority === 'medium' ? t('common.priority.medium') : t('common.priority.low') }}
                      </a-tag>
                      <span class="text-xs text-gray-600">{{ item.category }}</span>
                    </div>
                    <p class="text-sm">{{ item.description }}</p>
                  </div>
                  <a-button size="small" type="link" @click="applyAISuggestion(item)">
                    {{ t('common.apply') }}
                  </a-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 一致性检查结果 -->
          <div v-else-if="aiModalType === 'consistency' && aiResult" class="space-y-4">
            <div class="theme-ai-enhance-bg theme-ai-enhance-border p-4 rounded-lg border">
              <h4 class="text-sm font-semibold mb-2 theme-ai-enhance-title">
                {{ t('worldSetting.overallScore') }} {{ aiResult.overallScore || 0 }}/100
              </h4>
            </div>

            <div v-if="aiResult.issues?.length" class="space-y-2">
              <h4 class="text-sm font-semibold">{{ t('worldSetting.foundIssues') }}</h4>
              <div
                v-for="issue in aiResult.issues"
                :key="issue.description"
                class="border border-gray-200 rounded-lg p-3"
              >
                <div class="flex items-start space-x-2">
                  <a-tag size="small" :color="issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'orange' : 'blue'">
                    {{ issue.severity === 'high' ? t('common.severity.high') : issue.severity === 'medium' ? t('common.severity.medium') : t('common.severity.low') }}
                  </a-tag>
                  <div class="flex-1">
                    <p class="text-sm font-medium">{{ issue.description }}</p>
                    <p class="text-xs text-gray-600 mt-1">{{ t('common.suggestion') }} {{ issue.suggestion }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center mt-6 pt-4 border-t">
            <a-space>
              <a-button @click="aiResult = null">{{ t('common.reconfigure') }}</a-button>
              <a-button type="primary" @click="showAIModal = false">{{ t('common.complete') }}</a-button>
            </a-space>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 批量生成世界设定模态框 -->
    <a-modal
      v-model:open="showBatchGenerateModal"
      :title="t('worldSetting.batchGenerateTitle')"
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
                <a-form-item :label="t('worldSetting.generationMode')">
                  <a-select v-model:value="batchGenerateOptions.generationMode">
                    <a-select-option value="comprehensive">{{ t('worldSetting.mode.comprehensive') }}</a-select-option>
                    <a-select-option value="focused">{{ t('worldSetting.mode.focused') }}</a-select-option>
                    <a-select-option value="creative">{{ t('worldSetting.mode.creative') }}</a-select-option>
                    <a-select-option value="practical">{{ t('worldSetting.mode.practical') }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item :label="t('worldSetting.settingTypes')">
                  <a-checkbox-group v-model:value="batchGenerateOptions.settingTypes">
                    <a-space direction="vertical">
                      <a-checkbox value="worldview">{{ t('worldSetting.worldview') }}</a-checkbox>
                      <a-checkbox value="location">{{ t('worldSetting.location') }}</a-checkbox>
                      <a-checkbox value="rule">{{ t('worldSetting.rule') }}</a-checkbox>
                      <a-checkbox value="culture">{{ t('worldSetting.culture') }}</a-checkbox>
                    </a-space>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item :label="t('worldSetting.generationConfig')">
              <a-row :gutter="16">
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('worldview')">
                  <a-form-item :label="t('worldSetting.worldview')">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.worldview"
                      :min="0"
                      :max="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('location')">
                  <a-form-item :label="t('worldSetting.location')">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.location"
                      :min="0"
                      :max="5"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('rule')">
                  <a-form-item :label="t('worldSetting.rule')">
                    <a-input-number
                      v-model:value="batchGenerateOptions.count.rule"
                      :min="0"
                      :max="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="batchGenerateOptions.settingTypes.includes('culture')">
                  <a-form-item :label="t('worldSetting.culture')">
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
              <a-collapse-panel key="custom" :header="t('worldSetting.customRequirements')">
                <div class="space-y-4">
                  <a-form-item
                    v-for="type in batchGenerateOptions.settingTypes"
                    :key="type"
                    :label="t('worldSetting.specialRequirements', { type: getSettingTypeName(type) })"
                  >
                    <a-textarea
                      v-model:value="batchGenerateOptions.customPrompts[type]"
                      :placeholder="t('worldSetting.specialRequirementsPlaceholder', { type: getSettingTypeName(type) })"
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
                {{ t('worldSetting.startBatchGenerate') }}
              </a-button>
            </div>
          </a-form>
        </div>

        <!-- 结果展示阶段 -->
        <div v-else class="result-section">
          <div class="mb-4">
            <a-alert
              :message="t('worldSetting.successGenerated', { count: getTotalGeneratedCount() })"
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
                        <a-collapse-panel key="details" :header="t('common.viewDetails')">
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
              <a-button @click="resetBatchGenerate">{{ t('common.reconfigure') }}</a-button>
              <a-button
                type="primary"
                :loading="applyBatchLoading"
                @click="applySelectedSettings"
                :disabled="getSelectedSettingsCount() === 0"
              >
                {{ t('worldSetting.applySelected', { count: getSelectedSettingsCount() }) }}
              </a-button>
              <a-button @click="showBatchGenerateModal = false">{{ t('common.complete') }}</a-button>
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
  DownOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'
import type { WorldSetting } from '@/types'
import { settingService } from '@/services/settingService'
import { useProjectStore } from '@/stores/project'
import { useI18n } from 'vue-i18n'

const projectStore = useProjectStore()
const { t } = useI18n()
const CONTENT_ENHANCEMENT_CATEGORIES = ['内容完善', 'Content Enhancement']

const allSettings = ref<WorldSetting[]>([])
const loading = ref(false)

const selectedCategory = ref(['worldview'])
const currentCategory = ref('worldview')
const selectedSetting = ref<WorldSetting | null>(null)
const editingSetting = ref<any>({})
const searchQuery = ref('')
const activeTab = ref('details')
const showAddSettingModal = ref(false)
const showAISuggestionsPanel = ref(true)
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
    title: t('worldSetting.worldview'),
    description: t('worldSetting.worldviewDesc'),
    icon: GlobalOutlined
  },
  {
    key: 'location',
    title: t('worldSetting.location'),
    description: t('worldSetting.locationDesc'),
    icon: EnvironmentOutlined
  },
  {
    key: 'rule',
    title: t('worldSetting.rule'),
    description: t('worldSetting.ruleDesc'),
    icon: FileTextOutlined
  },
  {
    key: 'culture',
    title: t('worldSetting.culture'),
    description: t('worldSetting.cultureDesc'),
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
    relations: Array.isArray((setting as any).relations) ? [...(setting as any).relations] : [],
    notes: (setting as any).notes || ''
  }
}

const getCategoryTitle = (category: string) => {
  const titles: Record<string, string> = {
    worldview: t('worldSetting.worldview'),
    location: t('worldSetting.location'),
    rule: t('worldSetting.rule'),
    culture: t('worldSetting.culture')
  }
  return titles[category] || category
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
    
    message.success(updatedSetting.isLocked ? t('worldSetting.lockSuccess') : t('worldSetting.unlockSuccess'))
  } catch (error) {
    console.error('Toggle lock failed:', error)
    message.error(t('message.updateFailed'))
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

    message.success(t('message.saveSuccess'))
  } catch (error) {
    console.error('Save setting failed:', error)
    message.error(t('message.saveFailed'))
  } finally {
    loading.value = false
  }
}

const deleteSetting = () => {
  if (!selectedSetting.value) return
  
  Modal.confirm({
    title: t('worldSetting.deleteConfirm'),
    content: t('worldSetting.deleteWarning', { name: selectedSetting.value.name }),
    okText: t('common.delete'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    async onOk() {
      try {
        loading.value = true
        await settingService.delete(selectedSetting.value!.id)
        
        allSettings.value = allSettings.value.filter(s => s.id !== selectedSetting.value!.id)
        selectedSetting.value = null
        
        if (currentCategorySettings.value.length > 0) {
          selectSetting(currentCategorySettings.value[0])
        }
        
        message.success(t('message.deleteSuccess'))
      } catch (error) {
        console.error('Delete setting failed:', error)
        message.error(t('message.deleteFailed'))
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
    enhance: t('worldSetting.enhanceModalTitle'),
    expand: t('worldSetting.expandModalTitle'),
    suggestions: t('worldSetting.suggestionsModalTitle'),
    consistency: t('worldSetting.consistencyModalTitle')
  }

  aiModalTitle.value = titles[key as keyof typeof titles] || t('worldSetting.aiTools')
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

    message.success(t('worldSetting.aiAnalysisSuccess'))
  } catch (error) {
    console.error('AI action failed:', error)
    message.error(t('worldSetting.aiActionFailed'))
  } finally {
    aiLoading.value = false
  }
}

// 应用AI建议
const applyAISuggestion = (suggestion: any) => {
  if (CONTENT_ENHANCEMENT_CATEGORIES.includes(suggestion.category) && aiResult.value?.enhancedDescription) {
    editingSetting.value.description = aiResult.value.enhancedDescription
    message.success(t('worldSetting.applySuggestionSuccess'))
  }
}

// 获取字段中文名称
const getFieldName = (fieldKey: string, settingType?: string) => {
  const type = settingType || selectedSetting.value?.type
  if (!type) return fieldKey

  const fieldMappings = {
    worldview: {
      era: 'worldSetting.fieldNames.era',
      factions: 'worldSetting.fieldNames.factions',
      history: 'worldSetting.fieldNames.history',
      specialElements: 'worldSetting.fieldNames.specialElements'
    },
    location: {
      locationType: 'worldSetting.fieldNames.locationType',
      climate: 'worldSetting.fieldNames.climate',
      population: 'worldSetting.fieldNames.population',
      geography: 'worldSetting.fieldNames.geography',
      importantPlaces: 'worldSetting.fieldNames.importantPlaces'
    },
    rule: {
      ruleTypes: 'worldSetting.fieldNames.ruleTypes',
      coreRules: 'worldSetting.fieldNames.coreRules',
      limitations: 'worldSetting.fieldNames.limitations'
    },
    culture: {
      language: 'worldSetting.fieldNames.language',
      religion: 'worldSetting.fieldNames.religion',
      traditions: 'worldSetting.fieldNames.traditions',
      socialStructure: 'worldSetting.fieldNames.socialStructure',
      values: 'worldSetting.fieldNames.values'
    }
  }

  const key = fieldMappings[type as keyof typeof fieldMappings]?.[fieldKey as keyof any]
  return key ? t(key) : fieldKey
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
      message.success(t('worldSetting.applyEnhancedDescription'))
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
      
      message.success(t('worldSetting.applyFieldSuccess', { field: getFieldName(fieldKey) }))
    }
    
    // 重新加载设定以确保数据一致性
    const updatedSetting = await settingService.getById(selectedSetting.value.id)
    Object.assign(selectedSetting.value, updatedSetting)
    editingSetting.value = { ...updatedSetting }
    
  } catch (error) {
    console.error('Apply field failed:', error)
    message.error(t('message.updateFailed'))
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
    
    message.success(t('worldSetting.applyAllFieldsSuccess', { type: getSettingTypeName(selectedSetting.value.type) }))
    
    // 重新加载设定以确保数据一致性
    const updatedSetting = await settingService.getById(selectedSetting.value.id)
    Object.assign(selectedSetting.value, updatedSetting)
    editingSetting.value = { ...updatedSetting }
    
  } catch (error) {
    console.error('Apply all fields failed:', error)
    message.error(t('message.updateFailed'))
  } finally {
    loading.value = false
  }
}

// 获取设定类型名称（如果已存在则使用现有的）
const getSettingTypeName = (type: string) => {
  return getCategoryTitle(type)
}

// 获取扩展选项
const getExpansionAspects = computed(() => {
  if (!selectedSetting.value) return []

  const aspectsByType = {
    worldview: ['history', 'politics', 'economy', 'society', 'culture', 'technology'],
    location: ['geography', 'architecture', 'population', 'functionalAreas', 'transportation', 'environment'],
    rule: ['mechanism', 'scope', 'limitations', 'exceptions', 'process', 'consequences'],
    culture: ['customs', 'values', 'arts', 'language', 'religion', 'etiquette']
  }

  const type = selectedSetting.value.type as keyof typeof aspectsByType
  const aspects = aspectsByType[type] || []
  return aspects.map(aspect => t(`worldSetting.aspectOptions.${type}.${aspect}`))
})

const getFocusAreas = computed(() => {
  const areas = t('worldSetting.focusAreasList') as unknown
  return Array.isArray(areas) ? areas : []
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
    message.error(t('worldSetting.fillRequired'))
    return
  }

  if (!projectStore.currentProject?.id) {
    message.error(t('worldSetting.selectProject'))
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
    message.success(t('message.createSuccess'))
  } catch (error) {
    console.error('Create setting failed:', error)
    message.error(t('message.createFailed'))
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
    message.error(t('worldSetting.loadFailed'))
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
    message.error(t('worldSetting.selectProject'))
    return
  }

  if (batchGenerateOptions.value.settingTypes.length === 0) {
    message.error(t('worldSetting.selectSettingType'))
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

    message.success(t('worldSetting.batchGenerateSuccess'))
  } catch (error) {
    console.error('Batch generation failed:', error)
    message.error(t('worldSetting.batchGenerateFailed'))
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
    message.warning(t('worldSetting.selectSettingsToApply'))
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

    message.success(t('worldSetting.applyBatchSuccess', { count: result.createdCount }))
  } catch (error) {
    console.error('Apply settings failed:', error)
    message.error(t('worldSetting.applyBatchFailed'))
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
  border-color: #1488CC;
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
  color: #1488CC;
  border: none;
}

.dark .category-card .ant-btn-text:hover {
  background: rgba(24, 144, 255, 0.15);
  color: #1488CC;
}

/* Selection border effect */
.category-card--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid #1488CC;
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
  background: #1488CC !important;
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
    border-color: #1488CC;
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
