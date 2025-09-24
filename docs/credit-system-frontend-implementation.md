# 积分系统前端实现方案

## Vue 3 + TypeScript 组件架构

### 1. 积分服务层 (Services)

#### 1.1 积分API服务
```typescript
// src/services/creditService.ts
import { apiClient } from './apiClient'

export interface CreditBalance {
  userId: number
  totalCredits: number
  breakdown: {
    paidCredits: number
    giftCredits: number
    rewardCredits: number
  }
  frozenCredits: number
  lifetimeStats: {
    totalEarned: number
    totalSpent: number
  }
  expiringCredits: Array<{
    amount: number
    expiresAt: string
    type: string
    daysUntilExpiry: number
  }>
  checkinInfo: {
    lastCheckinAt: string | null
    streakDays: number
    canCheckinToday: boolean
    nextStreakBonus?: {
      streakTarget: number
      bonusAmount: number
    }
  }
}

export interface CreditTransaction {
  id: number
  type: 'EARN' | 'SPEND' | 'TRANSFER'
  creditType: 'PAID' | 'GIFT' | 'REWARD' | 'BONUS'
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  sourceType: string
  sourceId?: string
  metadata?: any
  expiresAt?: string
  createdAt: string
}

export interface TransactionHistory {
  transactions: CreditTransaction[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: {
    totalEarned: number
    totalSpent: number
    netChange: number
  }
}

export interface CheckinResult {
  baseReward: number
  streakBonus: number
  totalEarned: number
  newBalance: number
  streakInfo: {
    currentStreak: number
    previousStreak: number
    nextMilestone?: {
      streakTarget: number
      bonusAmount: number
      daysRemaining: number
    }
  }
  transactionId: number
  canCheckinAgainAt: string
}

class CreditService {
  // 获取积分余额
  async getBalance(): Promise<CreditBalance> {
    const response = await apiClient.get('/api/credits/balance')
    return response.data
  }

  // 获取交易历史
  async getTransactions(params: {
    page?: number
    limit?: number
    type?: string
    sourceType?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<TransactionHistory> {
    const response = await apiClient.get('/api/credits/transactions', { params })
    return response.data
  }

  // 赠送积分
  async giftCredits(data: {
    toUserId: number
    amount: number
    message?: string
    giftType?: string
  }) {
    const response = await apiClient.post('/api/credits/gift', data)
    return response.data
  }

  // 生成礼品码
  async generateGiftCode(data: {
    amount: number
    message?: string
    expiryHours?: number
    maxClaims?: number
  }) {
    const response = await apiClient.post('/api/credits/gift/generate-code', data)
    return response.data
  }

  // 领取礼品码
  async claimGiftCode(giftCode: string) {
    const response = await apiClient.post('/api/credits/gift/claim', { giftCode })
    return response.data
  }

  // 每日签到
  async dailyCheckin(): Promise<CheckinResult> {
    const response = await apiClient.post('/api/credits/checkin')
    return response.data
  }

  // 获取签到状态
  async getCheckinStatus() {
    const response = await apiClient.get('/api/credits/checkin/status')
    return response.data
  }

  // 获取积分概览
  async getOverview() {
    const response = await apiClient.get('/api/credits/overview')
    return response.data
  }

  // 获取推荐状态
  async getReferralStatus() {
    const response = await apiClient.get('/api/credits/referral/status')
    return response.data
  }

  // 生成推荐码
  async generateReferralCode() {
    const response = await apiClient.post('/api/credits/referral/generate')
    return response.data
  }

  // 获取积分套餐
  async getPackages() {
    const response = await apiClient.get('/api/credits/packages')
    return response.data
  }

  // 创建购买订单
  async createPurchaseOrder(data: {
    packageId: string
    paymentMethod: string
    promoCode?: string
  }) {
    const response = await apiClient.post('/api/credits/purchase', data)
    return response.data
  }
}

export const creditService = new CreditService()
```

