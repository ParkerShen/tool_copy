<template>
  <view class="home-page">
    <!-- 财务/倒数日/备忘卡片 -->
    <view class="card-group">
      <view class="card">
        <view class="card-header">
          <view class="icon-circle bg-blue">
            <wd-icon name="money-circle" size="25px" color="white"></wd-icon>
          </view>
          <view class="title">
            今日收支
            <view class="sub-title">查看今日财务状况</view>
          </view>
          <view class="value text-blue">
            收入128
            <!-- <view class="unit">净收入</view> -->
          </view>
        </view>
        <view class="detail-list">
          <view class="item">
            <view class="label">午餐支出</view>
            <view class="amount minus">-¥25</view>
          </view>
          <view class="item">
            <view class="label">交通费</view>
            <view class="amount minus">-¥15</view>
          </view>
          <view class="item">
            <view class="label">工资收入</view>
            <view class="amount plus">+¥3000</view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-header">
          <view class="icon-circle bg-orange">
            <wd-icon name="dashboard" size="25px" color="white"></wd-icon>
          </view>
          <view class="title">
            最近倒数日
            <view class="sub-title">春节还有</view>
          </view>
          <view class="value text-orange">
            42天
            <!-- <view class="unit">剩余时间</view> -->
          </view>
        </view>
        <view class="detail-list">
          <view class="item">
            <view class="label">期末考试已经</view>
            <view class="amount minus">10天</view>
          </view>
          <view class="item">
            <view class="label">项目结束已经</view>
            <view class="amount minus">2天</view>
          </view>
          <view class="item">
            <view class="label">面试还有</view>
            <view class="amount plus">10天</view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-header">
          <view class="icon-circle bg-green">
            <wd-icon name="list" size="25px" color="white"></wd-icon>
          </view>
          <view class="title">
            我的备忘录
            <view class="sub-title">代办事项管理</view>
          </view>
          <view class="value text-green">
            8条
            <!-- <view class="unit">未完成</view> -->
          </view>
        </view>
        <view class="detail-list">
          <view class="item">
            <view class="label">需要写日记</view>
            <!-- <view class="amount">
              <wd-icon name="check" size="15px"></wd-icon>
            </view> -->
          </view>
          <view class="item">
            <view class="label">需要养马</view>
            <view class="amount"></view>
          </view>
          <view class="item">
            <view class="label">需要上墙</view>
            <view class="amount plus"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 精选动态 -->
    <view class="section-title">精选动态</view>
    <view class="section-description">发现社区的精彩内容</view>

    <scroll-view class="waterfall" scroll-y>
      <view class="columns">
        <view class="column">
          <view
            v-for="(item, index) in leftPosts"
            :key="'left' + index"
            class="post-card"
            @click="viewPost(item)"
          >
            <image v-if="item.img" :src="item.img" class="post-img" mode="aspectFill" />
            <view class="post-text">{{ item.text }}</view>
            <view class="post-meta">
              <text class="post-user">{{ item.user }}</text>
              <text class="post-like">❤️ {{ item.like }}</text>
            </view>
          </view>
        </view>

        <view class="column">
          <view
            v-for="(item, index) in rightPosts"
            :key="'right' + index"
            class="post-card"
            @click="viewPost(item)"
          >
            <image v-if="item.img" :src="item.img" class="post-img" mode="aspectFill" />
            <view class="post-text">{{ item.text }}</view>
            <view class="post-meta">
              <text class="post-user">{{ item.user }}</text>
              <text class="post-like">❤️ {{ item.like }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 悬浮发布按钮 -->
    <wd-button class="fab" type="primary" icon="add" shape="circle" @click="createPost"></wd-button>
  </view>
</template>

<script setup>
import { ref, onMounted } from "vue"

const leftPosts = ref([])
const rightPosts = ref([])

onMounted(() => {
  const posts = [
    {
      user: "小明",
      text: "今天看到了超美的日落，心情顿时变好了！",
      img: "https://via.placeholder.com/300x200",
      like: 12,
    },
    { user: "旅行者", text: "刚完成了一次说走就走的旅行，收获满满！", img: "", like: 15 },
    {
      user: "书虫",
      text: "读书让人静下心来，享受当下。",
      img: "https://via.placeholder.com/300x250",
      like: 9,
    },
    {
      user: "摄影控",
      text: "拍到了超美银河星空。",
      img: "https://via.placeholder.com/300x450",
      like: 21,
    },
  ]
  posts.forEach((item, index) => {
    if (index % 2 === 0) {
      leftPosts.value.push(item)
    } else {
      rightPosts.value.push(item)
    }
  })
})

const createPost = () => uni.navigateTo({ url: "/pages/post/create" })
const viewPost = (item) => {
  console.log("查看动态", item)
}
</script>

<style scoped>
.home-page {
  padding: 20rpx;
  background: #f7f8fa;
  min-height: 100vh;
}
.card-group {
  margin-bottom: 30rpx;
}
.card {
  background: #fff;
  border-radius: 15rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 30rpx;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.icon-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 5px;
}
.bg-blue {
  background-color: #409eff;
}
.bg-orange {
  background-color: #ffae4c;
}
.bg-green {
  background-color: #43d2cd;
}
.title {
  flex: 1;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.sub-title {
  font-size: 22rpx;
  color: gray;
  font-weight: 100;
}
.value {
  font-size: 48rpx;
  font-weight: bold;
  text-align: right;
}
.text-blue {
  color: #409eff;
}
.text-orange {
  color: #ffae4c;
}
.text-green {
  color: #43d2cd;
}
.unit {
  font-size: 20rpx;
  color: gray;
  font-weight: 100;
}
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.item {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #666;
}
.amount {
  font-size: 26rpx;
}
.minus {
  color: #f56c6c;
}
.plus {
  color: #67c23a;
}
.section-title {
  font-size: 34rpx;
  font-weight: 600;
  margin: 30rpx 0 0rpx;
}
.section-description {
  font-size: 25rpx;
  font-weight: 300;
  margin-bottom: 20px;
  color: gray;
}
.waterfall {
  max-height: 900rpx;
  overflow: hidden;
}
.columns {
  display: flex;
  justify-content: space-between;
}
.column {
  width: 48%;
}
.post-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
  transition: all 0.25s ease;
}
.post-card:active {
  transform: scale(0.97);
}
.post-img {
  width: 100%;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.post-text {
  font-size: 28rpx;
  line-height: 38rpx;
  margin-bottom: 14rpx;
}
.post-meta {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #888;
}
.fab {
  position: fixed;
  bottom: 50rpx;
  right: 40rpx;
  width: 100rpx;
  height: 100rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.25);
}
</style>
