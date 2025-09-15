<template>
  <div class="diff-block" :style :data-index="index" />
</template>

<script lang="ts">
export interface DiffBlockData {
  top: number
  height: number
  fill: string
  stroke: string
  stroke2: string
}
</script>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
  index: { type: Number, required: true },
  top: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  fill: { type: String, default: 'rgb(255, 245, 192)' },
  stroke: { type: String, default: 'rgb(0, 0, 255)' },
})

const style = computed(() => ({
  top: `${props.top}px`,
  height: `${props.height}px`,
  backgroundColor: props.fill,
  borderColor: props.stroke,
}))
</script>

<style lang="postcss">
.diff-block {
  display: block;
  position: absolute;
  left: 0;
  right: 0;
  margin-block: 2px;
  border-top: solid 1px;
  border-bottom: solid 1px;
  cursor: pointer;
}
</style>
