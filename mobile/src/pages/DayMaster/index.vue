<!--
 * @Date: 2025-07-11 16:19:18
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-11 16:19:40
 * @FilePath: \mobile\src\pages\DayMaster\index.vue
-->
<route lang="json5" type="page">
{
  layout: "default",
  style: {
    navigationBarTitleText: "倒数日",
    navigationBarBackgroundColor: "#FFFFFF",
  },
}
</route>

<template>
  <view class="daymaster-page">
    <view class="card">
      <view class="icon-wrap">
        <wd-icon name="calendar" size="36px" color="#f5222d" />
      </view>
      <text class="title">倒数日</text>
      <text class="desc">重要日子、纪念日和倒计时，之后会在这里管理。</text>
      <text class="badge">即将上线</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
//
</script>

<style lang="scss" scoped>
.daymaster-page {
  min-height: 100vh;
  padding: 30rpx;
  background: #f6f7f9;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
  background: #fff;
  border-radius: 24rpx;
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  background: #fff1f0;
  border-radius: 32rpx;
}

.title {
  margin-top: 28rpx;
  font-size: 38rpx;
  font-weight: 600;
  color: #222;
}

.desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: #999;
  text-align: center;
}

.badge {
  padding: 10rpx 28rpx;
  margin-top: 30rpx;
  font-size: 24rpx;
  color: #f5222d;
  background: #fff1f0;
  border-radius: 999rpx;
}
</style>
