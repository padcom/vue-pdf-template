<template>
  <!-- <PDF ref="pdf" class="pdf" src="version1.pdf" :scale="2"
    @rendered="dumpText()"
  /> -->
  <div class="pdf-compare">
    <PDF ref="pdf1" class="pdf" src="version1.pdf" :scale="1" visible-text split-text
      @rendered="isLeftRendered = true"
    />
    <div class="diff-connectors"></div>
    <PDF ref="pdf2" class="pdf" src="version2.pdf" :scale="1" visible-text split-text
      @rendered="isRightRendered = true"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { structuredPatch, diffWords, diffWordsWithSpace, diffLines } from 'diff'

import PDF from './components/PDF.vue'

const pdf1 = ref<InstanceType<typeof PDF>>()
const pdf2 = ref<InstanceType<typeof PDF>>()

const isLeftRendered = ref(false)
const isRightRendered = ref(false)
const isReady = computed(() => isLeftRendered.value && isRightRendered.value)

// eslint-disable-next-line complexity
watch(isReady, () => {
  // const patch = structuredPatch(
  //   'version1.pdf',
  //   'version2.pdf',
  //   pdf1.value?.getText() || '',
  //   pdf2.value?.getText() || '',
  //   '',
  //   '',
  //   { context: 0, ignoreWhitespace: true },
  // )

  const patch = diffLines(pdf1.value?.getText() || '', pdf2.value?.getText() || '', {
    // ignoreCase: true,
    oneChangePerToken: true,
  })

  // console.log('patch:', patch)
  // console.log(pdf1.value?.getBlocks())
  console.log(pdf2.value?.getText())
  // console.log(pdf2.value?.getText())
})
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
