<template>
  <div class="h-full flex">
    <!-- Character List (30%) -->
    <div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-gray-800">角色库</h2>
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
            ? 'bg-blue-50 border border-blue-200' 
            : 'bg-white border border-gray-100 hover:bg-gray-50'"
        >
          <div class="flex items-start space-x-3">
            <a-avatar :size="40" :style="{ backgroundColor: getCharacterColor(character.id) }">
              {{ character.name.charAt(0) }}
            </a-avatar>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-gray-800 truncate">
                  {{ character.name }}
                </h4>
                <a-tag v-if="character.isLocked" size="small" color="red">
                  锁定
                </a-tag>
              </div>
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                {{ character.description }}
              </p>
              <div class="flex items-center mt-2 text-xs text-gray-400">
                <span>{{ character.personality?.split('，')[0] || '未设定性格' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Details (70%) -->
    <div class="flex-1 flex flex-col">
      <div v-if="!selectedCharacter" class="flex-1 flex items-center justify-center text-gray-500">
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
                  <h1 class="text-2xl font-bold text-gray-800">{{ selectedCharacter.name }}</h1>
                  <p class="text-sm text-gray-500">角色详情编辑</p>
                </div>
              </div>
              <a-space>
                <a-button @click="requestAIEnhancement">
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
                    <a-col :span="12">
                      <a-form-item label="角色姓名" required>
                        <a-input 
                          v-model:value="editingCharacter.name" 
                          placeholder="输入角色姓名"
                          :disabled="selectedCharacter.isLocked"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="年龄/身份">
                        <a-input 
                          v-model:value="editingCharacter.age" 
                          placeholder="如：28岁 / 私人侦探"
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
                      class="p-4 border border-gray-200 rounded-lg"
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
        <div class="w-96 bg-gray-50 border-l border-gray-200 p-4">
          <h3 class="text-sm font-medium text-gray-800 mb-4">AI 建议</h3>
          
          <div class="space-y-4">
            <a-card size="small" title="性格分析">
              <p class="text-sm text-gray-600">
                基于当前描述，该角色表现出谨慎但好奇的性格特征。建议进一步探索其社交恐惧的具体表现形式。
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                应用建议
              </a-button>
            </a-card>
            
            <a-card size="small" title="关系建议">
              <p class="text-sm text-gray-600">
                建议为该角色添加一个导师角色，这将有助于解释其专业技能的来源。
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                添加导师关系
              </a-button>
            </a-card>
            
            <a-card size="small" title="背景完善">
              <p class="text-sm text-gray-600">
                可以添加一个重要的童年事件来解释角色的性格形成原因。
              </p>
              <a-button type="link" size="small" class="p-0 mt-2">
                完善背景
              </a-button>
            </a-card>
          </div>
          
          <div class="mt-6">
            <a-button type="primary" block @click="requestAIEnhancement">
              <template #icon>
                <RobotOutlined />
              </template>
              AI 全面分析
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Character Modal -->
    <a-modal
      v-model:open="showAddCharacterModal"
      title="添加新角色"
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
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PlusOutlined,
  TeamOutlined,
  RobotOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import type { Character } from '@/types'

// Mock data
const characters = ref<Character[]>([
  {
    id: '1',
    novelId: '1',
    name: '李明',
    description: '28岁的私人侦探，对细节异常敏感',
    appearance: '中等身材，深褐色头发，总是穿着整洁的深色西装',
    personality: '谨慎但好奇心强，有轻微的社交恐惧症',
    background: '出生于小镇，父亲失踪事件让他走上侦探道路...',
    relationships: {},
    isLocked: false
  },
  {
    id: '2',
    novelId: '1',
    name: '王警官',
    description: '经验丰富的老警察，李明的导师',
    appearance: '高大魁梧，胡须花白，眼神锐利',
    personality: '严厉但关心下属，有很强的正义感',
    background: '从警30年，经历过无数案件...',
    relationships: {},
    isLocked: true
  }
])

const selectedCharacter = ref<Character | null>(null)
const editingCharacter = ref<any>({})
const searchQuery = ref('')
const activeTab = ref('basic')
const showAddCharacterModal = ref(false)
const newCharacter = ref({
  name: '',
  description: ''
})

const filteredCharacters = computed(() => {
  if (!searchQuery.value) return characters.value
  return characters.value.filter(char => 
    char.name.includes(searchQuery.value) || 
    char.description.includes(searchQuery.value)
  )
})

const selectCharacter = (character: Character) => {
  selectedCharacter.value = character
  editingCharacter.value = {
    ...character,
    age: '28岁',
    values: '正义、真相、保护无辜',
    fears: '失败、让别人失望',
    skills: '观察、推理、搏击',
    relationships: [
      { character: '王警官', type: '导师', importance: '高', description: '紧张但信任的关系' },
      { character: '小雨', type: '助手', importance: '中', description: '相互依赖' }
    ]
  }
}

const getCharacterColor = (id: string) => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
  return colors[parseInt(id) % colors.length]
}

const toggleLock = () => {
  if (selectedCharacter.value) {
    selectedCharacter.value.isLocked = !selectedCharacter.value.isLocked
  }
}

const saveCharacter = () => {
  console.log('Save character:', editingCharacter.value)
}

const deleteCharacter = () => {
  console.log('Delete character:', selectedCharacter.value)
}

const requestAIEnhancement = () => {
  console.log('Request AI enhancement for:', selectedCharacter.value)
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

const addCharacter = () => {
  console.log('Add character:', newCharacter.value)
  showAddCharacterModal.value = false
  newCharacter.value = { name: '', description: '' }
}

// Select first character by default
if (characters.value.length > 0) {
  selectCharacter(characters.value[0])
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>