#### 1.2 积分状态管理 (Pinia Store)
```typescript
// src/stores/creditStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { creditService, type CreditBalance, type CreditTransaction } from '@/services/creditService'

export const useCreditStore = defineStore('credit', () => {
  // 状态
  const balance = ref<CreditBalance | null>(null)
  const transactions = ref<CreditTransaction[]>([])
  const isLoading = ref(false)
  const lastUpdated = ref<Date | null>(null)

  // 计算属性
  const totalCredits = computed(() => balance.value?.totalCredits ?? 0)
  const canCheckinToday = computed(() => balance.value?.checkinInfo.canCheckinToday ?? false)
  const currentStreak = computed(() => balance.value?.checkinInfo.streakDays ?? 0)

  const expiringCreditsThisWeek = computed(() => {
    return balance.value?.expiringCredits.filter(credit =>
      credit.daysUntilExpiry <= 7
    ) ?? []
  })

  const creditBreakdown = computed(() => {
    if (!balance.value) return []
    return [
      { label: '充值积分', value: balance.value.breakdown.paidCredits, color: '#1890ff' },
      { label: '赠送积分', value: balance.value.breakdown.giftCredits, color: '#52c41a' },
      { label: '奖励积分', value: balance.value.breakdown.rewardCredits, color: '#faad14' }
    ]
  })

  // 动作
  async function fetchBalance() {
    try {
      isLoading.value = true
      balance.value = await creditService.getBalance()
      lastUpdated.value = new Date()
    } catch (error) {
      console.error('获取积分余额失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTransactions(params: any = {}) {
    try {
      isLoading.value = true
      const result = await creditService.getTransactions(params)
      transactions.value = result.transactions
      return result
    } catch (error) {
      console.error('获取交易记录失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function performCheckin() {
    try {
      const result = await creditService.dailyCheckin()
      // 更新余额
      await fetchBalance()
      return result
    } catch (error) {
      console.error('签到失败:', error)
      throw error
    }
  }

  async function giftCredits(data: {
    toUserId: number
    amount: number
    message?: string
  }) {
    try {
      const result = await creditService.giftCredits(data)
      // 更新余额和交易记录
      await Promise.all([fetchBalance(), fetchTransactions()])
      return result
    } catch (error) {
      console.error('赠送积分失败:', error)
      throw error
    }
  }

  function updateBalanceAfterTransaction(amount: number) {
    if (balance.value) {
      balance.value.totalCredits += amount
      // 根据积分类型更新对应分类
    }
  }

  return {
    // 状态
    balance,
    transactions,
    isLoading,
    lastUpdated,

    // 计算属性
    totalCredits,
    canCheckinToday,
    currentStreak,
    expiringCreditsThisWeek,
    creditBreakdown,

    // 动作
    fetchBalance,
    fetchTransactions,
    performCheckin,
    giftCredits,
    updateBalanceAfterTransaction
  }
})
```

### 2. 核心组件实现

