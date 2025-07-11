<template>
  <view class="container">
    <!-- 漂浮活动标签 -->
    <view class="floating-event">婚礼: 还有15天</view>
    <view class="floating-event floating-right">生日: 还有120天</view>

    <view class="header">
      <text class="title">时光倒数</text>
      <text class="subtitle">记录每一个重要的日子</text>
    </view>

    <view class="current-date">
      <text>{{ todayDate }}</text>
    </view>

    <!-- 倒数日卡片区域 -->
    <view v-if="events.length > 0" class="countdown-container">
      <view v-for="(event, index) in events" :key="index" class="countdown-card">
        <view class="card-header">
          <text class="event-name">{{ event.name }}</text>
          <view class="delete-btn" @click="deleteEvent(index)">
            <uni-icons type="trash" size="20" color="#fff"></uni-icons>
          </view>
        </view>
        <view class="days-container">
          <text class="days-count">
            {{ daysRemaining(event.date) > 0 ? daysRemaining(event.date) : "0" }}
          </text>
          <text class="days-label">天</text>
        </view>
        <text class="event-date">{{ formatDate(event.date) }}</text>
        <view class="progress-container">
          <view class="progress-bar" :style="{ width: progressWidth(event.date) + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <uni-icons type="calendar" size="80" color="rgba(255,255,255,0.5)"></uni-icons>
      <text class="empty-text">添加您的第一个倒数日事件，记录重要的日子</text>
    </view>

    <!-- 添加按钮 -->
    <view class="add-btn" @click="showModal = true">
      <uni-icons type="plus" size="28" color="#fff"></uni-icons>
    </view>

    <!-- 添加事件弹窗 -->
    <uni-popup ref="popup" :is-mask-click="true" type="center" :mask-background-color="maskBgColor">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">添加倒数日</text>
          <uni-icons type="close" size="24" color="#fff" @click="closeModal"></uni-icons>
        </view>

        <view class="form-group">
          <text class="form-label">事件名称</text>
          <input
            class="form-input"
            type="text"
            placeholder="例如：婚礼、生日、毕业"
            v-model="newEvent.name"
          />
        </view>

        <view class="form-group">
          <text class="form-label">目标日期</text>
          <picker mode="date" :value="newEvent.date" @change="bindDateChange">
            <view class="picker">{{ newEvent.date || "请选择日期" }}</view>
          </picker>
        </view>

        <button class="submit-btn" @click="addEvent">添加事件</button>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      todayDate: "",
      events: [
        { name: "李雷的生日", date: "2025-08-30" },
        { name: "夏日旅行", date: "2025-07-20" },
        { name: "项目截止日期", date: "2025-09-15" },
      ],
      newEvent: {
        name: "",
        date: "",
      },
      showModal: false,
      maskBgColor: "rgba(0,0,0,0.5)",
    }
  },
  mounted() {
    this.updateCurrentDate()
  },
  methods: {
    // 更新当前日期显示
    updateCurrentDate() {
      const date = new Date()
      const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
      this.todayDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
    },

    // 计算剩余天数
    daysRemaining(targetDate) {
      const target = new Date(targetDate)
      const today = new Date()
      const diffTime = target.getTime() - today.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    },

    // 格式化日期显示
    formatDate(dateStr) {
      const date = new Date(dateStr)
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    },

    // 计算进度条宽度
    progressWidth(targetDate) {
      const days = this.daysRemaining(targetDate)
      return Math.max(5, Math.min(95, 100 - (days / 30) * 100))
    },

    // 日期选择变化
    bindDateChange(e) {
      this.newEvent.date = e.detail.value
    },

    // 添加事件
    addEvent() {
      if (!this.newEvent.name || !this.newEvent.date) {
        uni.showToast({
          title: "请填写事件名称并选择日期",
          icon: "none",
        })
        return
      }

      this.events.push({
        name: this.newEvent.name,
        date: this.newEvent.date,
      })

      // 重置表单并关闭弹窗
      this.newEvent = {
        name: "",
        date: "",
      }
      this.closeModal()
    },

    // 删除事件
    deleteEvent(index) {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这个事件吗？",
        success: (res) => {
          if (res.confirm) {
            this.events.splice(index, 1)
          }
        },
      })
    },

    // 打开弹窗
    openModal() {
      this.$refs.popup.open()
    },

    // 关闭弹窗
    closeModal() {
      this.$refs.popup.close()
    },
  },
}
</script>

