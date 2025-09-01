<template>
  <PDF src="version1.pdf" class="pdf" :scale="2" />
  <!-- <PDF src="version1.pdf" class="pdf" :scale="2" :render-bitmap="false" visible-text /> -->
</template>

<script lang="ts" setup>
import PDF from './components/PDF.vue'
</script>

<style lang="postcss">
#app {
  height: 100dvh;
  overflow: hidden;
}
</style>

<style lang="postcss" scoped>
.pdf {
  margin-inline: auto;
}
</style>
