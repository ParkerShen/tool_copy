<!--
 * 账户管理：余额 = 期初 + 收入 − 支出（实时计算，不落库）。
 * 默认账户（新建记录时预选）可随时切换；系统账户不能归档/删除，
 * 有记录的账户只能归档，不能删除。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "账户管理",
    navigationBarBackgroundColor: "#FFFFFF",
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="accounts-page">
    <app-navbar title="账户管理">
      <template #right>
        <view class="nav-add" @click="openCreate">新增</view>
      </template>
    </app-navbar>

    <view class="page-body">
      <page-state v-if="state === 'loading'" state="loading" class="page-state" />

      <page-state
        v-else-if="state === 'error'"
        state="error"
        class="page-state"
        :description="errorMessage"
        @retry="load"
      />

      <template v-else>
        <view class="total-card">
          <text class="total-label">账户总余额</text>
          <text class="total-value bk-amount">¥{{ formatCents(totalBalanceCents) }}</text>
          <text class="total-meta">{{ activeAccounts.length }} 个可用账户</text>
        </view>

        <view class="account-list">
          <view
            v-for="account in activeAccounts"
            :key="account.id"
            class="account-row"
            @click="openEdit(account)"
          >
            <view class="account-icon" :style="{ background: `${account.color}1a` }">
              <wd-icon :name="account.icon || 'money-circle'" size="22px" :color="account.color" />
            </view>
            <view class="account-main">
              <view class="account-name-line">
                <text class="account-name">{{ account.name }}</text>
                <text class="type-badge">{{ typeLabel(account.type) }}</text>
                <text v-if="account.isSystem" class="system-badge">系统</text>
                <text v-if="isDefaultAccount(account)" class="default-badge">默认</text>
              </view>
              <text class="account-meta">
                {{ account.recordCount }} 笔 · 期初 ¥{{ formatCents(account.initialBalanceCents) }}
              </text>
            </view>
            <text class="account-balance bk-amount">¥{{ formatCents(account.balanceCents) }}</text>
          </view>

          <view v-if="activeAccounts.length === 0" class="list-empty">还没有可用账户</view>
        </view>

        <template v-if="archivedAccounts.length > 0">
          <text class="group-title">已归档</text>
          <view class="account-list archived">
            <view
              v-for="account in archivedAccounts"
              :key="account.id"
              class="account-row"
              @click="openEdit(account)"
            >
              <view class="account-icon" :style="{ background: '#f2f3f5' }">
                <wd-icon :name="account.icon || 'money-circle'" size="22px" color="#c9cdd4" />
              </view>
              <view class="account-main">
                <view class="account-name-line">
                  <text class="account-name">{{ account.name }}</text>
                  <text class="type-badge">已归档</text>
                </view>
                <text class="account-meta">{{ account.recordCount }} 笔记录</text>
              </view>
              <text class="account-balance bk-amount">
                ¥{{ formatCents(account.balanceCents) }}
              </text>
            </view>
          </view>
        </template>

        <text class="list-tip">
          点账户 →「设为默认账户」，新建账单时会自动选中它。
          余额按「期初 + 收入 − 支出」实时计算，删除记录后会自动更新。
        </text>
      </template>
    </view>

    <view v-if="editorVisible" class="editor-mask" @click="closeEditor">
      <view class="editor-sheet" @click.stop>
        <view class="editor-head">
          <text class="editor-title">{{ editingId ? "编辑账户" : "新增账户" }}</text>
          <text class="editor-cancel" @click="closeEditor">取消</text>
        </view>

        <view class="editor-preview">
          <view class="preview-icon" :style="{ background: form.color }">
            <wd-icon :name="form.icon" size="32px" color="#fff" />
          </view>
          <text v-if="editingAccount" class="preview-balance bk-amount">
            当前余额 ¥{{ formatCents(editingAccount.balanceCents) }}
          </text>
        </view>

        <input
          v-model="form.name"
          class="name-input"
          type="text"
          maxlength="12"
          placeholder="账户名称（如：现金、工资卡）"
          placeholder-class="name-placeholder"
        />

        <text class="editor-label">账户类型</text>
        <view class="type-options">
          <view
            v-for="option in typeOptions"
            :key="option.value"
            class="type-option"
            :class="{ active: form.type === option.value }"
            @click="form.type = option.value"
          >
            {{ option.label }}
          </view>
        </view>

        <text class="editor-label">期初余额</text>
        <input
          v-model="form.initialBalance"
          class="name-input"
          type="text"
          placeholder="0.00，欠款可填负数"
          placeholder-class="name-placeholder"
        />

        <text class="editor-label">图标</text>
        <view class="icon-grid">
          <view
            v-for="icon in iconOptions"
            :key="icon"
            class="icon-cell"
            :class="{ active: form.icon === icon }"
            :style="form.icon === icon ? { background: form.color } : undefined"
            @click="form.icon = icon"
          >
            <wd-icon :name="icon" size="20px" :color="form.icon === icon ? '#fff' : '#646a73'" />
          </view>
        </view>

        <text class="editor-label">颜色</text>
        <view class="color-grid">
          <view
            v-for="color in colorOptions"
            :key="color"
            class="color-cell"
            :class="{ active: form.color === color }"
            :style="{ background: color }"
            @click="form.color = color"
          >
            <wd-icon v-if="form.color === color" name="check" size="14px" color="#fff" />
          </view>
        </view>

        <view v-if="editingId" class="secondary-actions">
          <view
            v-if="editingAccount && !editingAccount.archived && !isDefaultAccount(editingAccount)"
            class="secondary-btn"
            @click="makeDefaultAccount"
          >
            设为默认账户
          </view>
          <view v-if="!editingIsSystem" class="secondary-btn" @click="toggleArchive">
            {{ editingAccount?.archived ? "取消归档" : "归档账户" }}
          </view>
          <view v-if="!editingIsSystem" class="secondary-btn danger" @click="handleDelete">
            删除账户
          </view>
        </view>

        <view class="save-btn" :class="{ disabled: saving }" @click="handleSave">
          {{ saving ? "保存中" : "保存" }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app"
import {
  ACCOUNT_COLOR_OPTIONS,
  ACCOUNT_ICON_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  archiveAccount,
  createAccount,
  deleteAccount,
  getAccountBalances,
  isLocalDataMode,
  updateAccount,
} from "@/api/bookkeeping"
import type { AccountBalance, AccountType } from "@/api/bookkeeping"
import { decimalToCents, formatCents } from "@/api/bookkeeping/money"
import { getDefaultAccountId, setDefaultAccountId } from "@/utils/bookkeeping-prefs"

const typeOptions = ACCOUNT_TYPE_OPTIONS
const iconOptions = ACCOUNT_ICON_OPTIONS
const colorOptions = ACCOUNT_COLOR_OPTIONS

const state = ref<"loading" | "ready" | "error">("loading")
const errorMessage = ref("")
const accounts = ref<AccountBalance[]>([])
const editorVisible = ref(false)
const editingId = ref("")
const saving = ref(false)
const storedDefaultId = ref(getDefaultAccountId())
let requestSeq = 0

const form = reactive({
  name: "",
  type: "cash" as AccountType,
  icon: "money-circle",
  color: "#F7B731",
  initialBalance: "0.00",
})

const activeAccounts = computed(() => accounts.value.filter((account) => !account.archived))
const archivedAccounts = computed(() => accounts.value.filter((account) => account.archived))

const totalBalanceCents = computed(() =>
  activeAccounts.value.reduce((sum, account) => sum + account.balanceCents, 0),
)

const editingAccount = computed(() =>
  accounts.value.find((account) => String(account.id) === editingId.value),
)

const editingIsSystem = computed(() => !!editingAccount.value?.isSystem)

/** 当前默认账户：优先用用户设置的，失效时回退到系统账户 */
const defaultAccountId = computed(() => {
  const stored = storedDefaultId.value
  const available = accounts.value.find(
    (account) => String(account.id) === stored && !account.archived,
  )
  if (available) return String(available.id)
  const system = accounts.value.find((account) => account.isSystem && !account.archived)
  return system ? String(system.id) : ""
})

function isDefaultAccount(account: AccountBalance): boolean {
  return !account.archived && String(account.id) === defaultAccountId.value
}

function typeLabel(type: AccountType): string {
  return typeOptions.find((option) => option.value === type)?.label || "其他"
}

function toast(title: string): void {
  uni.showToast({ title, icon: "none" })
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error) return error
  if (error instanceof Error && error.message) return error.message
  const raw = error as { errMsg?: string; message?: string } | null
  return raw?.errMsg || raw?.message || "未知错误"
}

