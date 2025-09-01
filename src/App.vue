<template>
  <!-- <PDF ref="pdf" class="pdf" src="version1.pdf" :scale="2"
    @rendered="dumpText()"
  /> -->
  <div class="pdf-compare">
    <PDF ref="pdf" class="pdf" src="version1.pdf" :scale="1" visible-text split-text
      @rendered="dumpText()"
    />
    <div class="diff-connectors"></div>
    <PDF ref="pdf" class="pdf" src="version2.pdf" :scale="1" visible-text split-text
      @rendered="dumpText()"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

import PDF from './components/PDF.vue'

const pdf = ref<InstanceType<typeof PDF>>()

function dumpText() {
  console.log(pdf.value?.getBlocks())
}
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
