<!--
 * 新建 / 编辑倒数日，布局参考 Days Matter：
 * 蓝色顶栏 + 纸卡分组表单 + 进阶设置。
 * 通过 /pages/DayMaster/edit?id=xxx 编辑。
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationStyle: "custom",
    navigationBarTitleText: "倒数日",
    navigationBarBackgroundColor: "#0B83D6",
  },
}
</route>

<template>
  <view class="dm-edit-page">
    <!-- 蓝色顶栏 -->
    <view class="dm-navbar">
      <view class="dm-nav-side" @click="goBack">
        <wd-icon name="arrow-left" size="22px" color="#fff" />
      </view>
      <text class="dm-nav-title">{{ isEdit ? "编辑日子" : "添加新日子" }}</text>
      <view class="dm-nav-side right">
        <view class="dm-nav-save" @click="handleSave">保存</view>
      </view>
    </view>

    <view class="dm-form-body">
      <!-- 主表单 -->
      <view class="dm-sheet dm-sheet-main">
        <view class="paper-clip" />

        <view class="dm-type-switch">
          <view
            class="dm-type-item"
            :class="{ active: form.mode === 'countdown' }"
            @click="form.mode = 'countdown'"
          >
            倒计时
          </view>
          <view
            class="dm-type-item"
            :class="{ active: form.mode === 'countup' }"
            @click="selectMode('countup')"
          >
            正数日
          </view>
        </view>

        <view class="dm-field dm-title-field">
          <view class="dm-field-icon">
            <wd-icon name="edit" size="20px" color="#8a8f99" />
          </view>
          <input
            v-model="form.title"
            class="dm-title-input"
            placeholder="点击这里输入事件名称"
            maxlength="60"
          />
        </view>

        <view class="dm-field">
          <view class="dm-field-icon">
            <wd-icon name="calendar" size="20px" color="#8a8f99" />
          </view>
          <view class="dm-field-main">
            <text class="dm-field-label">目标日</text>
            <picker
              mode="date"
              :value="form.anchorDate"
              end="2200-12-31"
              @change="handleDateChange"
            >
              <view class="dm-field-value dm-blue-text">
                {{ form.anchorDate }}
                <text class="dm-weekday">{{ weekdayText }}</text>
              </view>
            </picker>
          </view>
          <view class="dm-solar-pill" @click="showSolarTip">公历</view>
        </view>

        <view class="dm-field" @click="openCategoryPicker">
          <view class="dm-field-icon">
            <wd-icon name="books" size="20px" color="#8a8f99" />
          </view>
          <text class="dm-field-label">倒数本</text>
          <view class="dm-field-value dm-field-tail">
            <text class="dm-category-emoji">{{ currentCategory.emoji }}</text>
            <text>{{ currentCategory.label }}</text>
            <wd-icon name="chevron-right" size="15px" color="#b9bdc4" />
          </view>
        </view>

        <view class="dm-field">
          <view class="dm-field-icon">
            <wd-icon name="pin" size="20px" color="#8a8f99" />
          </view>
          <text class="dm-field-label">置顶</text>
          <view class="dm-field-tail">
            <text class="dm-switch-state">{{ form.pinned ? "ON" : "OFF" }}</text>
            <switch
              :checked="form.pinned"
              color="#0b7fd1"
              style="transform: scale(0.78)"
              @change="handlePinToggle"
            />
          </view>
        </view>

        <view class="dm-field" @click="openRepeatPicker">
          <view class="dm-field-icon">
            <wd-icon name="refresh" size="20px" color="#8a8f99" />
          </view>
          <text class="dm-field-label">重复</text>
          <view class="dm-field-value dm-field-tail">
            <text>{{ repeatLabel }}</text>
            <wd-icon name="chevron-right" size="15px" color="#b9bdc4" />
          </view>
        </view>

        <view class="dm-field" @click="openRemindPicker">
          <view class="dm-field-icon">
            <wd-icon name="notification" size="20px" color="#8a8f99" />
          </view>
          <text class="dm-field-label">定期提醒</text>
          <view class="dm-field-value dm-field-tail">
            <text>{{ remindLabel }}</text>
            <wd-icon name="chevron-right" size="15px" color="#b9bdc4" />
          </view>
        </view>
      </view>

      <!-- 进阶设置 -->
      <view class="dm-sheet">
        <view class="dm-advanced-head" @click="advancedOpen = !advancedOpen">
          <wd-icon name="setting" size="20px" color="#8a8f99" />
          <text class="dm-advanced-title"><text class="dm-highlight">进阶设置</text></text>
          <wd-icon
            :name="advancedOpen ? 'chevron-up' : 'chevron-down'"
            size="15px"
            color="#b9bdc4"
          />
        </view>

        <template v-if="advancedOpen">
          <view v-if="form.mode === 'countdown'" class="dm-field">
            <view class="dm-field-icon">
              <wd-icon name="calendar" size="20px" color="#8a8f99" />
            </view>
            <text class="dm-field-label">结束日期</text>
            <view class="dm-field-tail">
              <text class="dm-switch-state">{{ useEndDate ? "ON" : "OFF" }}</text>
              <switch
                :checked="useEndDate"
                color="#0b7fd1"
                style="transform: scale(0.78)"
                @change="handleEndDateToggle"
              />
            </view>
          </view>

          <template v-if="form.mode === 'countdown' && useEndDate">
            <view class="dm-field sub-field">
              <text class="dm-field-label">结束日期</text>
              <picker
                mode="date"
                :value="form.anchorEndDate || form.anchorDate"
                end="2200-12-31"
                @change="handleEndDateChange"
              >
                <view class="dm-field-value dm-field-tail dm-blue-text">
                  <text>{{ form.anchorEndDate || form.anchorDate }}</text>
                  <wd-icon name="chevron-right" size="15px" color="#b9bdc4" />
                </view>
              </picker>
            </view>
            <text class="dm-hint">结束日期按年月日选择，跨天会显示「进行中 / 还剩 N 天」。</text>
          </template>

          <view v-if="form.mode === 'countup'" class="dm-field">
            <view class="dm-field-icon">
              <wd-icon name="add-circle" size="20px" color="#8a8f99" />
            </view>
            <text class="dm-field-label">正数包含起始日 (+1天)</text>
            <view class="dm-field-tail">
              <text class="dm-switch-state">{{ form.countupIncludeStart ? "ON" : "OFF" }}</text>
              <switch
                :checked="form.countupIncludeStart"
                color="#0b7fd1"
                style="transform: scale(0.78)"
                @change="handleCountupStartToggle"
              />
            </view>
          </view>

          <view class="dm-field column-field">
            <text class="dm-field-label">事件颜色</text>
            <view class="dm-color-row">
              <view
                v-for="color in COUNTDOWN_COLORS"
                :key="color"
                class="dm-color-dot"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              >
                <wd-icon v-if="form.color === color" name="check" size="14px" color="#fff" />
              </view>
            </view>
          </view>

          <view class="dm-field column-field">
            <text class="dm-field-label">选择图标</text>
            <scroll-view scroll-x class="dm-emoji-scroll" :show-scrollbar="false">
              <view class="dm-emoji-row">
                <view
                  v-for="emoji in COUNTDOWN_EMOJIS"
                  :key="emoji"
                  class="dm-emoji-item"
                  :class="{ active: form.emoji === emoji }"
                  @click="form.emoji = emoji"
                >
                  {{ emoji }}
                </view>
              </view>
            </scroll-view>
          </view>
        </template>
      </view>

      <!-- 备注 -->
      <view class="dm-sheet">
        <view class="dm-field column-field">
          <view class="dm-note-head">
            <wd-icon name="note" size="19px" color="#8a8f99" />
            <text class="dm-field-label">备注</text>
          </view>
          <textarea
            v-model="form.note"
            class="dm-note-input"
            placeholder="写点说明（可不填）"
            :maxlength="500"
            auto-height
          />
        </view>
      </view>

      <view v-if="isEdit" class="dm-delete" @click="handleDelete">删除这个日子</view>
    </view>

    <view class="dm-save-bar">
      <view class="dm-save-btn" :class="{ disabled: saving }" @click="handleSave">
        {{ saving ? "保存中…" : "保存" }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import { createEvent, getEventById, updateEvent, deleteEvent } from "@/api/countdown"
import { todayKey, weekdayLabel } from "@/api/countdown/date"
import {
  COUNTDOWN_CATEGORIES,
  COUNTDOWN_COLORS,
  COUNTDOWN_EMOJIS,
  COUNTDOWN_REMIND_OPTIONS,
  COUNTDOWN_REPEAT_MAP,
  COUNTDOWN_REPEAT_OPTIONS,
  getCategoryMeta,
  type CountdownCategory,
  type CountdownEvent,
  type CountdownMode,
  type CountdownRepeat,
} from "@/api/countdown/types"

const isEdit = ref(false)
const saving = ref(false)
const useEndDate = ref(false)
const advancedOpen = ref(true)

const form = reactive({
  id: "",
  title: "",
  anchorDate: todayKey(),
  anchorEndDate: null as string | null,
  countupIncludeStart: false,
  mode: "countdown" as CountdownMode,
  category: "custom" as CountdownCategory,
  repeatRule: "none" as CountdownRepeat,
  emoji: "⭐",
  color: "#8f959e",
  note: "",
  remindDaysBefore: -1,
  pinned: false,
})

const repeatLabel = computed(() => COUNTDOWN_REPEAT_MAP[form.repeatRule])
const currentCategory = computed(() => getCategoryMeta(form.category))
const weekdayText = computed(() => {
  try {
    return weekdayLabel(form.anchorDate)
  } catch {
    return ""
  }
})
const remindLabel = computed(() => {
  if (form.remindDaysBefore < 0) return "未设置"
  return (
    COUNTDOWN_REMIND_OPTIONS.find((item) => item.value === form.remindDaysBefore)?.label || "未设置"
  )
})

onLoad(async (options) => {
  const id = String(options?.id || "")
  if (!id) return
  isEdit.value = true
  const event = await getEventById(id)
  if (!event) {
    uni.showToast({ title: "倒数日不存在", icon: "none" })
    setTimeout(goBack, 500)
    return
  }
  form.id = event.id
  form.title = event.title
  form.anchorDate = event.anchorDate
  form.countupIncludeStart = event.countupIncludeStart
  // 旧版时间段数据也打开结束日期开关，方便直接改成跨天日期
  useEndDate.value = !!(event.anchorEndDate || event.anchorEndTime || event.anchorTime)
  form.anchorEndDate = event.anchorEndDate || (useEndDate.value ? event.anchorDate : null)
  form.mode = event.mode
  form.category = event.category
  form.repeatRule = event.repeatRule
  form.emoji = event.emoji
  form.color = event.color
  form.note = event.note
  form.remindDaysBefore = event.remindDaysBefore
  form.pinned = event.pinned
})

function selectMode(mode: CountdownMode): void {
  form.mode = mode
  if (mode === "countup") {
    form.repeatRule = "none"
    // 正数日没有结束日期区间
    useEndDate.value = false
    form.anchorEndDate = null
  } else {
    form.countupIncludeStart = false
  }
}

function selectCategory(category: CountdownCategory): void {
  const previous = getCategoryMeta(form.category)
  const next = getCategoryMeta(category)
  // 只有用户没改过默认外观时才跟随分类
  if (form.emoji === previous.emoji) form.emoji = next.emoji
  if (form.color === previous.color) form.color = next.color
  form.category = category
}

function selectRepeat(rule: CountdownRepeat): void {
  if (form.mode === "countup") return
  form.repeatRule = rule
}

function handleDateChange(event: { detail: { value: string } }): void {
  form.anchorDate = event.detail.value
  // 目标日往后移时，结束日期不能早于新的目标日
  if (form.anchorEndDate && form.anchorEndDate < form.anchorDate) {
    form.anchorEndDate = form.anchorDate
  }
}

function handleEndDateToggle(event: { detail: { value: boolean } }): void {
  useEndDate.value = event.detail.value
  if (useEndDate.value) {
    form.anchorEndDate = form.anchorEndDate || form.anchorDate
  } else {
    form.anchorEndDate = null
  }
}

function handleEndDateChange(event: { detail: { value: string } }): void {
  const end = event.detail.value
  if (end < form.anchorDate) {
    uni.showToast({ title: "结束日期不能早于目标日", icon: "none" })
    return
  }
  form.anchorEndDate = end
}

function handlePinToggle(event: { detail: { value: boolean } }): void {
  form.pinned = event.detail.value
}

function handleCountupStartToggle(event: { detail: { value: boolean } }): void {
  form.countupIncludeStart = event.detail.value
}

function openCategoryPicker(): void {
  uni.showActionSheet({
    itemList: COUNTDOWN_CATEGORIES.map((item) => `${item.emoji} ${item.label}`),
    success: (result) => {
      const item = COUNTDOWN_CATEGORIES[result.tapIndex]
      if (item) selectCategory(item.value)
    },
  })
}

function openRepeatPicker(): void {
  if (form.mode === "countup") {
    uni.showToast({ title: "正数日不支持重复", icon: "none" })
    return
  }
  uni.showActionSheet({
    itemList: COUNTDOWN_REPEAT_OPTIONS.map((item) => item.label),
    success: (result) => {
      const item = COUNTDOWN_REPEAT_OPTIONS[result.tapIndex]
      if (item) selectRepeat(item.value)
    },
  })
}

function openRemindPicker(): void {
  uni.showActionSheet({
    itemList: COUNTDOWN_REMIND_OPTIONS.map((item) => item.label),
    success: (result) => {
      const item = COUNTDOWN_REMIND_OPTIONS[result.tapIndex]
      if (item) form.remindDaysBefore = item.value
    },
  })
}

function showSolarTip(): void {
  uni.showToast({ title: "当前仅支持公历", icon: "none" })
}

function goBack(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: "/pages/DayMaster/index" })
}

