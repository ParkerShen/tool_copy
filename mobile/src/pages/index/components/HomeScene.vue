<template>
  <view class="home-scene">
    <svg
      class="scene-svg"
      viewBox="0 0 750 680"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hs-wall" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="#faf3e4" />
          <stop offset="0.55" stop-color="#f7ecd8" />
          <stop offset="1" stop-color="#f3e5cc" />
        </linearGradient>
        <radialGradient id="hs-sun" cx="0.72" cy="0.06" r="0.55">
          <stop offset="0" stop-color="#fff8d9" stop-opacity="0.95" />
          <stop offset="0.55" stop-color="#fff3cd" stop-opacity="0.35" />
          <stop offset="1" stop-color="#fff3cd" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="hs-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#d9b88c" />
          <stop offset="0.42" stop-color="#ebd1aa" />
          <stop offset="1" stop-color="#c39a68" />
        </linearGradient>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e6f1ee" />
          <stop offset="0.55" stop-color="#d0e3df" />
          <stop offset="1" stop-color="#bad4ce" />
        </linearGradient>
        <linearGradient id="hs-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fcf8ef" />
          <stop offset="1" stop-color="#eee4d1" />
        </linearGradient>
        <linearGradient id="hs-table" x1="0.1" y1="0" x2="0.35" y2="1">
          <stop offset="0" stop-color="#ddb189" />
          <stop offset="0.45" stop-color="#c9976b" />
          <stop offset="1" stop-color="#b27d54" />
        </linearGradient>
        <linearGradient id="hs-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f8f0de" stop-opacity="0" />
          <stop offset="0.55" stop-color="#f8f0de" stop-opacity="0.72" />
          <stop offset="1" stop-color="#f8f0de" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="hs-sill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f5ead7" />
          <stop offset="1" stop-color="#d9c5a9" />
        </linearGradient>
        <linearGradient id="hs-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fffbf2" />
          <stop offset="1" stop-color="#e9ddc8" />
        </linearGradient>
        <linearGradient id="hs-cat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fffaf0" />
          <stop offset="1" stop-color="#efe1ce" />
        </linearGradient>
        <filter id="hs-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="hs-soft2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="hs-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.055" />
          </feComponentTransfer>
        </filter>
        <clipPath id="hs-window-clip">
          <rect x="316" y="58" width="428" height="300" rx="3" />
        </clipPath>
        <clipPath id="hs-cat-clip">
          <ellipse cx="662" cy="412" rx="80" ry="46" />
        </clipPath>
      </defs>

      <!-- 墙面 -->
      <rect width="750" height="680" fill="url(#hs-wall)" />
      <rect width="750" height="680" fill="url(#hs-sun)" />

      <!-- 左侧木梁 -->
      <path
        d="M0 0h46c8 110 4 260 12 392 4 86-2 200-10 288H0Z"
        fill="url(#hs-beam)"
      />
      <path
        d="M13 0c6 130 2 300 8 438 3 78 0 160-5 242"
        stroke="#b98a55"
        stroke-width="3"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M31 0c4 120 2 300 7 430"
        stroke="#f4dcb8"
        stroke-width="4"
        fill="none"
        opacity="0.5"
      />
      <circle cx="27" cy="414" r="10" fill="#a9763c" />
      <circle cx="27" cy="414" r="6" fill="#d3a05c" />
      <circle cx="25" cy="411" r="2.2" fill="#f6d9a8" opacity="0.9" />

      <!-- 枝叶 -->
      <g fill="none" stroke="#7a5838" stroke-linecap="round">
        <path d="M58 0c18 54 12 104 40 152" stroke-width="3.4" />
        <path d="M70 36c30-14 52-24 74-30" stroke-width="2.6" />
        <path d="M82 96c28 2 52-6 74-22" stroke-width="2.2" />
      </g>
      <g fill="#9db183">
        <ellipse cx="138" cy="12" rx="20" ry="9" transform="rotate(-28 138 12)" />
        <ellipse cx="160" cy="34" rx="17" ry="8" transform="rotate(14 160 34)" />
        <ellipse cx="120" cy="52" rx="19" ry="8.5" transform="rotate(-18 120 52)" />
        <ellipse cx="172" cy="88" rx="20" ry="9" transform="rotate(22 172 88)" />
        <ellipse cx="112" cy="118" rx="17" ry="8" transform="rotate(-30 112 118)" />
        <ellipse cx="152" cy="142" rx="16" ry="7.5" transform="rotate(8 152 142)" />
      </g>
      <g fill="#b3c49a" opacity="0.8">
        <ellipse cx="96" cy="28" rx="15" ry="7" transform="rotate(36 96 28)" />
        <ellipse cx="186" cy="62" rx="13" ry="6" transform="rotate(-12 186 62)" />
      </g>

      <!-- 窗户 -->
      <rect x="300" y="42" width="460" height="330" rx="8" fill="url(#hs-frame)" />
      <rect x="316" y="58" width="428" height="300" rx="3" fill="url(#hs-sky)" />

      <g clip-path="url(#hs-window-clip)">
        <path
          d="M316 286c62-38 118-40 168-8 44 28 96 26 148-8 38-26 78-30 112-14v102H316Z"
          fill="#a9c4b7"
          opacity="0.38"
        />
        <g fill="#a8c1c2">
          <rect x="326" y="232" width="34" height="128" />
          <rect x="366" y="208" width="26" height="152" />
          <rect x="398" y="244" width="42" height="116" />
        </g>
        <g fill="#b8cdc7">
          <rect x="446" y="196" width="30" height="164" />
          <rect x="482" y="226" width="46" height="134" />
          <rect x="534" y="176" width="28" height="184" />
          <rect x="568" y="214" width="52" height="146" />
          <rect x="626" y="188" width="34" height="172" />
          <rect x="666" y="222" width="62" height="138" />
        </g>
        <g fill="#9db6b9" opacity="0.6">
          <rect x="452" y="164" width="8" height="36" />
          <rect x="540" y="146" width="6" height="32" />
        </g>
        <g fill="#e9f1ee" opacity="0.45">
          <rect x="334" y="244" width="5" height="7" />
          <rect x="346" y="244" width="5" height="7" />
          <rect x="334" y="260" width="5" height="7" />
          <rect x="346" y="260" width="5" height="7" />
          <rect x="372" y="222" width="5" height="7" />
          <rect x="383" y="222" width="5" height="7" />
          <rect x="372" y="238" width="5" height="7" />
          <rect x="452" y="210" width="6" height="8" />
          <rect x="464" y="210" width="6" height="8" />
          <rect x="452" y="228" width="6" height="8" />
          <rect x="490" y="240" width="6" height="8" />
          <rect x="504" y="240" width="6" height="8" />
          <rect x="490" y="258" width="6" height="8" />
          <rect x="540" y="190" width="6" height="8" />
          <rect x="540" y="208" width="6" height="8" />
          <rect x="576" y="228" width="6" height="8" />
          <rect x="590" y="228" width="6" height="8" />
          <rect x="606" y="228" width="6" height="8" />
          <rect x="576" y="246" width="6" height="8" />
          <rect x="632" y="202" width="6" height="8" />
          <rect x="646" y="202" width="6" height="8" />
          <rect x="632" y="220" width="6" height="8" />
          <rect x="676" y="236" width="6" height="8" />
          <rect x="692" y="236" width="6" height="8" />
          <rect x="708" y="236" width="6" height="8" />
          <rect x="676" y="254" width="6" height="8" />
        </g>
        <rect x="316" y="58" width="428" height="300" fill="#e9f3f0" opacity="0.3" />
      </g>

      <g fill="url(#hs-frame)">
        <rect x="448" y="58" width="14" height="300" />
        <rect x="592" y="58" width="14" height="300" />
        <rect x="316" y="168" width="428" height="12" />
      </g>

      <!-- 窗台 -->
      <rect x="288" y="370" width="478" height="20" rx="5" fill="url(#hs-sill)" />
      <rect x="288" y="388" width="478" height="7" rx="3" fill="#b58a5d" opacity="0.5" />

      <!-- 木桌面 -->
      <path d="M304 394c120-8 280-10 446-2v288H304Z" fill="url(#hs-table)" />
      <path
        d="M304 394c120-8 280-10 446-2"
        stroke="#e6b285"
        stroke-width="4"
        opacity="0.55"
        fill="none"
      />
      <g stroke="#8f4f2a" stroke-width="2" opacity="0.14" fill="none">
        <path d="M340 420c40 60 44 150 34 260" />
        <path d="M420 430c34 64 40 150 30 250" />
        <path d="M520 436c28 60 32 144 24 244" />
        <path d="M630 432c30 62 34 150 26 248" />
      </g>

      <!-- 玻璃瓶绿植 -->
      <g>
        <path
          d="M356 430h30l-4 44a10 10 0 0 1-10 9h-2a10 10 0 0 1-10-9Z"
          fill="#e8efe6"
          opacity="0.55"
        />
        <path d="M360 438h22" stroke="#fff" stroke-width="2" opacity="0.7" />
        <path
          d="M371 430c-2-26-8-40-18-52"
          stroke="#6f8a5d"
          stroke-width="2.4"
          fill="none"
          stroke-linecap="round"
        />
        <path
          d="M371 430c2-22 8-38 18-48"
          stroke="#6f8a5d"
          stroke-width="2.4"
          fill="none"
          stroke-linecap="round"
        />
        <ellipse cx="349" cy="374" rx="12" ry="5" transform="rotate(-42 349 374)" fill="#87a06e" />
        <ellipse cx="392" cy="376" rx="12" ry="5" transform="rotate(40 392 376)" fill="#87a06e" />
        <ellipse cx="361" cy="392" rx="10" ry="4.5" transform="rotate(-30 361 392)" fill="#9bb185" />
      </g>

      <!-- 咖啡 -->
      <g>
        <ellipse cx="468" cy="470" rx="62" ry="13" fill="#6f3f22" opacity="0.18" filter="url(#hs-soft)" />
        <ellipse cx="468" cy="462" rx="54" ry="12" fill="#f6eddc" />
        <path
          d="M430 414h76l-8 40a14 14 0 0 1-14 12h-32a14 14 0 0 1-14-12Z"
          fill="url(#hs-cup)"
        />
        <path
          d="M506 422c14 0 20 8 20 16s-8 14-20 14"
          fill="none"
          stroke="#efe4d2"
          stroke-width="9"
        />
        <ellipse cx="468" cy="415" rx="38" ry="8" fill="#6b4226" />
        <ellipse cx="468" cy="414" rx="30" ry="5.5" fill="#8a5a37" opacity="0.8" />
        <g
          stroke="#fff"
          stroke-width="5"
          fill="none"
          opacity="0.45"
          stroke-linecap="round"
          filter="url(#hs-soft)"
        >
          <path d="M452 398c-8-14 4-22-2-36" />
          <path d="M470 396c-10-16 6-26 0-42" />
          <path d="M488 400c-6-12 4-20 0-30" />
        </g>
      </g>

      <!-- 熟睡的猫 -->
      <g transform="translate(-16 0)">
        <ellipse cx="652" cy="462" rx="98" ry="16" fill="#5a331c" opacity="0.16" filter="url(#hs-soft)" />
        <path
          d="M712 420c26 2 34 22 26 38-8 14-26 16-36 6"
          fill="none"
          stroke="#e9a25e"
          stroke-width="13"
          stroke-linecap="round"
        />
        <ellipse cx="662" cy="412" rx="80" ry="46" fill="url(#hs-cat)" />
        <g clip-path="url(#hs-cat-clip)">
          <path d="M604 380c22-10 44-6 58 4-12 10-28 12-44 8Z" fill="#e9a25e" opacity="0.9" />
          <path d="M700 378c22 0 44 10 48 26-18 6-40 2-54-8Z" fill="#e9a25e" opacity="0.85" />
          <path d="M678 434c26-4 48 2 56 14-20 8-46 6-64-2Z" fill="#e9a25e" opacity="0.7" />
          <path d="M626 430c-12-4-22-2-30 6 10 6 24 6 34 0Z" fill="#e9a25e" opacity="0.5" />
        </g>
        <circle cx="602" cy="396" r="38" fill="#fdf8ed" />
        <path d="M572 372 568 344l26 14Z" fill="#fdf8ed" />
        <path d="M628 362 652 344l-2 28Z" fill="#fdf8ed" />
        <path d="M574 366 572 352l14 7Z" fill="#eaa9a2" />
        <path d="M632 362 645 353l-1 14Z" fill="#eaa9a2" />
        <path d="M610 360c10-4 20 0 24 8-10 4-20 2-24-8Z" fill="#e9a25e" opacity="0.9" />
        <path d="M583 398c4 5 10 5 14 0" fill="none" stroke="#6b4a33" stroke-width="3" stroke-linecap="round" />
        <path d="M611 398c4 5 10 5 14 0" fill="none" stroke="#6b4a33" stroke-width="3" stroke-linecap="round" />
        <path d="M602 406l-4 3h8Z" fill="#e79a92" />
        <path
          d="M602 412c-2 4-6 5-9 3M602 412c2 4 6 5 9 3"
          fill="none"
          stroke="#8a654a"
          stroke-width="1.8"
          stroke-linecap="round"
        />
        <g stroke="#c4a98c" stroke-width="1.4" stroke-linecap="round" opacity="0.8">
          <path d="M578 402l-20-3M578 408l-20 4M626 402l20-3M626 408l20 4" />
        </g>
        <ellipse cx="624" cy="446" rx="19" ry="11" fill="#fdf8ed" />
        <ellipse cx="652" cy="450" rx="19" ry="10" fill="#fdf8ed" />
        <g stroke="#d8c3a9" stroke-width="1.2" opacity="0.8">
          <path d="M618 450v5M624 451v5M630 450v5M646 454v4M652 455v4M658 454v4" />
        </g>
      </g>

      <!-- 柔光 -->
      <circle cx="690" cy="70" r="180" fill="#fff6d6" opacity="0.22" filter="url(#hs-soft2)" />
      <circle cx="120" cy="250" r="90" fill="#fff8e3" opacity="0.18" filter="url(#hs-soft2)" />

      <!-- 纸纹 -->
      <rect width="750" height="680" filter="url(#hs-grain)" opacity="0.5" />

      <!-- 底部并入奶油底 -->
      <rect x="0" y="582" width="750" height="98" fill="url(#hs-fade)" />
    </svg>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.home-scene {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 680rpx;
  overflow: hidden;
  pointer-events: none;
}

.scene-svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
