<template>
  <div class="connectors">
    <DiffConnector v-for="(connector, index) in connectors" :key="index"
      :width="128"
      :fill="connector.fill"
      :stroke="connector.stroke"
      :left="connector.left"
      :right="connector.right"
    />
  </div>
</template>

<script lang="ts">
import type { Range } from '../lib/pdf'

export interface Connector {
  left: Range
  right: Range
  fill: string
  stroke: string
}
</script>

<script lang="ts" setup>
import type { PropType } from 'vue'
import DiffConnector from './DiffConnector.ce.vue'

defineProps({
  connectors: { type: Array as PropType<Connector[]>, default: () => [] },
})
</script>

<style lang="postcss">
.connectors {
  position: relative;
  width: 64px;
  flex-shrink: 0;
  background-color: rgb(237, 237, 237);
}
</style>