async function handleSave(): Promise<void> {
  if (saving.value) return
  if (!form.title.trim()) {
    uni.showToast({ title: "请填写标题", icon: "none" })
    return
  }

  saving.value = true
  try {
    const useRange = form.mode === "countdown" && useEndDate.value
    const payload = {
      title: form.title,
      anchorDate: form.anchorDate,
      // 新版只保留结束日期，不再写入具体开始时间
      anchorTime: null,
      anchorEndDate: useRange ? form.anchorEndDate || form.anchorDate : null,
      anchorEndTime: null,
      countupIncludeStart: form.mode === "countup" ? form.countupIncludeStart : false,
      mode: form.mode,
      category: form.category,
      repeatRule: form.repeatRule,
      emoji: form.emoji,
      color: form.color,
      note: form.note,
      remindDaysBefore: form.remindDaysBefore,
      pinned: form.pinned,
    }
    if (form.id) {
      await updateEvent(form.id, payload)
    } else {
      await createEvent(payload)
    }
    uni.$emit("refreshCountdownData")
    uni.showToast({ title: "已保存", icon: "success" })
    setTimeout(goBack, 350)
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "保存失败",
      icon: "none",
    })
  } finally {
    saving.value = false
  }
}

function handleDelete(): void {
  if (!form.id) return
  uni.showModal({
    title: "删除倒数日",
    content: "删除后无法恢复，确定继续吗？",
    confirmText: "删除",
    confirmColor: "#f54a45",
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteEvent(form.id)
        uni.$emit("refreshCountdownData")
        uni.showToast({ title: "已删除", icon: "success" })
        setTimeout(goBack, 350)
      } catch (error) {
        uni.showToast({
          title: error instanceof Error ? error.message : "删除失败",
          icon: "none",
        })
      }
    },
  })
}
</script>

