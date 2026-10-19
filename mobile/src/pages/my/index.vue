<route lang="json5">
{
  layout: "default",
  style: { navigationBarTitleText: "我的" },
}
</route>

<template>
  <view class="my-page">
    <view class="header">
      <view class="avatar">
        <wd-icon name="user" size="26px" color="#ff9f00" />
      </view>
      <view class="header-info">
        <text class="header-title">本地记账</text>
        <text class="header-sub">数据只保存在这台设备</text>
      </view>
    </view>

    <view v-if="stats?.memoryOnly" class="warning">
      当前浏览器无法使用
      IndexedDB，数据只保存在内存中，刷新页面后会丢失。请更换浏览器或关闭无痕模式。
    </view>

    <view class="section">
      <text class="section-title">数据备份</text>
      <view class="action-list">
        <view class="action-item" @click="handleExportSqlite">
          <view class="action-icon bg-orange">
            <wd-icon name="download" size="20px" color="#fff" />
          </view>
          <view class="action-info">
            <text class="action-title">导出 SQLite 数据库</text>
            <text class="action-sub">全部工具数据，可原样恢复</text>
          </view>
          <wd-icon name="arrow-right" size="18px" color="#ccc" />
        </view>
        <view class="action-item" @click="handleExportJson">
          <view class="action-icon bg-blue">
            <wd-icon name="file" size="20px" color="#fff" />
          </view>
          <view class="action-info">
            <text class="action-title">导出 JSON 备份</text>
            <text class="action-sub">全部工具数据，可读文本</text>
          </view>
          <wd-icon name="arrow-right" size="18px" color="#ccc" />
        </view>
        <view class="action-item" @click="handleImport">
          <view class="action-icon bg-green">
            <wd-icon name="upload" size="20px" color="#fff" />
          </view>
          <view class="action-info">
            <text class="action-title">导入备份</text>
            <text class="action-sub">支持 .sqlite / .db / .json</text>
          </view>
          <wd-icon name="arrow-right" size="18px" color="#ccc" />
        </view>
      </view>
      <view class="backup-status" :class="{ due: backupDue }">
        <text>上次导出：{{ exportStatus }}</text>
        <text v-if="backupDue" class="backup-warn">
          建议每 {{ BACKUP_INTERVAL_DAYS }} 天导出一次
        </text>
      </view>
      <text class="backup-scope">
        一次导出即包含记账、倒数日和标签日记；DeepSeek API Key 不会写入备份。
      </text>
    </view>

    <view class="section">
      <view class="section-header">
        <view class="section-title-group">
          <text class="section-title">本机自动快照</text>
          <text class="section-sub">每天首次打开自动保存</text>
        </view>
        <text class="section-link" @click="handleCreateSnapshot">立即快照</text>
      </view>
      <view v-if="snapshots.length" class="snapshot-list">
        <view v-for="snapshot in snapshots" :key="snapshot.key" class="snapshot-item">
          <view class="snapshot-info">
            <text class="snapshot-title">{{ snapshot.label }}</text>
            <text class="snapshot-time">{{ formatSnapshotTime(snapshot) }}</text>
          </view>
          <text class="snapshot-action" @click="handleRestoreSnapshot(snapshot)">恢复</text>
          <text class="snapshot-action danger" @click="handleDeleteSnapshot(snapshot)">删除</text>
        </view>
      </view>
      <text v-else class="snapshot-empty">
        还没有快照。记一笔后每天首次打开会自动生成，也可以点「立即快照」。
      </text>
      <text class="snapshot-tip">
        快照会同时保存记账、倒数日和标签日记，最多保留 7 份每日快照和最近 3
        份操作前快照。它能防止误删、误导入，但无法防止清理 Safari
        网站数据或删除主屏幕图标，所以仍建议定期导出 .sqlite 到「文件」或 iCloud。
      </text>
    </view>

    <view class="section">
      <text class="section-title">危险操作</text>
      <view class="danger-btn" @click="handleClear">清空所有记账数据</view>
      <text class="danger-tip">
        清空后只保留默认分类和默认账户；倒数日和标签日记不会被清空。建议先导出备份。
      </text>
    </view>

    <view class="section about">
      <text class="about-title">关于本地模式</text>
      <text class="about-text">
        记账、倒数日等接口逻辑运行在页面内，数据库为 SQLite（WebAssembly），数据库文件持久化在浏览器的
        IndexedDB 中。因此不需要电脑或线上服务器，断网也能使用。
      </text>
      <text class="about-text">
        注意：清理 Safari 网站数据、卸载主屏幕图标或更换访问地址（origin）都会导致数据不可见，
        请定期导出备份。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import dayjs from "dayjs"