async function load(): Promise<void> {
  if (!isLocalDataMode) {
    state.value = "error"
    errorMessage.value = "当前为远程接口模式，账户管理仅支持本地数据模式。"
    return
  }

  const seq = ++requestSeq
  state.value = "loading"
  errorMessage.value = ""

  try {
    const response = await getAccountBalances(true)
    if (seq !== requestSeq) return
    accounts.value = response.data || []
    storedDefaultId.value = getDefaultAccountId()
    state.value = "ready"
  } catch (error) {
    if (seq !== requestSeq) return
    state.value = "error"
    console.error("[bookkeeping] 账户加载失败:", error)
    errorMessage.value = errorText(error)
  }
}

function openCreate(): void {
  editingId.value = ""
  form.name = ""
  form.type = "cash"
  form.icon = "money-circle"
  form.color = "#F7B731"
  form.initialBalance = "0.00"
  editorVisible.value = true
}

function openEdit(account: AccountBalance): void {
  editingId.value = String(account.id)
  form.name = account.name
  form.type = account.type
  form.icon = account.icon || "money-circle"
  form.color = account.color || "#F7B731"
  form.initialBalance = formatCents(account.initialBalanceCents, { grouping: false })
  editorVisible.value = true
}

function closeEditor(): void {
  if (saving.value) return
  editorVisible.value = false
}

