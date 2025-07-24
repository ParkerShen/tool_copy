<template>
    <!-- H5 使用 Symbol SVG -->
    <svg v-if="isH5" class="icon" aria-hidden="true" :style="{ fontSize: size + 'px', color }">
      <use :xlink:href="`#icon-${name}`" />
    </svg>
  
    <!-- 小程序 / App 使用 Font Class -->
    <text v-else class="iconfont" :class="'icon-' + name" :style="{ fontSize: size + 'px', color }"></text>
  </template>
  
  <script>
  export default {
    name: "IconFont",
    props: {
      name: { type: String, required: true },
      size: { type: [Number, String], default: 24 },
      color: { type: String, default: '#333' },
    },
    computed: {
      isH5() {
        // #ifdef H5
        return true;
        // #endif
        // #ifndef H5
        return false;
        // #endif
      }
    }
  }
  </script>
  
  <style scoped>
  .icon {
    width: 1em;
    height: 1em;
    vertical-align: -0.15em;
    fill: currentColor;
    overflow: hidden;
  }
  </style>
  