<!-- 账户选择底部面板：显示实时余额，归档账户只在“当前已选”时出现 -->
<template>
  <view v-if="visible" class="account-mask" @click="emit('close')">
    <view class="account-sheet" @click.stop>
      <view class="sheet-head">
        <text class="sheet-title">选择账户</text>
        <text class="sheet-link" @click="emit('manage')">管理账户</text>
      </view>

      <scroll-view scroll-y class="account-list">
        <view
          v-for="account in visibleAccounts"
          :key="account.id"
          class="account-row"
          @click="select(account)"
        >
          <view class="account-icon" :style="{ background: `${account.color}1a` }">
            <wd-icon :name="account.icon || 'money-circle'" size="20px" :color="account.color" />
          </view>
          <view class="account-main">
            <view class="account-name-line">
              <text class="account-name">{{ account.name }}</text>
              <text class="account-type">{{ typeLabel(account.type) }}</text>
              <text v-if="account.archived" class="account-archived">已归档</text>
            </view>
            <text class="account-balance bk-amount">
              余额 ¥{{ formatCents(account.balanceCents) }}
            </text>
          </view>
          <wd-icon
            v-if="String(account.id) === String(modelValue)"
            name="check"
            size="18px"
            color="#ff9f00"
          />
        </view>

        <view v-if="visibleAccounts.length === 0" class="account-empty">
          还没有可用账户，请先在「管理账户」中创建
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { AccountBalance, AccountType } from "@/api/bookkeeping"
import { ACCOUNT_TYPE_OPTIONS } from "@/api/bookkeeping"
import { formatCents } from "@/api/bookkeeping/money"

const props = defineProps<{
  visible: boolean
  modelValue: string
  accounts: AccountBalance[]
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "close"): void
  (event: "manage"): void
}>()

const visibleAccounts = computed(() =>
  props.accounts.filter(
    (account) => !account.archived || String(account.id) === String(props.modelValue),
  ),
)

function typeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type)?.label || "其他"
}

function select(account: AccountBalance): void {
  emit("update:modelValue", String(account.id))
  emit("close")
}
</script>

<style scoped lang="scss">
.account-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.account-sheet {
  box-sizing: border-box;
  width: 100%;
  padding: 26rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: sheet-up 0.18s ease-out;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.sheet-link {
  font-size: 24rpx;
  color: var(--bk-primary-dark);
}

.account-list {
  max-height: 62vh;
}

.account-row {
  display: flex;
  align-items: center;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.account-row:last-child {
  border-bottom: none;
}

.account-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
}

.account-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 20rpx;
}

.account-name-line {
  display: flex;
  align-items: center;
  min-width: 0;
}

.account-name {
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 500;
  color: var(--bk-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-type {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  margin-left: 12rpx;
  font-size: 20rpx;
  color: var(--bk-text-tertiary);
  background: #f2f3f5;
  border-radius: 6rpx;
}

.account-archived {
  flex-shrink: 0;
  margin-left: 8rpx;
  font-size: 20rpx;
  color: var(--bk-danger);
}

.account-balance {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.account-empty {
  padding: 60rpx 20rpx;
  font-size: 26rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}
</style>