function parseInitialBalance(): number {
  const text = form.initialBalance.trim()
  if (!text) return 0
  return decimalToCents(text)
}

async function handleSave(): Promise<void> {
  if (saving.value) return

  const name = form.name.trim()
  if (!name) {
    toast("请输入账户名称")
    return
  }
  if (name.length > 12) {
    toast("账户名称不超过 12 个字")
    return
  }

  let initialBalanceCents = 0
  try {
    initialBalanceCents = parseInitialBalance()
  } catch (error) {
    toast(error instanceof Error ? error.message : "期初余额格式不正确")
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateAccount(editingId.value, {
        name,
        type: form.type,
        icon: form.icon,
        color: form.color,
        initialBalanceCents,
      })
    } else {
      await createAccount({
        name,
        type: form.type,
        icon: form.icon,
        color: form.color,
        initialBalanceCents,
      })
    }
    editorVisible.value = false
    uni.showToast({ title: editingId.value ? "已保存" : "已添加", icon: "success" })
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : "保存失败")
  } finally {
    saving.value = false
  }
}

function makeDefaultAccount(): void {
  const account = editingAccount.value
  if (!account || account.archived) return
  setDefaultAccountId(String(account.id))
  storedDefaultId.value = String(account.id)
  editorVisible.value = false
  uni.showToast({ title: "已设为默认账户", icon: "success" })
}

async function toggleArchive(): Promise<void> {
  if (!editingAccount.value) return
  if (editingAccount.value.isSystem) {
    toast("系统账户不能归档")
    return
  }

  try {
    await archiveAccount(editingId.value, !editingAccount.value.archived)
    editorVisible.value = false
    uni.showToast({
      title: editingAccount.value.archived ? "已取消归档" : "已归档",
      icon: "success",
    })
    await load()
  } catch (error) {
    toast(error instanceof Error ? error.message : "操作失败")
  }
}

function handleDelete(): void {
  if (!editingId.value) return
  if (editingIsSystem.value) {
    toast("系统账户无法删除")
    return
  }

  const target = editingAccount.value
  uni.showModal({
    title: "删除账户",
    content: `确定删除「${target?.name || "该账户"}」吗？有记录的账户只能归档。`,
    confirmText: "删除",
    confirmColor: "#f54a45",
    cancelText: "取消",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteAccount(editingId.value)
        editorVisible.value = false
        uni.showToast({ title: "已删除", icon: "success" })
        await load()
      } catch (error) {
        toast(error instanceof Error ? error.message : "删除失败")
      }
    },
  })
}

