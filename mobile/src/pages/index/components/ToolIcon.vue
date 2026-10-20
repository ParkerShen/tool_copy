<template>
  <svg class="tool-glyph" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g v-if="name === 'receipt'">
      <path
        class="ti-main ti-white"
        d="M14 9h20a3 3 0 0 1 3 3v25l-4.2-3-4.3 3-4.5-3-4.3 3-4.2-3L10 37V12a3 3 0 0 1 3-3z"
        fill="#fff"
        stroke="#d8e8c6"
        stroke-width="1"
      />
      <rect x="17" y="16" width="14" height="2.6" rx="1.3" fill="#7fb35a" />
      <rect x="17" y="21.5" width="9.5" height="2.6" rx="1.3" fill="#b3d199" />
      <circle cx="31" cy="29" r="4.4" fill="#7fb35a" />
      <path
        d="M29.2 29.1l1.6 1.6 2.9-3.1"
        stroke="#fff"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>

    <g v-else-if="name === 'book'">
      <defs>
        <linearGradient id="tg-book" x1="13" y1="8" x2="34" y2="41" gradientUnits="userSpaceOnUse">
          <stop stop-color="#b7a0f1" />
          <stop offset="1" stop-color="#7b5bd0" />
        </linearGradient>
      </defs>
      <rect class="ti-main" x="12" y="8" width="25" height="32" rx="4" fill="url(#tg-book)" />
      <rect x="17" y="11" width="21" height="26" rx="3" fill="#fff" opacity=".95" />
      <rect x="21" y="16" width="12" height="2.4" rx="1.2" fill="#cbbcf0" />
      <rect x="21" y="21" width="9" height="2.4" rx="1.2" fill="#ddd3f4" />
      <path d="M17 11h-2a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h2Z" fill="#6a4ac2" />
      <path d="M27 11v10l3-2 3 2V11Z" fill="#8f72dd" />
    </g>

    <g v-else-if="name === 'calendar'">
      <defs>
        <linearGradient id="tg-cal" x1="10" y1="12" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stop-color="#f7b26d" />
          <stop offset="1" stop-color="#e78f3f" />
        </linearGradient>
      </defs>
      <rect class="ti-main" x="10" y="12" width="28" height="26" rx="6" fill="#fff" stroke="#f2ddc5" />
      <path d="M10 18a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v2H10Z" fill="url(#tg-cal)" />
      <rect x="15" y="7" width="3.5" height="9" rx="1.75" fill="#d98534" />
      <rect x="29.5" y="7" width="3.5" height="9" rx="1.75" fill="#d98534" />
      <rect x="16" y="24" width="7" height="7" rx="2" fill="#f5c18a" />
      <rect x="25" y="24" width="7" height="7" rx="2" fill="#fbe7d1" />
    </g>

    <g v-else-if="name === 'folder'">
      <defs>
        <linearGradient id="tg-folder" x1="9" y1="11" x2="39" y2="37" gradientUnits="userSpaceOnUse">
          <stop stop-color="#9dc2f1" />
          <stop offset="1" stop-color="#6796dc" />
        </linearGradient>
      </defs>
      <path
        class="ti-main"
        d="M9 15a4 4 0 0 1 4-4h7.2l3.2 4H35a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4Z"
        fill="url(#tg-folder)"
      />
      <path d="M15 18h18a2.4 2.4 0 0 1 2.4 2.4V34H15Z" fill="#fff" opacity=".92" />
      <path d="M15 18h18a2.4 2.4 0 0 1 2.4 2.4v2.6H15Z" fill="#dceafc" />
    </g>

    <g v-else-if="name === 'pen'">
      <defs>
        <linearGradient id="tg-pen" x1="12" y1="10" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stop-color="#bba2f1" />
          <stop offset="1" stop-color="#8a68d8" />
        </linearGradient>
      </defs>
      <path class="ti-main" d="M33 7.5l7.5 7.5L20 35.5 9 38.5l3-11Z" fill="url(#tg-pen)" />
      <path d="M31 10l7 7" stroke="#fff" stroke-width="2" opacity=".85" />
      <path d="M12.5 35.5l2.2-7.4 5.2 5.2Z" fill="#6f4fc6" />
      <path d="M18 28.5l5 5" stroke="#fff" stroke-width="1.6" opacity=".7" />
    </g>

    <g v-else-if="name === 'box'">
      <defs>
        <linearGradient id="tg-box" x1="8" y1="14" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stop-color="#a7d9b1" />
          <stop offset="1" stop-color="#79bd8b" />
        </linearGradient>
      </defs>
      <rect class="ti-main" x="8" y="17" width="32" height="21" rx="4" fill="url(#tg-box)" />
      <rect x="7" y="12" width="34" height="9" rx="3.5" fill="#b3dfbc" />
      <rect x="20.5" y="18" width="7" height="10" rx="1.6" fill="#fff" opacity=".9" />
      <path d="M8 27h32" stroke="#5f9d70" stroke-width="1.2" opacity=".35" />
    </g>

    <g v-else-if="name === 'chart'">
      <defs>
        <linearGradient id="tg-chart" x1="15" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stop-color="#eab3b3" />
          <stop offset="1" stop-color="#ca7676" />
        </linearGradient>
      </defs>
      <rect class="ti-main" x="9" y="10" width="30" height="28" rx="6" fill="#fff" stroke="#f2dede" />
      <rect x="15" y="25" width="4.6" height="8" rx="2.3" fill="#f2c6c6" />
      <rect x="22" y="20" width="4.6" height="13" rx="2.3" fill="#e2a0a0" />
      <rect x="29" y="15" width="4.6" height="18" rx="2.3" fill="url(#tg-chart)" />
      <path d="M14 33h20" stroke="#f3e2e2" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <g v-else-if="name === 'wallet'">
      <defs>
        <linearGradient id="tg-wallet" x1="8" y1="13" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stop-color="#e8cb91" />
          <stop offset="1" stop-color="#c49a51" />
        </linearGradient>
      </defs>
      <rect class="ti-main" x="8" y="13" width="32" height="23" rx="5" fill="url(#tg-wallet)" />
      <rect x="8" y="18" width="32" height="5.5" fill="#f6eeda" />
      <path d="M12 13h20" stroke="#efdfba" stroke-width="2" opacity=".8" />
      <rect x="30" y="26" width="7" height="4" rx="2" fill="#fff" opacity=".95" />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<style scoped>
.tool-glyph {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ti-main {
  filter: drop-shadow(0 2px 2px rgb(70 60 40 / 12%));
}
</style>