import {
  clearLocalDatabase,
  createLocalSnapshot,
  deleteLocalSnapshot,
  exportJsonBackup,
  exportSqliteBackup,
  getDatabaseStats,
  importJsonBackup,
  importSqliteBackup,
  isLocalDataMode,
  listLocalSnapshots,
  restoreLocalSnapshot,
} from "@/api/bookkeeping"
import type { LocalDatabaseStats, SnapshotInfo } from "@/api/bookkeeping"
import { BACKUP_INTERVAL_DAYS, daysSinceLastExport, markExported } from "@/utils/backupReminder"

const stats = ref<LocalDatabaseStats | null>(null)
const snapshots = ref<SnapshotInfo[]>([])
const exportDays = ref<number | null>(null)
const backupDue = computed(
  () => exportDays.value === null || exportDays.value >= BACKUP_INTERVAL_DAYS,
)
const exportStatus = computed(() => {
  if (exportDays.value === null) return "从未导出"
  if (exportDays.value === 0) return "今天"
  return `${exportDays.value} 天前`
})

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function formatSnapshotTime(snapshot: SnapshotInfo): string {
  if (!snapshot.createdAt) return snapshot.key
  return snapshot.kind === "daily"
    ? dayjs(snapshot.createdAt).format("YYYY-MM-DD")
    : dayjs(snapshot.createdAt).format("MM-DD HH:mm")
}

async function loadSnapshots(): Promise<void> {
  if (!isLocalDataMode) return
  try {
    snapshots.value = await listLocalSnapshots()
  } catch (error) {
    console.warn("读取本机快照失败:", error)
    snapshots.value = []
  }
}

function refreshExportStatus(): void {
  exportDays.value = daysSinceLastExport()
}

async function loadStats(): Promise<void> {
  if (!isLocalDataMode) {
    return
  }
  refreshExportStatus()
  // 先等数据库初始化完成（含当天的自动快照），再读取快照列表
  try {
    stats.value = await getDatabaseStats()
  } catch (error) {
    console.error("读取数据库信息失败:", error)
    uni.showToast({ title: errorMessage(error, "读取失败"), icon: "none" })
  }
  await loadSnapshots()
}

onShow(() => {
  loadStats()
})

onMounted(() => {
  if (!isLocalDataMode) {
    uni.showToast({ title: "当前为远程接口模式", icon: "none" })
  }
})

function timestamp(): string {
  return dayjs().format("YYYYMMDD-HHmmss")
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  try {
    const file = new File([blob], filename, { type: blob.type })
    const nav = navigator as any
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: filename })
      return
    }
  } catch (error) {
    // 用户取消分享或分享不可用，回退到下载
    console.warn("分享失败，改用下载:", error)
  }
  downloadBlob(blob, filename)
}

async function handleExportSqlite(): Promise<void> {
  try {
    uni.showLoading({ title: "导出中..." })
    const bytes = await exportSqliteBackup()
    const blob = new Blob([bytes], { type: "application/x-sqlite3" })
    uni.hideLoading()
    await shareOrDownload(blob, `bookkeeping-${timestamp()}.sqlite`)
    markExported()
    refreshExportStatus()
  } catch (error) {
    uni.hideLoading()
    console.error("导出 SQLite 失败:", error)
    uni.showToast({ title: errorMessage(error, "导出失败"), icon: "none" })
  }
}

