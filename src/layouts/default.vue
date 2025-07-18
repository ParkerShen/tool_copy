<!--
 * @Date: 2025-07-03 15:10:43
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-16 19:44:08
 * @FilePath: \mobile\src\layouts\default.vue
-->
<template>
  <view class="default-layout">
    <slot />
  </view>
</template>
<style lang="scss">
.default-layout {
  height: 100vh;
  /* #ifdef H5 */
  padding-bottom: 88px;
  overflow: auto;
  /* #endif */
}
</style>