#### 2.1 积分仪表板组件
```vue
<!-- src/components/Credit/CreditDashboard.vue -->
<template>
  <div class="credit-dashboard">
    <!-- 积分余额卡片 -->
    <a-card class="balance-card" :loading="isLoading">
      <template #title>
        <div class="card-title">
          <WalletOutlined class="title-icon" />
          积分余额
        </div>
      </template>

      <div class="balance-display">
        <div class="total-credits">
          <span class="amount">{{ formatNumber(totalCredits) }}</span>
          <span class="unit">积分</span>
        </div>

        <div class="balance-breakdown">
          <a-row :gutter="16">
            <a-col :span="8" v-for="item in creditBreakdown" :key="item.label">
              <div class="breakdown-item">
                <div class="breakdown-value" :style="{ color: item.color }">
                  {{ formatNumber(item.value) }}
                </div>
                <div class="breakdown-label">{{ item.label }}</div>
              </div>
            </a-col>
          </a-row>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <a-button-group>
          <a-button type="primary" @click="showRechargeModal = true">
            <PlusOutlined />
            充值积分
          </a-button>
          <a-button @click="showGiftModal = true">
            <GiftOutlined />
            赠送积分
          </a-button>
          <a-button
            :disabled="!canCheckinToday"
            @click="handleCheckin"
            :loading="checkinLoading"
          >
            <CalendarOutlined />
            {{ canCheckinToday ? '每日签到' : '已签到' }}
          </a-button>
        </a-button-group>
      </div>
    </a-card>

    <!-- 即将过期积分提醒 -->
    <a-alert
      v-if="expiringCreditsThisWeek.length > 0"
      type="warning"
      show-icon
      class="expiry-alert"
    >
      <template #message>
        <div>
          您有 {{ expiringCreditsThisWeek.length }} 项积分即将过期，
          总计 {{ expiringCreditsThisWeek.reduce((sum, credit) => sum + credit.amount, 0) }} 积分
        </div>
      </template>
      <template #description>
        <div class="expiring-list">
          <div v-for="credit in expiringCreditsThisWeek" :key="credit.expiresAt">
            {{ credit.amount }} 积分将在 {{ credit.daysUntilExpiry }} 天后过期
          </div>
        </div>
      </template>
    </a-alert>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="8">
        <a-card size="small">
          <a-statistic
            title="今日获得"
            :value="todayStats?.earned || 0"
            suffix="积分"
            :value-style="{ color: '#3f8600' }"
          />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card size="small">
          <a-statistic
            title="今日消费"
            :value="todayStats?.spent || 0"
            suffix="积分"
            :value-style="{ color: '#cf1322' }"
          />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card size="small">
          <a-statistic
            title="连续签到"
            :value="currentStreak"
            suffix="天"
            :value-style="{ color: '#1890ff' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 签到奖励模态框 -->
    <a-modal
      v-model:open="checkinResultModal"
      title="签到成功"
      :footer="null"
      width="400px"
    >
      <div class="checkin-result" v-if="checkinResult">
        <div class="reward-display">
          <div class="reward-amount">+{{ checkinResult.totalEarned }}</div>
          <div class="reward-label">积分</div>
        </div>

        <div class="reward-breakdown">
          <div class="breakdown-item">
            <span>基础奖励</span>
            <span>+{{ checkinResult.baseReward }}</span>
          </div>
          <div class="breakdown-item" v-if="checkinResult.streakBonus > 0">
            <span>连续奖励</span>
            <span>+{{ checkinResult.streakBonus }}</span>
          </div>
        </div>

        <div class="streak-info">
          <a-progress
            :percent="(checkinResult.streakInfo.currentStreak / (checkinResult.streakInfo.nextMilestone?.streakTarget || 30)) * 100"
            :show-info="false"
            stroke-color="#52c41a"
          />
          <div class="streak-text">
            连续签到 {{ checkinResult.streakInfo.currentStreak }} 天
            <span v-if="checkinResult.streakInfo.nextMilestone">
              ，再签到 {{ checkinResult.streakInfo.nextMilestone.daysRemaining }} 天可获得 {{ checkinResult.streakInfo.nextMilestone.bonusAmount }} 积分奖励
            </span>
          </div>
        </div>

        <a-button type="primary" block @click="checkinResultModal = false">
          太棒了！
        </a-button>
      </div>
    </a-modal>

    <!-- 充值积分模态框 -->
    <CreditRechargeModal v-model:open="showRechargeModal" @success="handleRechargeSuccess" />

    <!-- 赠送积分模态框 -->
    <CreditGiftModal v-model:open="showGiftModal" @success="handleGiftSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  WalletOutlined,
  PlusOutlined,
  GiftOutlined,
  CalendarOutlined
} from '@ant-design/icons-vue'
import { useCreditStore } from '@/stores/creditStore'
import { formatNumber } from '@/utils/format'
import CreditRechargeModal from './CreditRechargeModal.vue'
import CreditGiftModal from './CreditGiftModal.vue'

const creditStore = useCreditStore()

// 响应式数据
const showRechargeModal = ref(false)
const showGiftModal = ref(false)
const checkinLoading = ref(false)
const checkinResultModal = ref(false)
const checkinResult = ref(null)
const todayStats = ref(null)

// 计算属性
const isLoading = computed(() => creditStore.isLoading)
const totalCredits = computed(() => creditStore.totalCredits)
const canCheckinToday = computed(() => creditStore.canCheckinToday)
const currentStreak = computed(() => creditStore.currentStreak)
const expiringCreditsThisWeek = computed(() => creditStore.expiringCreditsThisWeek)
const creditBreakdown = computed(() => creditStore.creditBreakdown)

// 方法
async function handleCheckin() {
  try {
    checkinLoading.value = true
    checkinResult.value = await creditStore.performCheckin()
    checkinResultModal.value = true
    message.success('签到成功!')
  } catch (error) {
    message.error('签到失败，请稍后重试')
  } finally {
    checkinLoading.value = false
  }
}

function handleRechargeSuccess() {
  creditStore.fetchBalance()
  message.success('充值成功!')
}

function handleGiftSuccess() {
  message.success('赠送成功!')
}

// 生命周期
onMounted(async () => {
  await creditStore.fetchBalance()
  // 获取今日统计
  const overview = await creditService.getOverview()
  todayStats.value = overview.todayStats
})
</script>

<style scoped>
.credit-dashboard {
  padding: 24px;
}

.balance-card {
  margin-bottom: 24px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 18px;
  color: #1890ff;
}

.balance-display {
  text-align: center;
  padding: 20px 0;
}

.total-credits {
  margin-bottom: 24px;
}

.amount {
  font-size: 48px;
  font-weight: bold;
  color: #1890ff;
}

.unit {
  font-size: 16px;
  color: #666;
  margin-left: 8px;
}

.breakdown-item {
  text-align: center;
}

.breakdown-value {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.breakdown-label {
  font-size: 12px;
  color: #666;
}

.quick-actions {
  text-align: center;
  margin-top: 20px;
}

.expiry-alert {
  margin-bottom: 24px;
}

.expiring-list {
  margin-top: 8px;
}

.stats-row {
  margin-bottom: 24px;
}

.checkin-result {
  text-align: center;
  padding: 20px;
}

.reward-display {
  margin-bottom: 24px;
}

.reward-amount {
  font-size: 48px;
  font-weight: bold;
  color: #52c41a;
}

.reward-label {
  font-size: 16px;
  color: #666;
}

.reward-breakdown {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.breakdown-item:last-child {
  margin-bottom: 0;
}

.streak-info {
  margin-bottom: 24px;
}

.streak-text {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}
</style>
```