async function handleExportJson(): Promise<void> {
  try {
    uni.showLoading({ title: "导出中..." })
    const payload = await exportJsonBackup()
    const text = JSON.stringify(payload, null, 2)
    const blob = new Blob([text], { type: "application/json;charset=utf-8" })
    uni.hideLoading()
    await shareOrDownload(blob, `bookkeeping-${timestamp()}.json`)
    markExported()
    refreshExportStatus()
  } catch (error) {
    uni.hideLoading()
    console.error("导出 JSON 失败:", error)
    uni.showToast({ title: errorMessage(error, "导出失败"), icon: "none" })
  }
}

function confirmModal(title: string, content: string, confirmText = "确定"): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText,
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

async function importFile(file: File): Promise<void> {
  const name = (file.name || "").toLowerCase()
  const confirmed = await confirmModal(
    "导入备份",
    "导入会整体替换当前的本机数据；备份中的倒数日和标签日记会一并恢复（旧 JSON 备份不含倒数日时保留现有倒数日）。建议先导出备份，确定继续吗？",
    "导入",
  )
  if (!confirmed) return

  uni.showLoading({ title: "导入中..." })
  try {
    if (name.endsWith(".json")) {
      const text = await file.text()
      const payload = JSON.parse(text)
      await importJsonBackup(payload)
    } else {
      const buffer = await file.arrayBuffer()
      await importSqliteBackup(new Uint8Array(buffer))
    }
    uni.hideLoading()
    await loadStats()
    uni.$emit("refreshBookkeepingData")
    uni.showToast({ title: "导入成功", icon: "success" })
  } catch (error) {
    uni.hideLoading()
    console.error("导入备份失败:", error)
    uni.showToast({ title: errorMessage(error, "导入失败"), icon: "none" })
  }
}

function handleImport(): void {
  // #ifdef H5
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".sqlite,.sqlite3,.db,.json,application/json,application/x-sqlite3"
  input.style.display = "none"
  input.onchange = () => {
    const file = input.files?.[0]
    document.body.removeChild(input)
    if (file) {
      importFile(file)
    }
  }
  document.body.appendChild(input)
  input.click()
  // #endif

  // #ifndef H5
  uni.showToast({ title: "请在 H5 页面中导入备份", icon: "none" })
  // #endif
}

async function handleCreateSnapshot(): Promise<void> {
  try {
    uni.showLoading({ title: "保存快照..." })
    await createLocalSnapshot()
    uni.hideLoading()
    await loadSnapshots()
    uni.showToast({ title: "快照已保存", icon: "success" })
  } catch (error) {
    uni.hideLoading()
    console.error("创建快照失败:", error)
    uni.showToast({ title: errorMessage(error, "快照失败"), icon: "none" })
  }
}

async function handleRestoreSnapshot(snapshot: SnapshotInfo): Promise<void> {
  const confirmed = await confirmModal(
    "恢复快照",
    `确定用「${snapshot.label} ${formatSnapshotTime(snapshot)}」覆盖当前数据吗？恢复前会自动保存当前数据。`,
    "恢复",
  )
  if (!confirmed) return

  try {
    uni.showLoading({ title: "恢复中..." })
    await restoreLocalSnapshot(snapshot.key)
    uni.hideLoading()
    await loadStats()
    uni.$emit("refreshBookkeepingData")
    uni.showToast({ title: "已恢复", icon: "success" })
  } catch (error) {
    uni.hideLoading()
    console.error("恢复快照失败:", error)
    uni.showToast({ title: errorMessage(error, "恢复失败"), icon: "none" })
  }
}

async function handleDeleteSnapshot(snapshot: SnapshotInfo): Promise<void> {
  const confirmed = await confirmModal(
    "删除快照",
    `确定删除「${snapshot.label} ${formatSnapshotTime(snapshot)}」吗？`,
    "删除",
  )
  if (!confirmed) return

  try {
    await deleteLocalSnapshot(snapshot.key)
    await loadSnapshots()
    uni.showToast({ title: "已删除", icon: "success" })
  } catch (error) {
    console.error("删除快照失败:", error)
    uni.showToast({ title: errorMessage(error, "删除失败"), icon: "none" })
  }
}

