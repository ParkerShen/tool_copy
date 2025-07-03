<template>
  <view class="default-layout">
    <slot />
  </view>
</template>

<style lang="scss">
.default-layout {
  // height: 100vh;
  /* #ifdef H5 */
  padding-bottom: 88px;
  overflow: auto;
  /* #endif */
}
</style>