#### 2.2 积分交易记录组件
```vue
<!-- src/components/Credit/CreditTransactionHistory.vue -->
<template>
  <div class="transaction-history">
    <a-card title="交易记录">
      <!-- 筛选器 -->
      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model:value="filters.type" placeholder="交易类型" allow-clear>
              <a-select-option value="">全部类型</a-select-option>
              <a-select-option value="EARN">获得</a-select-option>
              <a-select-option value="SPEND">消费</a-select-option>
              <a-select-option value="TRANSFER">转账</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model:value="filters.sourceType" placeholder="来源类型" allow-clear>
              <a-select-option value="">全部来源</a-select-option>
              <a-select-option value="AI_USAGE">AI使用</a-select-option>
              <a-select-option value="GIFT">赠送</a-select-option>
              <a-select-option value="CHECKIN">签到</a-select-option>
              <a-select-option value="PURCHASE">购买</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="8">
            <a-range-picker v-model:value="dateRange" @change="handleDateChange" />
          </a-col>
          <a-col :span="4">
            <a-button type="primary" @click="searchTransactions">
              <SearchOutlined />
              搜索
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 统计摘要 -->
      <div class="summary-section" v-if="summary">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-statistic
              title="总获得"
              :value="summary.totalEarned"
              suffix="积分"
              :value-style="{ color: '#3f8600' }"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="总消费"
              :value="summary.totalSpent"
              suffix="积分"
              :value-style="{ color: '#cf1322' }"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="净变化"
              :value="summary.netChange"
              suffix="积分"
              :value-style="{ color: summary.netChange >= 0 ? '#3f8600' : '#cf1322' }"
            />
          </a-col>
        </a-row>
      </div>

      <!-- 交易列表 -->
      <a-list
        :data-source="transactions"
        :loading="isLoading"
        size="large"
        :pagination="paginationConfig"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #avatar>
                <a-avatar :style="getTransactionAvatarStyle(item)">
                  <component :is="getTransactionIcon(item)" />
                </a-avatar>
              </template>

              <template #title>
                <div class="transaction-title">
                  <span>{{ item.description }}</span>
                  <a-tag :color="getTransactionTagColor(item)">
                    {{ getTransactionTypeText(item.type) }}
                  </a-tag>
                </div>
              </template>

              <template #description>
                <div class="transaction-meta">
                  <span>{{ formatDateTime(item.createdAt) }}</span>
                  <span v-if="item.sourceType">· {{ getSourceTypeText(item.sourceType) }}</span>
                  <span v-if="item.expiresAt">· 过期时间: {{ formatDateTime(item.expiresAt) }}</span>
                </div>

                <!-- AI使用详情 -->
                <div v-if="item.sourceType === 'AI_USAGE' && item.metadata" class="ai-usage-details">
                  <a-tag size="small">{{ item.metadata.model }}</a-tag>
                  <span class="token-info">
                    输入: {{ item.metadata.inputTokens }} tokens,
                    输出: {{ item.metadata.outputTokens }} tokens
                  </span>
                </div>
              </template>
            </a-list-item-meta>

            <div class="transaction-amount">
              <div
                class="amount-display"
                :class="{
                  'positive': item.amount > 0,
                  'negative': item.amount < 0
                }"
              >
                {{ item.amount > 0 ? '+' : '' }}{{ formatNumber(item.amount) }}
              </div>
              <div class="balance-after">
                余额: {{ formatNumber(item.balanceAfter) }}
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { SearchOutlined, WalletOutlined, GiftOutlined, CalendarOutlined, RobotOutlined } from '@ant-design/icons-vue'
import { useCreditStore } from '@/stores/creditStore'
import { formatNumber, formatDateTime } from '@/utils/format'
import type { CreditTransaction } from '@/services/creditService'

const creditStore = useCreditStore()

// 响应式数据
const filters = ref({
  type: '',
  sourceType: ''
})
const dateRange = ref([])
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
})
const summary = ref(null)

// 计算属性
const isLoading = computed(() => creditStore.isLoading)
const transactions = computed(() => creditStore.transactions)

const paginationConfig = computed(() => ({
  current: pagination.value.current,
  pageSize: pagination.value.pageSize,
  total: pagination.value.total,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  onChange: handlePageChange,
  onShowSizeChange: handlePageSizeChange
}))

// 方法
function getTransactionIcon(transaction: CreditTransaction) {
  switch (transaction.sourceType) {
    case 'AI_USAGE': return RobotOutlined
    case 'GIFT': return GiftOutlined
    case 'CHECKIN': return CalendarOutlined
    default: return WalletOutlined
  }
}

function getTransactionAvatarStyle(transaction: CreditTransaction) {
  const isPositive = transaction.amount > 0
  return {
    backgroundColor: isPositive ? '#52c41a' : '#ff4d4f',
    color: 'white'
  }
}

function getTransactionTagColor(transaction: CreditTransaction) {
  switch (transaction.type) {
    case 'EARN': return 'green'
    case 'SPEND': return 'red'
    case 'TRANSFER': return 'blue'
    default: return 'default'
  }
}

function getTransactionTypeText(type: string) {
  switch (type) {
    case 'EARN': return '获得'
    case 'SPEND': return '消费'
    case 'TRANSFER': return '转账'
    default: return type
  }
}

function getSourceTypeText(sourceType: string) {
  switch (sourceType) {
    case 'AI_USAGE': return 'AI使用'
    case 'GIFT': return '赠送'
    case 'CHECKIN': return '签到'
    case 'PURCHASE': return '购买'
    case 'REFERRAL': return '推荐奖励'
    default: return sourceType
  }
}

function handleDateChange(dates: any) {
  // 处理日期范围变化
}

async function searchTransactions() {
  const params = {
    page: pagination.value.current,
    limit: pagination.value.pageSize,
    type: filters.value.type || undefined,
    sourceType: filters.value.sourceType || undefined,
    startDate: dateRange.value?.[0]?.format('YYYY-MM-DD'),
    endDate: dateRange.value?.[1]?.format('YYYY-MM-DD')
  }

  try {
    const result = await creditStore.fetchTransactions(params)
    pagination.value.total = result.pagination.totalRecords
    summary.value = result.summary
  } catch (error) {
    console.error('搜索交易记录失败:', error)
  }
}

function handlePageChange(page: number) {
  pagination.value.current = page
  searchTransactions()
}

function handlePageSizeChange(current: number, size: number) {
  pagination.value.current = 1
  pagination.value.pageSize = size
  searchTransactions()
}

// 生命周期
onMounted(() => {
  searchTransactions()
})
</script>

<style scoped>
.transaction-history {
  padding: 24px;
}

.filter-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.summary-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f0f2f5;
  border-radius: 8px;
}

.transaction-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.transaction-meta {
  font-size: 12px;
  color: #666;
}

.ai-usage-details {
  margin-top: 8px;
}

.token-info {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.transaction-amount {
  text-align: right;
}

.amount-display {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.amount-display.positive {
  color: #52c41a;
}

.amount-display.negative {
  color: #ff4d4f;
}

.balance-after {
  font-size: 12px;
  color: #666;
}
</style>
```

