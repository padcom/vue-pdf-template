<template>
  <div v-if="pages.length > 0" class="pdf" :style>
    <div class="pages">
      <div v-for="page in pages" :key="page.index" class="page" :style="page.style">
        <img :src="page.image">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="text-layer" v-html="page.content" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onBeforeMount, onMounted, onBeforeUnmount, computed } from 'vue'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import { renderPdf, type Page } from '@/lib/pdf'

const props = defineProps({
  src: { type: String, default: '' },
  scale: { type: Number, default: 1 },
  workerSrc: { type: String, default: './pdf.worker.min.mjs' },
})

const pages = ref<Page[]>([])

const style = computed(() => ({
  '--user-unit': '1',
  '--scale-factor': props.scale.toString(),
  '--total-scale-factor': 'calc(var(--scale-factor) * var(--user-unit))',
  '--scale-round-x': '1px',
  '--scale-round-y': '1px',
}))

onBeforeMount(() => {
  GlobalWorkerOptions.workerSrc = props.workerSrc
})

onMounted(async () => {
  pages.value = []

  if (props.src) {
    pages.value = await renderPdf(props.src, props.scale)
  }
})

onBeforeUnmount(() => {
  pages.value = []
})
</script>

<style lang="postcss" scoped>
.pdf {
  height: 100%;
  width: max-content;
  overflow: auto;
  background-color: lightgray;
  padding: 16px;
}

.pages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page {
  box-shadow: 8px 8px 24px -20px rgba(66, 68, 90, 1);
  display: grid;
  grid-template-areas: "content";
  position: relative;
  background-color: white;

  & > * {
    grid-area: content;
  }

  > img {
    pointer-events: none;
    opacity: 1;
  }

  > .text-layer {
    :global(> span[role="presentation"]),
    :global(> br[role="presentation"]) {
      position: absolute;
      white-space: pre;
      color: black;
      transform-origin: 0 0;
    }
  }
}
</style>