async function handleClear(): Promise<void> {
  const first = await confirmModal("清空数据", "确定要清空所有记账记录吗？默认分类会保留。", "清空")
  if (!first) return

  const second = await confirmModal(
    "再次确认",
    "此操作不可撤销。建议先导出备份，确定继续吗？",
    "确认清空",
  )
  if (!second) return

  try {
    uni.showLoading({ title: "清空中..." })
    await clearLocalDatabase()
    uni.hideLoading()
    await loadStats()
    uni.$emit("refreshBookkeepingData")
    uni.showToast({ title: "已清空", icon: "success" })
  } catch (error) {
    uni.hideLoading()
    console.error("清空数据失败:", error)
    uni.showToast({ title: errorMessage(error, "清空失败"), icon: "none" })
  }
}
</script>

<style scoped lang="scss">
.my-page {
  min-height: 100vh;
  padding: 30rpx 30rpx 180rpx;
  background: #f6f7f9;
}

.header {
  display: flex;
  align-items: center;
  padding: 34rpx;
  background: #fff;
  border-radius: 24rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  background: #fff7e0;
  border-radius: 50%;
}

.header-info {
  display: flex;
  flex-direction: column;
  margin-left: 24rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #222;
}

.header-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.warning {
  padding: 22rpx 26rpx;
  margin-top: 24rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #ad6800;
  background: #fffbe6;
  border: 1rpx solid #ffe58f;
  border-radius: 16rpx;
}

.section {
  padding: 30rpx;
  margin-top: 26rpx;
  background: #fff;
  border-radius: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.section-link {
  font-size: 26rpx;
  color: #ff9f00;
}

.section-title-group {
  display: flex;
  flex-direction: column;
}

.section-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}

.backup-status {
  display: flex;
  flex-direction: column;
  padding-top: 22rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  border-top: 1rpx solid #f5f5f5;
}

.backup-status.due {
  color: #d46b08;
}

.backup-warn {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #ff4d4f;
}

.backup-scope {
  display: block;
  padding: 16rpx 18rpx;
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.65;
  color: #ad6800;
  background: #fffbe6;
  border-radius: 12rpx;
}

.snapshot-list {
  display: flex;
  flex-direction: column;
  margin-top: 12rpx;
}

.snapshot-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-top: 1rpx solid #f5f5f5;

  &:first-child {
    border-top: none;
  }
}

.snapshot-info {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.snapshot-title {
  font-size: 28rpx;
  color: #333;
}

.snapshot-time {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #999;
}

.snapshot-action {
  padding: 8rpx 12rpx;
  margin-left: 12rpx;
  font-size: 24rpx;
  color: #ff9f00;
}

.snapshot-action.danger {
  color: #ff4d4f;
}

.snapshot-empty {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #999;
}

.snapshot-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #999;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  background: #f8f9fb;
  border-radius: 16rpx;
}

.stat-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.stat-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}

.stat-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-top: 1rpx solid #f5f5f5;
}

.stat-line-label {
  font-size: 26rpx;
  color: #666;
}

.stat-line-value {
  font-size: 26rpx;
  color: #333;
}

.plus {
  color: #52c41a;
}

.minus {
  color: #ff4d4f;
}

.action-list {
  display: flex;
  flex-direction: column;
  margin-top: 20rpx;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-top: 1rpx solid #f5f5f5;

  &:first-child {
    border-top: none;
  }
}

.action-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
}

.bg-orange {
  background: #ffb020;
}

.bg-blue {
  background: #4d80f0;
}

.bg-green {
  background: #52c41a;
}

.action-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-left: 20rpx;
}

.action-title {
  font-size: 30rpx;
  color: #333;
}

.action-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #999;
}

.danger-btn {
  padding: 24rpx 0;
  margin-top: 20rpx;
  font-size: 30rpx;
  color: #ff4d4f;
  text-align: center;
  background: #fff1f0;
  border-radius: 16rpx;
}

.danger-tip {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #999;
}

.about {
  display: flex;
  flex-direction: column;
}

.about-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
}

.about-text {
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #999;
}
</style>