<style scoped lang="scss">
$dm-blue: #0b7fd1;
$dm-blue-dark: #0a6fb8;

.dm-edit-page {
  min-height: 100vh;
  background: #f1f1f3;
}

.dm-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top) + 12rpx) 20rpx 12rpx;
  background: linear-gradient(180deg, #0d88dc 0%, $dm-blue-dark 100%);
}

.dm-nav-side {
  display: flex;
  flex: none;
  align-items: center;
  min-width: 130rpx;
}

.dm-nav-side.right {
  justify-content: flex-end;
}

.dm-nav-title {
  flex: 1;
  overflow: hidden;
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-nav-save {
  padding: 10rpx 26rpx;
  font-size: 28rpx;
  color: #fff;
  background: rgb(255 255 255 / 18%);
  border: 1rpx solid rgb(255 255 255 / 38%);
  border-radius: 12rpx;
}

.dm-form-body {
  padding: 22rpx 20rpx calc(180rpx + env(safe-area-inset-bottom));
}

.dm-sheet {
  position: relative;
  margin-bottom: 22rpx;
  padding: 14rpx 0;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 3rpx 10rpx rgb(0 0 0 / 7%);
}

.dm-sheet-main {
  padding-top: 48rpx;
}

.paper-clip {
  position: absolute;
  top: 0;
  left: 50%;
  width: 110rpx;
  height: 28rpx;
  margin-left: -55rpx;
  background: linear-gradient(180deg, #fdfdfd 0%, #c6cacf 100%);
  border: 2rpx solid #9aa0a6;
  border-top: none;
  border-radius: 0 0 16rpx 16rpx;
  box-shadow: 0 2rpx 4rpx rgb(0 0 0 / 18%);
}

.paper-clip::after {
  position: absolute;
  top: -20rpx;
  right: 12rpx;
  left: 12rpx;
  height: 26rpx;
  content: "";
  background: linear-gradient(180deg, #f2f3f4 0%, #c7cbd0 100%);
  border: 2rpx solid #9aa0a6;
  border-radius: 12rpx 12rpx 6rpx 6rpx;
}

.dm-type-switch {
  display: flex;
  padding: 5rpx;
  margin: 0 24rpx 12rpx;
  background: #eef1f4;
  border-radius: 12rpx;
}

.dm-type-item {
  flex: 1;
  padding: 14rpx 0;
  font-size: 27rpx;
  font-weight: 500;
  color: #666d78;
  text-align: center;
  border-radius: 9rpx;
}

.dm-type-item.active {
  color: $dm-blue;
  background: #fff;
  box-shadow: 0 1rpx 4rpx rgb(0 0 0 / 8%);
}

.dm-field {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 96rpx;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #ededed;
}

.dm-field:last-child {
  border-bottom: none;
}

.dm-title-field {
  min-height: 110rpx;
}

.dm-field-icon {
  display: flex;
  flex: none;
  justify-content: center;
  width: 40rpx;
}

.dm-field-label {
  flex: none;
  font-size: 29rpx;
  color: #555b63;
}

.dm-field-main {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 12rpx;
}

.dm-field-value {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 29rpx;
  color: #333;
}

.dm-field-tail {
  flex: none;
  justify-content: flex-end;
  margin-left: auto;
}

.dm-title-input {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  color: #333;
}

.dm-blue-text {
  font-weight: 500;
  color: $dm-blue;
}

.dm-weekday {
  font-size: 25rpx;
  font-weight: 400;
}

.dm-category-emoji {
  font-size: 30rpx;
}

.dm-solar-pill {
  flex: none;
  padding: 8rpx 22rpx;
  font-size: 25rpx;
  color: #fff;
  background: $dm-blue;
  border-radius: 999rpx;
}

.dm-switch-state {
  font-size: 24rpx;
  color: #a2a7ae;
}

.dm-advanced-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 12rpx 24rpx 18rpx;
  border-bottom: 1rpx solid #ededed;
}

.dm-advanced-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.dm-highlight {
  padding: 2rpx 4rpx;
  background: linear-gradient(180deg, transparent 52%, #ffe98a 52%);
}

.sub-field {
  padding-left: 78rpx;
}

.dm-hint {
  display: block;
  padding: 14rpx 24rpx 8rpx;
  font-size: 23rpx;
  line-height: 1.55;
  color: #9aa0a6;
}

.column-field {
  flex-direction: column;
  align-items: stretch;
  gap: 14rpx;
  padding-top: 20rpx;
  padding-bottom: 20rpx;
}

.dm-color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.dm-color-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
}

.dm-emoji-scroll {
  width: 100%;
  white-space: nowrap;
}

.dm-emoji-row {
  display: inline-flex;
  gap: 14rpx;
  padding: 2rpx 0;
}

.dm-emoji-item {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  font-size: 34rpx;
  background: #f4f5f7;
  border-radius: 16rpx;
}

.dm-emoji-item.active {
  background: #e8f3fc;
  box-shadow: inset 0 0 0 2rpx $dm-blue;
}

.dm-note-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.dm-note-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 130rpx;
  padding: 16rpx;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  background: #f6f7f9;
  border-radius: 10rpx;
}

.dm-delete {
  padding: 26rpx 0 10rpx;
  font-size: 27rpx;
  color: #f54a45;
  text-align: center;
}

.dm-save-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  padding: 14rpx 24rpx calc(14rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -3rpx 12rpx rgb(0 0 0 / 6%);
}

.dm-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  font-size: 31rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #1b95e5 0%, $dm-blue 100%);
  border-radius: 14rpx;
}

.dm-save-btn:active {
  opacity: 0.9;
}

.dm-save-btn.disabled {
  opacity: 0.6;
}
</style>
