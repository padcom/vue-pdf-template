<template>
  <div v-if="pages.length > 0" class="pdf" :style>
    <div ref="content" class="pages">
      <div v-for="page in pages" :key="page.index" class="page" :style="page.style">
        <img v-if="renderBitmap" :class="bitmapClasses" :src="page.image">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="renderText" class="text-layer" :class="textClasses" v-html="page.content" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onBeforeMount, onMounted, onBeforeUnmount } from 'vue'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import {
  renderPdf,
  collectTextBlocks,
  convertTextBlocksToLines,
  splitSpanIntoWords,
  type Page,
  getText,
} from '@/lib/pdf'

const props = defineProps({
  src: { type: String, default: '' },
  workerSrc: { type: String, default: './pdf.worker.min.mjs' },
  scale: { type: Number, default: 1 },
  renderText: { type: Boolean, default: true },
  visibleText: { type: Boolean, default: false },
  renderBitmap: { type: Boolean, default: true },
  visibleBitmap: { type: Boolean, default: true },
})

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

onBeforeMount(() => {
  GlobalWorkerOptions.workerSrc = props.workerSrc
})

const sleep = (ms: number) => new Promise(resolve => { setTimeout(resolve, ms) })

onMounted(async () => {
  pages.value = []

  if (props.src) {
    pages.value = await renderPdf(props.src, props.scale, {
      renderBitmap: props.renderBitmap,
      renderText: props.renderText,
    })
    await sleep(1000)

    if (content.value) {
      const spans = content.value.querySelectorAll('span[role="presentation"]') as unknown as HTMLSpanElement[]
      spans.forEach(span => { splitSpanIntoWords(span) })
    }
    const blocks = collectTextBlocks(content.value)
    console.log(blocks)

    convertTextBlocksToLines(blocks)
    console.log(getText(blocks))
  }
})

onBeforeUnmount(() => {
  pages.value = []
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
}
</style>

<style lang="postcss" scoped>
.pdf {
  height: 100%;
  width: max-content;
  overflow: auto;
  background: var(--pdf-background);
  padding: var(--pdf-content-padding);
}

.pages {
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

  & > * {
    grid-area: content;
  }

  > img {
    pointer-events: none;
    opacity: 1;
  }

  > .text-layer {
    color: transparent;

    &.visible-text {
      color: var(--pdf-text-color);
    }

    :global(> span[role="presentation"]),
    :global(> span[role="grouping"]),
    :global(> br[role="presentation"]) {
      position: absolute;
      white-space: pre;
      transform-origin: 0 0;
    }
  }
}
</style>