<style lang="scss">
.container {
  position: relative;
  min-height: 100vh;
  padding: 40rpx;
  background: linear-gradient(135deg, #6e8efb 0%, #a777e3 100%);
  color: #fff;
  overflow-x: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1) 0%, transparent 40%);
    pointer-events: none;
  }
}

.floating-event {
  position: absolute;
  top: 60rpx;
  left: 10%;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.2);
  padding: 10rpx 20rpx;
  border-radius: 40rpx;
  animation: float 8s infinite ease-in-out;

  &.floating-right {
    left: auto;
    right: 10%;
    top: 13%;
    animation-delay: 2s;
  }
}

.header {
  text-align: center;
  padding: 40rpx 0;
}

.title {
  font-size: 56rpx;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.2);
  display: block;
}

.subtitle {
  font-size: 32rpx;
  opacity: 0.9;
  font-weight: 300;
}

.current-date {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20rpx);
  border-radius: 40rpx;
  padding: 20rpx 50rpx;
  margin: 60rpx auto;
  max-width: 700rpx;
  font-size: 40rpx;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.countdown-container {
  margin-bottom: 120rpx;
}

.countdown-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(24rpx);
  border-radius: 40rpx;
  padding: 50rpx;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 50rpx;
  transition: all 0.3s ease;

  &:active {
    transform: translateY(-10rpx);
    box-shadow: 0 30rpx 60rpx rgba(0, 0, 0, 0.2);
    background: rgba(255, 255, 255, 0.2);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  padding-bottom: 20rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.event-name {
  font-size: 48rpx;
  font-weight: 600;
  letter-spacing: 0.5px;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.days-container {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  margin: 20rpx 0;
}

.days-count {
  font-size: 70rpx;
  font-weight: 700;
  line-height: 1;
}

.days-label {
  font-size: 36rpx;
  opacity: 0.9;
}

.event-date {
  font-size: 32rpx;
  opacity: 0.85;
  margin: 10rpx 0;
  display: block;
}

.progress-container {
  height: 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  overflow: hidden;
  margin-top: 40rpx;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff9a9e, #fad0c4);
  border-radius: 20rpx;
}

.delete-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 70rpx;
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn {
  position: fixed;
  bottom: 60rpx;
  right: 60rpx;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a9e, #fad0c4);
  color: white;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &:active {
    transform: scale(0.98);
  }
}

.modal-content {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  border-radius: 50rpx;
  padding: 80rpx;
  width: 90%;
  max-width: 1000rpx;
  box-shadow: 0 40rpx 100rpx rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50rpx;
}

.modal-title {
  font-size: 60rpx;
  font-weight: bold;
}

.form-group {
  margin-bottom: 50rpx;
}

.form-label {
  display: block;
  margin-bottom: 16rpx;
  font-size: 36rpx;
  font-weight: 500;
}

.form-input,
.picker {
  width: 100%;
  padding: 30rpx;
  border-radius: 30rpx;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 32rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }
}

.submit-btn {
  background: linear-gradient(90deg, #ff9a9e, #fad0c4);
  color: white;
  border: none;
  width: 100%;
  padding: 32rpx;
  border-radius: 30rpx;
  font-size: 40rpx;
  font-weight: 600;
  margin-top: 20rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.2);

  &:active {
    transform: translateY(-6rpx);
  }
}

.empty-state {
  text-align: center;
  padding: 100rpx 40rpx;
}

.empty-text {
  display: block;
  font-size: 40rpx;
  max-width: 900rpx;
  margin: 40rpx auto 0;
  opacity: 0.9;
}

@keyframes float {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-20rpx) rotate(4deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(-30rpx) rotate(-4deg);
  }
  100% {
    transform: translateY(0) rotate(0deg);
  }
}
</style>
