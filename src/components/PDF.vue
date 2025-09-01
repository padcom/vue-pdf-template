<template>
  <div v-if="pages.length > 0" ref="content" class="pdf" :style>
    <div v-for="page in pages" :key="page.index" class="page" :style="page.style" :data-page-number="page.index">
      <img v-if="renderBitmap" class="graphic-layer" :class="bitmapClasses" :src="page.image">
      <div v-if="renderText" class="text-layer" :class="textClasses" v-html="page.content" />
      <slot name="page" :page />
    </div>
    <slot :pages />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onBeforeMount, onMounted, onBeforeUnmount } from 'vue'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import {
  renderPdf,
  collectTextBlocks,
  convertTextBlocksToLines,
  splitSpanIntoWords,
  type Page,
  getText,
} from '@/lib/pdf'
import { waitUntilSelectorExist } from '@/lib/dom'

const props = defineProps({
  src: { type: String, default: '' },
  workerSrc: { type: String, default: './pdf.worker.min.mjs' },
  scale: { type: Number, default: 1 },
  renderText: { type: Boolean, default: true },
  visibleText: { type: Boolean, default: false },
  splitText: { type: Boolean, default: false },
  renderBitmap: { type: Boolean, default: true },
  visibleBitmap: { type: Boolean, default: true },
})

const emit = defineEmits<{
  (e: 'rendered'): void
}>()

const pages = ref<Page[]>([])
const content = ref<HTMLDivElement>()

const style = computed(() => ({
  '--user-unit': '1',
  '--scale-factor': props.scale.toString(),
  '--total-scale-factor': 'calc(var(--scale-factor) * var(--user-unit))',
  '--scale-round-x': '1px',
  '--scale-round-y': '1px',
}))

const bitmapClasses = computed(() => ({
  'visible-bitmap': props.visibleBitmap,
}))

const textClasses = computed(() => ({
  'visible-text': props.visibleText,
}))

function cleanup() {
  pages.value = []
}

async function waitForContentRendered() {
  if (content.value) {
    await waitUntilSelectorExist(content.value, '.end-of-page', { count: pages.value.length })
  }
}

// eslint-disable-next-line complexity
async function render() {
  cleanup()

  if (props.src) {
    pages.value = await renderPdf(props.src, props.scale, {
      renderBitmap: props.renderBitmap,
      renderText: props.renderText,
    })
    await nextTick()

    if (props.renderText) {
      await waitForContentRendered()
    }

    if (props.splitText) {
      const spans = content.value?.querySelectorAll('span[role="presentation"]') as unknown as HTMLSpanElement[]
      spans?.forEach(span => { splitSpanIntoWords(span) })
    }

    emit('rendered')
  }
}

onBeforeMount(() => {
  GlobalWorkerOptions.workerSrc = props.workerSrc
})

onMounted(render)
onBeforeUnmount(cleanup)

watch(() => props.scale, render)

defineExpose({
  getBlocks() {
    const blocks = collectTextBlocks(content.value)
    convertTextBlocksToLines(blocks)

    return blocks
  },
  getText() {
    if (content.value) {
      return getText(this.getBlocks())
    } else {
      return ''
    }
  },
})
</script>

<style lang="postcss">
:root, :host {
  --pdf-text-color: black;
  --pdf-background: lightgray;
  --pdf-content-padding: 1rem;
  --pdf-page-background: white;
  --pdf-page-gap: 1rem;
  --pdf-page-shadow: 8px 8px 24px -20px rgba(66, 68, 90, 1);
  --pdf-page-graphic-opacity: 0.4;
  --pdf-page-text-opacity: 1;
}

.hiddenCanvasElement {
  display: none;
}
</style>

<style lang="postcss" scoped>
.pdf {
  height: 100%;
  width: max-content;
  overflow: auto;
  background: var(--pdf-background);
  padding: var(--pdf-content-padding);
  display: flex;
  flex-direction: column;
  gap: var(--pdf-page-gap);
}

.page {
  box-shadow: var(--pdf-page-shadow);
  display: grid;
  grid-template-areas: "content";
  position: relative;
  background: var(--pdf-page-background);
  flex-shrink: 0;

  & > * {
    grid-area: content;
  }

  > img {
    pointer-events: none;
    opacity: var(--pdf-page-graphic-opacity);
  }

  > .text-layer {
    color: transparent;
    opacity: var(--pdf-page-text-opacity);

    &.visible-text {
      color: var(--pdf-text-color);
    }

    :global(> span[role="presentation"]),
    :global(> span[role="grouping"]),
    :global(> br[role="presentation"]) {
      position: absolute;
      white-space: pre;
      transform-origin: 0 0;
      line-height: 1;
    }
  }
}
</style>
