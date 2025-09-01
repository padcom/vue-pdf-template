<template>
  <!-- <PDF ref="pdf" class="pdf" src="version1.pdf" :scale="2"
    @rendered="dumpText()"
  /> -->
  <div class="pdf-compare">
    <PDF ref="pdf1" class="pdf" src="version1.pdf" :scale="1" :render-bitmap="false" visible-text split-text
      @rendered="isLeftRendered = true"
    />
    <div class="diff-connectors"></div>
    <PDF ref="pdf2" class="pdf" src="version2.pdf" :scale="1" :render-bitmap="false" visible-text split-text
      @rendered="isRightRendered = true"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { diffArrays } from 'diff'

import PDF from './components/PDF.vue'

const pdf1 = ref<InstanceType<typeof PDF>>()
const pdf2 = ref<InstanceType<typeof PDF>>()

const isLeftRendered = ref(false)
const isRightRendered = ref(false)
const isReady = computed(() => isLeftRendered.value && isRightRendered.value)

// eslint-disable-next-line complexity, max-lines-per-function
watch(isReady, () => {
  // prepare list of blocks (excluding whitespaces) for comparison
  const leftBlocks = pdf1.value?.getBlocks().filter(block => block.text.trim()) || []
  const rightBlocks = pdf2.value?.getBlocks().filter(block => block.text.trim()) || []

  // do the comparison
  const differences = diffArrays(
    leftBlocks.map(b => b.text),
    rightBlocks.map(b => b.text),
    { oneChangePerToken: false },
  )

  console.log(differences)

  // mark blocks according to their change
  let leftIdx = 0, rightIdx = 0
  for (const change of differences) {
    if (change.removed) {
      // eslint-disable-next-line max-depth
      for (let i = 0; i < change.count; i++) {
        const block = leftBlocks[leftIdx++]
        block.change = change
        block.span.style.backgroundColor = 'red'
      }
    } else if (change.added) {
      // eslint-disable-next-line max-depth
      for (let i = 0; i < change.count; i++) {
        const block = rightBlocks[rightIdx++]
        block.change = change
        block.span.style.backgroundColor = 'green'
      }
    } else {
      leftIdx += change.count
      rightIdx += change.count
    }
  }
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
