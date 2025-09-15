<template>
  <!-- <PDF ref="pdf" class="pdf" src="version1.pdf" :scale="2"
    @rendered="dumpText()"
  /> -->
  <div class="pdf-compare">
    <PDF ref="pdf1" class="pdf" src="version1.pdf" :scale="1" :render-bitmap="false" visible-text split-text
      @rendered="isLeftRendered = true"
    />
    <div class="diff-connectors">
      <DiffConnectors :connectors />
      <!-- <DiffConnector v-for="(connector, index) in diffs" :key="index"
        :left="{ y1: connector.left.top, y2: connector.left.bottom }"
        :right="{ y1: connector.right.top, y2: connector.right.bottom }"
      /> -->
    </div>
    <PDF ref="pdf2" class="pdf" src="version2.pdf" :scale="1" :render-bitmap="false" visible-text split-text
      @rendered="isRightRendered = true"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { diffArrays, type ChangeObject } from 'diff'

import PDF from './components/PDF.vue'
import DiffConnectors, { type Connector } from './components/DiffConnectors.ce.vue'
import type { TextBlock } from './lib/pdf'

const pdf1 = ref<InstanceType<typeof PDF>>()
const pdf2 = ref<InstanceType<typeof PDF>>()

const isLeftRendered = ref(false)
const isRightRendered = ref(false)
const isReady = computed(() => isLeftRendered.value && isRightRendered.value)

interface Diff {
  type: 'added' | 'removed' | 'changed'
  changes: ChangeObject<string[]>[]
  left: {
    elements: HTMLSpanElement[]
    top: number
    bottom: number
  }
  right: {
    elements: HTMLSpanElement[]
    top: number
    bottom: number
  }
}

const diffs = ref<Diff[]>([])
// eslint-disable-next-line complexity
const connectors = computed<Connector[]>(() => diffs.value.map(diff => ({
  left: { y1: diff.left.top, y2: diff.left.bottom },
  right: { y1: diff.right.top, y2: diff.right.bottom },
  fill: diff.type === 'added' ? 'green' : diff.type === 'removed' ? 'red' : 'blue',
  stroke: diff.type === 'added' ? 'green' : diff.type === 'removed' ? 'red' : 'blue',
})))

function tokenizeTextBlock(block: TextBlock) {
  const text = block.text.trim()

  // text.split(',').map(item => item === '' ? ',' : item).flat()

  return text
  // .map(chunk => chunk.split(',').map(item => item === '' ? ',' : item)).flat()
  // .map(chunk => chunk.split('.').map(item => item === '' ? '.' : item)).flat()
}

// eslint-disable-next-line complexity, max-lines-per-function
watch(isReady, () => {
  // prepare list of blocks (excluding whitespaces) for comparison
  const leftBlocks = pdf1.value?.getBlocks().filter(block => block.text.trim()) || []
  const rightBlocks = pdf2.value?.getBlocks().filter(block => block.text.trim()) || []

  // do the comparison
  const differences = diffArrays(
    leftBlocks.map(tokenizeTextBlock).flat(),
    rightBlocks.map(tokenizeTextBlock).flat(),
    { oneChangePerToken: false },
  )

  let currentDiff: Diff | null = null

  // mark blocks according to their change
  let leftIdx = 0, rightIdx = 0
  for (const change of differences) {
    if (currentDiff === null && (change.removed || change.added)) {
      currentDiff = {
        type: 'added',
        changes: [],
        left: {
          elements: [],
          top: leftBlocks[leftIdx].r.top,
          bottom: leftBlocks[leftIdx].r.top,
        },
        right: {
          elements: [],
          top: rightBlocks[rightIdx].r.top,
          bottom: rightBlocks[rightIdx].r.top,
        },
      }

      diffs.value.push(currentDiff)
    }
    if (change.removed) {
      currentDiff!.changes.push(change)
      currentDiff!.type = 'removed'

      // eslint-disable-next-line max-depth
      for (let i = 0; i < change.count; i++) {
        const block = leftBlocks[leftIdx++]
        block.change = change
        block.span.style.backgroundColor = 'red'
        currentDiff!.left.elements.push(block.span)
        currentDiff!.left.bottom = block.r.bottom
      }
    } else if (change.added) {
      currentDiff!.changes.push(change)
      currentDiff!.type = 'added'

      // eslint-disable-next-line max-depth
      for (let i = 0; i < change.count; i++) {
        const block = rightBlocks[rightIdx++]
        block.change = change
        block.span.style.backgroundColor = 'green'
        currentDiff!.right.elements.push(block.span)
        currentDiff!.right.bottom = block.r.bottom
      }
    } else {
      leftIdx += change.count
      rightIdx += change.count
      currentDiff = null
    }
  }

  console.log('diffs:', diffs.value)

  for (const diff of diffs.value) {
    if (diff.left.elements.length > 0 && diff.right.elements.length > 0) {
      diff.type = 'changed'

      for (const span of diff.left.elements) {
        span.style.backgroundColor = 'blue'
      }

      for (const span of diff.right.elements) {
        span.style.backgroundColor = 'blue'
      }
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
