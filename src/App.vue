<template>
  <!-- <PDF src="version1.pdf" class="pdf" :scale="2" /> -->
  <PDF ref="pdf" src="version1.pdf" class="pdf" :scale="2" :render-bitmap="false" visible-text split-text
    @rendered="dumpText()"
  />
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import PDF from './components/PDF.vue'

const pdf = ref<InstanceType<typeof PDF>>()

function dumpText() {
  console.log(pdf.value?.getText())
}
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