onShow(() => {
  load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped lang="scss">
.accounts-page {
  min-height: 100vh;
  background: var(--bk-bg);
}

.nav-add {
  padding: 8rpx 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--bk-primary-dark);
}

.page-body {
  padding: 24rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
}

.page-state {
  padding-top: 100rpx;
}

.total-card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, #ffc000, #ff9f00);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 30rpx rgb(255 192 0 / 25%);
}

.total-label {
  font-size: 26rpx;
  opacity: 0.9;
}

.total-value {
  display: block;
  margin: 12rpx 0 14rpx;
  font-size: 60rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.total-meta {
  font-size: 22rpx;
  opacity: 0.88;
}

.account-list {
  overflow: hidden;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgb(31 35 41 / 4%);
}

.account-list.archived {
  opacity: 0.72;
}

.account-row {
  display: flex;
  align-items: center;
  min-height: 116rpx;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #f2f3f5;
}

.account-row:last-child {
  border-bottom: none;
}

.account-row:active {
  background: #fafafa;
}

.account-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
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

.type-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  margin-left: 10rpx;
  font-size: 18rpx;
  color: var(--bk-text-tertiary);
  background: #f2f3f5;
  border-radius: 6rpx;
}

.system-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  margin-left: 8rpx;
  font-size: 18rpx;
  color: var(--bk-text-tertiary);
  background: #f2f3f5;
  border-radius: 6rpx;
}

.default-badge {
  flex-shrink: 0;
  padding: 2rpx 10rpx;
  margin-left: 8rpx;
  font-size: 18rpx;
  color: var(--bk-primary-dark);
  background: #fff7e0;
  border-radius: 6rpx;
}

.account-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--bk-text-tertiary);
}

.account-balance {
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.list-empty {
  padding: 60rpx 20rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.group-title {
  display: block;
  padding: 28rpx 8rpx 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--bk-text-tertiary);
}

.list-tip {
  display: block;
  padding: 24rpx 12rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--bk-text-tertiary);
  text-align: center;
}

.editor-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 40%);
}

.editor-sheet {
  box-sizing: border-box;
  width: 100%;
  max-height: 90vh;
  padding: 26rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  overflow-y: auto;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  animation: sheet-up 0.18s ease-out;
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16rpx;
}

.editor-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--bk-text);
}

.editor-cancel {
  font-size: 26rpx;
  color: var(--bk-text-secondary);
}

.editor-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 0 20rpx;
}

.preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  box-shadow: 0 8rpx 20rpx rgb(31 35 41 / 12%);
}

.preview-balance {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--bk-text-tertiary);
}

.name-input {
  box-sizing: border-box;
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: var(--bk-text);
  background: #f7f8fa;
  border-radius: 16rpx;
}

.name-placeholder {
  color: var(--bk-text-tertiary);
}

.editor-label {
  display: block;
  margin: 26rpx 0 14rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: var(--bk-text-secondary);
}

.type-options {
  display: flex;
  gap: 12rpx;
}

.type-option {
  flex: 1;
  padding: 14rpx 0;
  font-size: 24rpx;
  color: var(--bk-text-secondary);
  text-align: center;
  background: #f2f3f5;
  border-radius: 14rpx;
}

.type-option.active {
  font-weight: 600;
  color: var(--bk-primary-dark);
  background: #fff7e0;
  box-shadow: inset 0 0 0 1rpx #ffd666;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 12rpx;
}

.icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: #f2f3f5;
  border-radius: 14rpx;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16rpx;
}

.color-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2rpx rgb(255 255 255 / 60%);
}

.color-cell.active {
  box-shadow:
    inset 0 0 0 4rpx #fff,
    0 2rpx 8rpx rgb(31 35 41 / 20%);
}

.secondary-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.secondary-btn {
  flex: 1;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: var(--bk-text-secondary);
  text-align: center;
  background: #f2f3f5;
  border-radius: 999rpx;
}

.secondary-btn.danger {
  color: var(--bk-danger);
  background: #fff1f0;
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  margin-top: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  background: var(--bk-primary);
  border-radius: 999rpx;
}

.save-btn.disabled {
  opacity: 0.6;
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
