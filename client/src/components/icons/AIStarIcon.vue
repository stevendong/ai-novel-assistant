<template>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 定义渐变色 -->
    <defs>
      <linearGradient id="aiBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1488CC;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#1488CC;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1488CC;stop-opacity:1" />
      </linearGradient>

      <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:#e6f7ff;stop-opacity:0.6" />
      </linearGradient>
    </defs>

    <!-- 四角星主体 -->
    <path d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z"
          fill="url(#aiBlueGradient)"
          stroke="#096dd9"
          stroke-width="0.5"
          stroke-linejoin="round"/>

    <!-- 内部装饰圆点 -->
    <circle cx="12" cy="10" r="1.5" fill="url(#centerGradient)" opacity="0.9"/>

    <!-- AI标识小装饰 -->
    <path d="M10.5 8.5L11.5 9.5M12.5 9.5L13.5 8.5"
          stroke="#ffffff"
          stroke-width="0.8"
          stroke-linecap="round"
          opacity="0.8"/>

    <path d="M10.5 11.5L11.5 10.5M12.5 10.5L13.5 11.5"
          stroke="#ffffff"
          stroke-width="0.8"
          stroke-linecap="round"
          opacity="0.8"/>

    <!-- 外发光效果 -->
    <path d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z"
          fill="none"
          stroke="#1488CC"
          stroke-width="0.3"
          stroke-linejoin="round"
          opacity="0.4"
          transform="scale(1.05)"
          transform-origin="12 10"/>

    <!-- 左上角小四角星 -->
    <path d="M7 5L7.8 6.2L9 6.5L7.8 6.8L7 8L6.2 6.8L5 6.5L6.2 6.2L7 5Z"
          fill="#1488CC"
          opacity="0.7"/>

    <!-- 右下角小四角星 -->
    <path d="M17 14L17.8 15.2L19 15.5L17.8 15.8L17 17L16.2 15.8L15 15.5L16.2 15.2L17 14Z"
          fill="#1488CC"
          opacity="0.6"/>
  </svg>
</template>

<script setup lang="ts">
// AI星形图标组件
</script>