#### 2.3 积分赠送模态框组件
```vue
<!-- src/components/Credit/CreditGiftModal.vue -->
<template>
  <a-modal
    v-model:open="visible"
    title="赠送积分"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="500px"
  >
    <a-form
      :model="form"
      :rules="rules"
      layout="vertical"
      ref="formRef"
    >
      <a-form-item label="赠送方式" name="giftMethod">
        <a-radio-group v-model:value="form.giftMethod">
          <a-radio value="user">赠送给用户</a-radio>
          <a-radio value="code">生成礼品码</a-radio>
        </a-radio-group>
      </a-form-item>

      <!-- 用户赠送 -->
      <template v-if="form.giftMethod === 'user'">
        <a-form-item label="接收用户" name="toUser">
          <a-select
            v-model:value="form.toUser"
            placeholder="请输入用户名或邮箱搜索"
            show-search
            :filter-option="false"
            :loading="userSearchLoading"
            @search="handleUserSearch"
            @change="handleUserChange"
          >
            <a-select-option
              v-for="user in searchUsers"
              :key="user.id"
              :value="user.id"
            >
              <div class="user-option">
                <a-avatar :size="24" :src="user.avatar">
                  {{ user.username.charAt(0).toUpperCase() }}
                </a-avatar>
                <span class="username">{{ user.username }}</span>
                <span class="email">{{ user.email }}</span>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>
      </template>

      <!-- 礼品码设置 -->
      <template v-if="form.giftMethod === 'code'">
        <a-form-item label="有效期" name="expiryHours">
          <a-select v-model:value="form.expiryHours" placeholder="选择有效期">
            <a-select-option :value="24">1天</a-select-option>
            <a-select-option :value="168">7天</a-select-option>
            <a-select-option :value="720">30天</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="使用次数" name="maxClaims">
          <a-input-number
            v-model:value="form.maxClaims"
            :min="1"
            :max="100"
            placeholder="最多可被领取次数"
            style="width: 100%"
          />
        </a-form-item>
      </template>

      <a-form-item label="积分数量" name="amount">
        <a-input-number
          v-model:value="form.amount"
          :min="1"
          :max="maxGiftAmount"
          placeholder="请输入赠送积分数量"
          style="width: 100%"
          addon-after="积分"
        />
        <div class="form-help">
          您当前余额: {{ currentBalance }} 积分，
          今日还可赠送: {{ remainingDailyGift }} 积分
        </div>
      </a-form-item>

      <a-form-item label="赠送留言" name="message">
        <a-textarea
          v-model:value="form.message"
          placeholder="请输入赠送留言（可选）"
          :rows="3"
          :max-length="200"
          show-count
        />
      </a-form-item>

      <!-- 费用预览 -->
      <div class="cost-preview">
        <a-alert type="info" show-icon>
          <template #message>
            <div>
              将从您的账户扣除 <strong>{{ form.amount || 0 }}</strong> 积分
            </div>
          </template>
        </a-alert>
      </div>
    </a-form>

    <!-- 生成礼品码结果 -->
    <a-modal
      v-model:open="showGiftCodeResult"
      title="礼品码生成成功"
      :footer="null"
      width="600px"
    >
      <div class="gift-code-result" v-if="giftCodeResult">
        <div class="code-display">
          <a-input
            :value="giftCodeResult.giftCode"
            readonly
            size="large"
          >
            <template #addonAfter>
              <a-button @click="copyGiftCode">
                <CopyOutlined />
                复制
              </a-button>
            </template>
          </a-input>
        </div>

        <div class="code-info">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="积分数量">
              {{ giftCodeResult.amount }} 积分
            </a-descriptions-item>
            <a-descriptions-item label="有效期至">
              {{ formatDateTime(giftCodeResult.expiresAt) }}
            </a-descriptions-item>
            <a-descriptions-item label="使用次数">
              {{ giftCodeResult.claimsUsed }} / {{ giftCodeResult.maxClaims }}
            </a-descriptions-item>
            <a-descriptions-item label="分享链接">
              <a-input
                :value="giftCodeResult.shareUrl"
                readonly
                size="small"
              >
                <template #addonAfter>
                  <a-button size="small" @click="copyShareUrl">
                    <CopyOutlined />
                  </a-button>
                </template>
              </a-input>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="code-actions">
          <a-button type="primary" block @click="showGiftCodeResult = false">
            完成
          </a-button>
        </div>
      </div>
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined } from '@ant-design/icons-vue'
import { useCreditStore } from '@/stores/creditStore'
import { creditService } from '@/services/creditService'
import { formatDateTime } from '@/utils/format'
import { copyToClipboard } from '@/utils/clipboard'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const creditStore = useCreditStore()
const formRef = ref()

// 响应式数据
const loading = ref(false)
const userSearchLoading = ref(false)
const searchUsers = ref([])
const showGiftCodeResult = ref(false)
const giftCodeResult = ref(null)

const form = ref({
  giftMethod: 'user',
  toUser: undefined,
  amount: undefined,
  message: '',
  expiryHours: 168,
  maxClaims: 1
})

// 计算属性
const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const currentBalance = computed(() => creditStore.totalCredits)
const maxGiftAmount = computed(() => Math.min(currentBalance.value, 1000)) // 单次最多赠送1000积分
const remainingDailyGift = computed(() => 1000) // 从配置获取每日赠送限额

// 表单验证规则
const rules = {
  giftMethod: [{ required: true, message: '请选择赠送方式' }],
  toUser: [{
    required: true,
    message: '请选择接收用户',
    validator: (_: any, value: any) => {
      if (form.value.giftMethod === 'user' && !value) {
        return Promise.reject('请选择接收用户')
      }
      return Promise.resolve()
    }
  }],
  amount: [
    { required: true, message: '请输入积分数量' },
    { type: 'number', min: 1, message: '积分数量不能少于1' },
    {
      validator: (_: any, value: number) => {
        if (value > currentBalance.value) {
          return Promise.reject('积分数量不能超过当前余额')
        }
        if (value > maxGiftAmount.value) {
          return Promise.reject(`单次赠送不能超过${maxGiftAmount.value}积分`)
        }
        return Promise.resolve()
      }
    }
  ],
  expiryHours: [{
    required: true,
    message: '请选择有效期',
    validator: (_: any, value: any) => {
      if (form.value.giftMethod === 'code' && !value) {
        return Promise.reject('请选择有效期')
      }
      return Promise.resolve()
    }
  }],
  maxClaims: [{
    required: true,
    message: '请设置使用次数',
    validator: (_: any, value: any) => {
      if (form.value.giftMethod === 'code' && !value) {
        return Promise.reject('请设置使用次数')
      }
      return Promise.resolve()
    }
  }]
}

// 方法
async function handleUserSearch(value: string) {
  if (!value || value.length < 2) {
    searchUsers.value = []
    return
  }

  try {
    userSearchLoading.value = true
    // 这里应该调用用户搜索API
    // const users = await userService.searchUsers(value)
    // searchUsers.value = users

    // 模拟数据
    searchUsers.value = [
      { id: 1, username: 'alice', email: 'alice@example.com', avatar: '' },
      { id: 2, username: 'bob', email: 'bob@example.com', avatar: '' }
    ].filter(user =>
      user.username.includes(value) || user.email.includes(value)
    )
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    userSearchLoading.value = false
  }
}

function handleUserChange(userId: number) {
  const user = searchUsers.value.find(u => u.id === userId)
  if (user) {
    console.log('选择用户:', user)
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
    loading.value = true

    if (form.value.giftMethod === 'user') {
      // 赠送给用户
      await creditStore.giftCredits({
        toUserId: form.value.toUser,
        amount: form.value.amount,
        message: form.value.message
      })
      message.success('积分赠送成功!')
      emit('success')
      handleCancel()
    } else {
      // 生成礼品码
      const result = await creditService.generateGiftCode({
        amount: form.value.amount,
        message: form.value.message,
        expiryHours: form.value.expiryHours,
        maxClaims: form.value.maxClaims
      })
      giftCodeResult.value = result
      showGiftCodeResult.value = true
      emit('success')
    }
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  visible.value = false
  // 重置表单
  form.value = {
    giftMethod: 'user',
    toUser: undefined,
    amount: undefined,
    message: '',
    expiryHours: 168,
    maxClaims: 1
  }
  searchUsers.value = []
}

function copyGiftCode() {
  copyToClipboard(giftCodeResult.value.giftCode)
  message.success('礼品码已复制到剪贴板')
}

function copyShareUrl() {
  copyToClipboard(giftCodeResult.value.shareUrl)
  message.success('分享链接已复制到剪贴板')
}

// 监听器
watch(() => form.value.giftMethod, () => {
  // 切换赠送方式时重置相关字段
  form.value.toUser = undefined
})
</script>

<style scoped>
.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-weight: 500;
}

.email {
  color: #666;
  font-size: 12px;
}

.form-help {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.cost-preview {
  margin-top: 16px;
}

.gift-code-result {
  text-align: center;
}

.code-display {
  margin-bottom: 24px;
}

.code-info {
  margin-bottom: 24px;
  text-align: left;
}

.code-actions {
  margin-top: 24px;
}
</style>
```

