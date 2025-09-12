<template>
  <div class="h-full flex">
    <!-- Settings Categories (25%) -->
    <div class="w-64 theme-bg-elevated border-r theme-border flex flex-col">
      <div class="p-4 border-b theme-border">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold theme-text-primary">世界设定</h2>
          <a-button type="primary" size="small" @click="showAddSettingModal = true">
            <template #icon>
              <PlusOutlined />
            </template>
            新增
          </a-button>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <a-menu v-model:selectedKeys="selectedCategory" mode="inline" class="border-0">
          <a-menu-item key="worldview" @click="selectCategory('worldview')">
            <template #icon>
              <GlobalOutlined />
            </template>
            世界观设定
          </a-menu-item>
          <a-menu-item key="location" @click="selectCategory('location')">
            <template #icon>
              <EnvironmentOutlined />
            </template>
            地理位置
          </a-menu-item>
          <a-menu-item key="rule" @click="selectCategory('rule')">
            <template #icon>
              <FileTextOutlined />
            </template>
            规则体系
          </a-menu-item>
          <a-menu-item key="culture" @click="selectCategory('culture')">
            <template #icon>
              <CrownOutlined />
            </template>
            文化背景
          </a-menu-item>
        </a-menu>
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
                <a-button @click="requestAIExpansion">
                  <template #icon>
                    <RobotOutlined />
                  </template>
                  AI扩展
                </a-button>
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
                <a-tab-pane key="details" tab="详细信息">
                  <div class="space-y-6">
                    <div v-if="selectedSetting.type === 'worldview'">
                      <h4 class="text-sm font-medium theme-text-primary mb-3">世界观要素</h4>
                      <a-row :gutter="16">
                        <a-col :span="12">
                          <a-form-item label="时代背景">
                            <a-input 
                              v-model:value="editingSetting.details.era" 
                              placeholder="如：中世纪奇幻、现代都市、未来科幻"
                              :disabled="selectedSetting.isLocked"
                            />
                          </a-form-item>
                        </a-col>
                        <a-col :span="12">
                          <a-form-item label="主要势力">
                            <a-input 
                              v-model:value="editingSetting.details.factions" 
                              placeholder="主要的国家、组织、势力"
                              :disabled="selectedSetting.isLocked"
                            />
                          </a-form-item>
                        </a-col>
                      </a-row>
                      
                      <a-form-item label="世界历史">
                        <a-textarea 
                          v-model:value="editingSetting.details.history" 
                          :rows="6"
                          placeholder="世界的形成历史、重大事件、时间线..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                      
                      <a-form-item label="特殊元素">
                        <a-textarea 
                          v-model:value="editingSetting.details.specialElements" 
                          :rows="4"
                          placeholder="魔法体系、科技水平、超自然现象等..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                    </div>

                    <div v-else-if="selectedSetting.type === 'location'">
                      <h4 class="text-sm font-medium theme-text-primary mb-3">地理信息</h4>
                      <a-row :gutter="16">
                        <a-col :span="8">
                          <a-form-item label="位置类型">
                            <a-select 
                              v-model:value="editingSetting.details.locationType"
                              :disabled="selectedSetting.isLocked"
                            >
                              <a-select-option value="city">城市</a-select-option>
                              <a-select-option value="village">村庄</a-select-option>
                              <a-select-option value="building">建筑</a-select-option>
                              <a-select-option value="landscape">自然景观</a-select-option>
                              <a-select-option value="other">其他</a-select-option>
                            </a-select>
                          </a-form-item>
                        </a-col>
                        <a-col :span="8">
                          <a-form-item label="气候环境">
                            <a-input 
                              v-model:value="editingSetting.details.climate" 
                              placeholder="温带、寒带、热带等"
                              :disabled="selectedSetting.isLocked"
                            />
                          </a-form-item>
                        </a-col>
                        <a-col :span="8">
                          <a-form-item label="人口规模">
                            <a-input 
                              v-model:value="editingSetting.details.population" 
                              placeholder="人口数量或规模"
                              :disabled="selectedSetting.isLocked"
                            />
                          </a-form-item>
                        </a-col>
                      </a-row>
                      
                      <a-form-item label="地理特征">
                        <a-textarea 
                          v-model:value="editingSetting.details.geography" 
                          :rows="4"
                          placeholder="地形地貌、重要建筑、地标等..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                      
                      <a-form-item label="重要场所">
                        <a-textarea 
                          v-model:value="editingSetting.details.importantPlaces" 
                          :rows="4"
                          placeholder="重要的场所、建筑、区域..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                    </div>

                    <div v-else-if="selectedSetting.type === 'rule'">
                      <h4 class="text-sm font-medium theme-text-primary mb-3">规则体系</h4>
                      
                      <a-form-item label="规则类型">
                        <a-checkbox-group 
                          v-model:value="editingSetting.details.ruleTypes"
                          :disabled="selectedSetting.isLocked"
                        >
                          <a-checkbox value="magic">魔法体系</a-checkbox>
                          <a-checkbox value="technology">科技体系</a-checkbox>
                          <a-checkbox value="social">社会制度</a-checkbox>
                          <a-checkbox value="economic">经济体系</a-checkbox>
                          <a-checkbox value="political">政治体系</a-checkbox>
                          <a-checkbox value="military">军事体系</a-checkbox>
                        </a-checkbox-group>
                      </a-form-item>
                      
                      <a-form-item label="核心规则">
                        <a-textarea 
                          v-model:value="editingSetting.details.coreRules" 
                          :rows="6"
                          placeholder="描述这个体系的核心规则和运作机制..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                      
                      <a-form-item label="限制与约束">
                        <a-textarea 
                          v-model:value="editingSetting.details.limitations" 
                          :rows="4"
                          placeholder="这个体系的限制、弱点、代价..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                    </div>

                    <div v-else-if="selectedSetting.type === 'culture'">
                      <h4 class="text-sm font-medium theme-text-primary mb-3">文化特征</h4>
                      
                      <a-row :gutter="16">
                        <a-col :span="12">
                          <a-form-item label="主要语言">
                            <a-input 
                              v-model:value="editingSetting.details.language" 
                              placeholder="使用的语言"
                              :disabled="selectedSetting.isLocked"
                            />
                          </a-form-item>
                        </a-col>
                        <a-col :span="12">
                          <a-form-item label="宗教信仰">
                            <a-input 
                              v-model:value="editingSetting.details.religion" 
                              placeholder="主要信仰"
                              :disabled="selectedSetting.isLocked"
                            />
                          </a-form-item>
                        </a-col>
                      </a-row>
                      
                      <a-form-item label="文化传统">
                        <a-textarea 
                          v-model:value="editingSetting.details.traditions" 
                          :rows="4"
                          placeholder="节日庆典、传统习俗、仪式..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                      
                      <a-form-item label="社会结构">
                        <a-textarea 
                          v-model:value="editingSetting.details.socialStructure" 
                          :rows="4"
                          placeholder="社会等级、家族结构、权力分配..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                      
                      <a-form-item label="价值观念">
                        <a-textarea 
                          v-model:value="editingSetting.details.values" 
                          :rows="3"
                          placeholder="重视的品质、道德观念..."
                          :disabled="selectedSetting.isLocked"
                        />
                      </a-form-item>
                    </div>
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
  DeleteOutlined
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
      details: editingSetting.value.details || {}
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

const requestAIExpansion = async () => {
  if (!selectedSetting.value) return
  
  try {
    loading.value = true
    const expansion = await settingService.enhance(selectedSetting.value.id)
    console.log('AI expansion result:', expansion)
    message.success('AI分析完成')
  } catch (error) {
    console.error('AI expansion failed:', error)
    message.error('AI分析失败，请重试')
  } finally {
    loading.value = false
  }
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
      details: {}
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
</style>