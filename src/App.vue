<template>
  <!-- <PDF ref="pdf" class="pdf" src="version1.pdf" :scale="2"
    @rendered="dumpText()"
  /> -->
  <div class="pdf-compare">
    <PDF ref="pdf1" class="pdf" src="version1.pdf" :scale="1" visible-text split-text
      @rendered="console.log(pdf1?.getPages());"
    />
    <div class="diff-connectors"></div>
    <PDF ref="pdf2" class="pdf" src="version2.pdf" :scale="1" visible-text split-text
      @rendered="console.log(pdf2?.getPages()); console.log(pdf2?.getBlockForWordInLine(pdf2.getPages(), 4, 5))"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import PDF from './components/PDF.vue'

const pdf1 = ref<InstanceType<typeof PDF>>()
const pdf2 = ref<InstanceType<typeof PDF>>()
</script>

<style lang="postcss">
#app {
  height: 100dvh;
}
</style>

<style lang="postcss" scoped>
.pdf-compare {
  margin-inline: auto;
  display: flex;
  width: max-content;
  height: 100%;

  .diff-connectors {
    width: 64px;
    background-color: gray;
  }
}
</style>
