<template>
  <svg xmlns="http://www.w3.org/2000/svg" :width height="100%">
    <path :d="bf" stroke="transparent" :fill />
    <path :d="bc1" :stroke stroke-width="0.5" fill="transparent" />
    <path :d="bc2" :stroke stroke-width="0.5" fill="transparent" />
  </svg>
</template>

<script lang="ts" setup>
import { computed, toValue, type PropType, type MaybeRefOrGetter } from 'vue'
import type { Range } from '../lib/pdf'

interface Point {
  x: number
  y: number
}

const props = defineProps({
  fill: { type: String, default: 'red' },
  stroke: { type: String, default: 'red' },
  width: { type: Number, default: 50 },
  left: { type: Object as PropType<Range>, required: true },
  right: { type: Object as PropType<Range>, required: true },
})

function move(p: Point) {
  return `M ${p.x} ${p.y}`
}

function curve(p1: Point, p2: Point, distance: number) {
  return `C ${p1.x + distance} ${p1.y}, ${p2.x - distance} ${p2.y}, ${p2.x} ${p2.y}`
}

function vertical(y: number) {
  return `V ${y}`
}

function bezierFill(
  left: MaybeRefOrGetter<Range>,
  right: MaybeRefOrGetter<Range>,
  width: MaybeRefOrGetter<number> = () => props.width,
) {
  const p1 = computed(() => ({ x: 0, y: toValue(left).y1 + 1 }))
  const p2 = computed(() => ({ x: toValue(width) / 2, y: toValue(right).y1 + 1 }))
  const p3 = computed(() => ({ x: 0, y: toValue(left).y2 - 1 }))
  const p4 = computed(() => ({ x: toValue(width) / 2, y: toValue(right).y2 - 1 }))

  return computed(() => [
    move(p1.value),
    curve(p1.value, p2.value, toValue(width) / 4),
    vertical(p4.value.y),
    curve(p4.value, p3.value, -toValue(width) / 4),
  ].join(' '))
}

function bezierCurve(
  left: MaybeRefOrGetter<number>,
  right: MaybeRefOrGetter<number>,
  width: MaybeRefOrGetter<number> = () => props.width,
) {
  const p1 = computed(() => ({ x: 0, y: toValue(left) }))
  const p2 = computed(() => ({ x: toValue(width) / 2, y: toValue(right) }))

  return computed(() => [
    move(p1.value),
    curve(p1.value, p2.value, toValue(width) / 4),
  ].join(' '))
}

const bf = bezierFill(() => props.left, () => props.right)
const bc1 = bezierCurve(() => props.left.y1, () => props.right.y1)
const bc2 = bezierCurve(() => props.left.y2, () => props.right.y2)
</script>

<style lang="postcss">
svg {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
</style>