#### 2.4 积分路由配置
```typescript
// src/router/modules/credit.ts
export default [
  {
    path: '/credits',
    name: 'Credits',
    redirect: '/credits/dashboard',
    meta: {
      title: '积分管理',
      icon: 'WalletOutlined',
      requireAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'CreditDashboard',
        component: () => import('@/views/Credit/CreditDashboard.vue'),
        meta: { title: '积分概览' }
      },
      {
        path: 'transactions',
        name: 'CreditTransactions',
        component: () => import('@/views/Credit/CreditTransactions.vue'),
        meta: { title: '交易记录' }
      },
      {
        path: 'recharge',
        name: 'CreditRecharge',
        component: () => import('@/views/Credit/CreditRecharge.vue'),
        meta: { title: '充值积分' }
      },
      {
        path: 'referral',
        name: 'CreditReferral',
        component: () => import('@/views/Credit/CreditReferral.vue'),
        meta: { title: '推荐奖励' }
      }
    ]
  }
]
```

### 3. 积分系统集成到现有AI调用流程

#### 3.1 修改AI服务调用
```typescript
// src/services/aiService.ts (修改现有文件)
import { useCreditStore } from '@/stores/creditStore'
import { message } from 'ant-design-vue'

class AIService {
  async callAI(payload: any) {
    const creditStore = useCreditStore()

    // 检查积分余额
    if (creditStore.totalCredits <= 0) {
      message.error('积分余额不足，请先充值')
      throw new Error('INSUFFICIENT_CREDITS')
    }

    try {
      // 调用AI服务
      const response = await apiClient.post('/api/ai/chat', {
        ...payload,
        deductCredits: true // 标记需要扣除积分
      })

      // 更新本地积分余额（实际余额以服务端为准）
      if (response.data.creditsUsed) {
        creditStore.updateBalanceAfterTransaction(-response.data.creditsUsed)
      }

      return response.data
    } catch (error) {
      if (error.response?.data?.error?.code === 'INSUFFICIENT_CREDITS') {
        message.error('积分余额不足，请先充值')
      }
      throw error
    }
  }
}
```

这个前端实现方案提供了完整的积分系统用户界面，包括积分余额显示、交易记录、赠送功能、签到奖励等核心功能，并与现有的AI服务调用流程进行了集成。